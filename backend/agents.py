from fastapi import FastAPI, HTTPException, Header, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response
from risk_detector import RiskDetectionModel
from supabase_ops import SupabaseOps
import pandas as pd
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel
import os
import json
import re
import urllib.request
import urllib.error
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
import subprocess
import tempfile
import shutil
import sys
import zipfile

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="AegisAPI Backend", description="AI Zombie API Detector with Supabase")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize risk detector model
risk_model = RiskDetectionModel()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")


def normalize_logs_dataframe(logs: List[Dict[str, Any]]) -> pd.DataFrame:
    """Normalize arbitrary API log payloads into a consistent in-memory DataFrame."""
    df = pd.DataFrame(logs)
    if df.empty:
        raise ValueError("No log rows found")

    # Case-insensitive alias mapping for schema-agnostic ingestion.
    aliases = {
        "api": ["api", "path", "endpoint", "url", "uri", "route", "resource"],
        "method": ["method", "http_method", "verb"],
        "response_code": ["response_code", "status_code", "status", "code", "http_status"],
        "response_time": ["response_time", "latency", "duration", "time_ms", "response_ms"],
        "payload_size": ["payload_size", "bytes", "size", "length", "content_length"],
        "timestamp": ["timestamp", "time", "date", "created_at", "event_time"],
    }

    lower_to_actual = {str(col).strip().lower(): col for col in df.columns}
    rename_map = {}
    for canonical, keys in aliases.items():
        for key in keys:
            if key in lower_to_actual:
                rename_map[lower_to_actual[key]] = canonical
                break
    if rename_map:
        df = df.rename(columns=rename_map)

    if "api" not in df.columns:
        raise ValueError("Missing endpoint field. Include one of: api, endpoint, path, url, uri, route")

    df["api"] = df["api"].astype(str).str.strip()
    df = df[df["api"] != ""]
    if df.empty:
        raise ValueError("No valid endpoint values found in uploaded logs")

    if "method" not in df.columns:
        df["method"] = "GET"
    df["method"] = df["method"].fillna("GET").astype(str).str.upper()

    if "response_code" not in df.columns:
        df["response_code"] = 200
    df["response_code"] = pd.to_numeric(df["response_code"], errors="coerce").fillna(200).astype(int)

    if "response_time" not in df.columns:
        df["response_time"] = 0
    df["response_time"] = pd.to_numeric(df["response_time"], errors="coerce").fillna(0).astype(float)

    if "payload_size" not in df.columns:
        df["payload_size"] = 0
    df["payload_size"] = pd.to_numeric(df["payload_size"], errors="coerce").fillna(0).astype(float)

    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
        df["timestamp"] = df["timestamp"].fillna(pd.Timestamp.now(tz="UTC"))
    else:
        df["timestamp"] = pd.Timestamp.now(tz="UTC")

    return df[["api", "method", "response_code", "response_time", "payload_size", "timestamp"]]


def get_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Extract user_id from Authorization header (Supabase Bearer token)"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.replace("Bearer ", "", 1).strip()
    try:
        return SupabaseOps.get_user_id_from_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def resolve_user_id_for_read(
    authorization: Optional[str] = Header(None),
    agent_key: Optional[str] = Query(None),
    secret_key: Optional[str] = Query(None),
) -> str:
    """Resolve user from Bearer token first, or fallback to agent_key for redirected dashboard read access."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1).strip()
        try:
            return SupabaseOps.get_user_id_from_token(token)
        except Exception:
            pass

    key = (agent_key or secret_key or "").strip()
    if key:
        agent = SupabaseOps.get_agent_by_secret(key)
        if agent and agent.get("user_id"):
            return str(agent.get("user_id"))

    raise HTTPException(status_code=401, detail="Missing or invalid authorization")


class MitigationRequest(BaseModel):
    endpoint: str
    method: Optional[str] = None


class AgentCreateRequest(BaseModel):
    dashboard_url: Optional[str] = None


class AgentIngestRequest(BaseModel):
    secret_key: str
    logs: List[Dict[str, Any]]


class ScheduledAgentRequest(BaseModel):
    secret_key: str
    interval_seconds: int
    run_count: int = 1


def _is_loopback_host(hostname: str) -> bool:
    host = (hostname or "").strip().lower()
    return host in {"localhost", "127.0.0.1", "::1"} or host.startswith("127.")


def _get_dashboard_origin(request: Request) -> str:
    explicit = (
        os.getenv("AGENT_DASHBOARD_BASE_URL")
        or os.getenv("AGENT_PUBLIC_BASE_URL")
        or ""
    ).strip().rstrip("/")
    if explicit:
        return explicit

    forwarded_proto = (request.headers.get("x-forwarded-proto") or "").strip()
    forwarded_host = (request.headers.get("x-forwarded-host") or "").strip()
    if forwarded_proto and forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}"

    return str(request.base_url).rstrip("/")


def _normalize_dashboard_url(user_id: str, dashboard_url: str, request: Request) -> str:
    candidate = (dashboard_url or "").strip()
    if candidate:
        parsed = urlparse(candidate)
        if parsed.scheme and parsed.netloc and not _is_loopback_host(parsed.hostname or ""):
            return candidate

    public_origin = _get_dashboard_origin(request)
    return f"{public_origin}/dashboard/user/{user_id}"


def _build_scheduled_logs_source(interval_seconds: int, run_count: int, server_url: str = "http://localhost:8000") -> str:
    # Embed the correct server URL into executable source.
    ingest_url = f"{server_url}/api/agent/ingest?redirect=true"
    return f'''import json
import os
import sys
import time
import requests
import webbrowser
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
from typing import Any, Dict, List

DEFAULT_AGENT_SERVER_URL = "{ingest_url}"
INTERVAL_SECONDS = {interval_seconds}
MAX_RUNS = {run_count}

BASE_DIR = (
    os.path.dirname(sys.executable)
    if getattr(sys, "frozen", False)
    else os.path.dirname(os.path.abspath(__file__))
)


def load_config() -> Dict[str, Any]:
    for name in ("config.json", "data.json"):
        config_path = os.path.join(BASE_DIR, name)
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError("config.json or data.json not found")


def _append_runtime_log(message: str) -> None:
    log_path = os.path.join(BASE_DIR, "agent-runtime.log")
    try:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(message + "\\n")
    except Exception:
        pass


def load_raw_logs(path: str) -> List[Dict[str, Any]]:
    full_path = path if os.path.isabs(path) else os.path.join(BASE_DIR, path)
    if not os.path.exists(full_path):
        raise FileNotFoundError(f"{{path}} not found")
    with open(full_path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_logs(logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized = []
    aliases = {{
        "api": ["api", "path", "endpoint", "url", "uri", "route"],
        "method": ["method", "http_method", "verb"],
        "response_code": ["response_code", "status_code", "status"],
        "response_time": ["response_time", "latency", "duration"],
        "payload_size": ["payload_size", "bytes", "size"],
        "timestamp": ["timestamp", "time", "date"],
    }}

    for log in logs:
        row = {{}}
        for canonical, keys in aliases.items():
            value = None
            for key in keys:
                if key in log:
                    value = log[key]
                    break
            row[canonical] = value

        row["api"] = str(row.get("api") or "").strip()
        row["method"] = str(row.get("method") or "GET").upper()

        try:
            row["response_code"] = int(row.get("response_code") or 200)
        except Exception:
            row["response_code"] = 200

        try:
            row["response_time"] = float(row.get("response_time") or 0)
        except Exception:
            row["response_time"] = 0.0

        try:
            row["payload_size"] = float(row.get("payload_size") or 0)
        except Exception:
            row["payload_size"] = 0.0

        row["timestamp"] = row.get("timestamp") or ""
        if row["api"]:
            normalized.append(row)

    return normalized


def send_to_agent(secret_key: str, normalized_logs: List[Dict[str, Any]], agent_server_url: str) -> str:
    payload = {{
        "secret_key": secret_key,
        "logs": normalized_logs,
    }}
    response = requests.post(agent_server_url, json=payload, timeout=120, allow_redirects=False)
    if response.status_code in (301, 302, 303, 307, 308):
        return str(response.headers.get("location") or "").strip()
    if response.status_code >= 400:
        raise RuntimeError(f"Server error {{response.status_code}}: {{response.text}}")
    return ""


def run_scan() -> None:
    config = load_config()
    secret_key = config.get("secret_key") or config.get("secret-key") or config.get("api_key")
    log_path = config.get("log_path") or config.get("log_file_path")
    agent_server_url = (
        config.get("agent_server_url")
        or config.get("ingest_url")
        or DEFAULT_AGENT_SERVER_URL
    )
    open_dashboard_on_ingest = bool(config.get("open_dashboard_on_ingest", True))
    if not secret_key or not log_path:
        raise ValueError("config missing secret_key and/or log_path")

    raw_logs = load_raw_logs(log_path)
    normalized = normalize_logs(raw_logs)
    if not normalized:
        _append_runtime_log("No valid normalized logs found. Nothing was sent.")
        return
    redirect_url = send_to_agent(secret_key, normalized, agent_server_url)
    if redirect_url and open_dashboard_on_ingest:
        try:
            parsed_redirect = urlparse(redirect_url)
            params = dict(parse_qsl(parsed_redirect.query, keep_blank_values=True))
            if "agent_key" not in params:
                params["agent_key"] = secret_key
            final_redirect_url = urlunparse(
                (
                    parsed_redirect.scheme,
                    parsed_redirect.netloc,
                    parsed_redirect.path,
                    parsed_redirect.params,
                    urlencode(params),
                    parsed_redirect.fragment,
                )
            )
            webbrowser.open(final_redirect_url)
            _append_runtime_log(f"Opened dashboard URL: {{final_redirect_url}}")
        except Exception as browser_error:
            _append_runtime_log(f"Redirect URL available but browser open failed: {{browser_error}}")
    _append_runtime_log(f"Sent {{len(normalized)}} logs to {{agent_server_url}}")


if __name__ == "__main__":
    runs = 0
    while MAX_RUNS <= 0 or runs < MAX_RUNS:
        try:
            run_scan()
        except Exception as e:
            _append_runtime_log(f"Scan failed: {{e}}")
        runs += 1
        if MAX_RUNS > 0 and runs >= MAX_RUNS:
            break
        time.sleep(INTERVAL_SECONDS)
'''


def _detect_traffic_pattern(row: Dict[str, Any]) -> str:
    daily_calls = float(row.get("daily_calls") or 0)
    error_rate = float(row.get("error_rate") or 0)
    inactive_days = int(row.get("days_inactive") or 0)

    if inactive_days > 30:
        return "inactive endpoint"
    if daily_calls > 500:
        return "sudden spike"
    if error_rate > 0.3 and daily_calls > 50:
        return "error-heavy burst"
    return "steady traffic"


def _traffic_risk_score(pattern: str) -> float:
    traffic = str(pattern or "steady traffic").lower()
    if traffic == "sudden spike":
        return 0.9
    if traffic == "error-heavy burst":
        return 0.8
    if traffic == "inactive endpoint":
        return 0.7
    return 0.15


def _build_llm_payload(row: Dict[str, Any]) -> Dict[str, Any]:
    risk_level = str(row.get("risk_level") or "LOW").upper()
    anomaly = -1 if risk_level in ["HIGH", "CRITICAL"] else 1
    traffic_pattern = row.get("traffic_pattern") or _detect_traffic_pattern(row)
    return {
        "endpoint": row.get("endpoint"),
        "error_rate": float(row.get("error_rate") or 0),
        "frequency": float(row.get("daily_calls") or row.get("call_count") or 0),
        "anomaly": anomaly,
        "risk_level": risk_level,
        "auth_type": "Unknown",
        "traffic_pattern": traffic_pattern,
    }


def _extract_json(content: str) -> Dict[str, Any]:
    text = (content or "").strip()
    if not text:
        return {}

    try:
        return json.loads(text)
    except Exception:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except Exception:
            return {}
    return {}


def _extract_labeled_section(text: str, label: str) -> str:
    escaped = re.escape(label)
    pattern = (
        rf"(?:^|\n)\s*(?:\d+[.)]\s*)?(?:\*\*|__)?{escaped}(?:\*\*|__)?\s*:?\s*"
        rf"(.*?)(?=\n\s*(?:\d+[.)]\s*)?(?:\*\*|__)?[A-Za-z][A-Za-z\s]*(?:\*\*|__)?\s*:|$)"
    )
    match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    return match.group(1).strip()


def _extract_sectioned_assessment(content: str) -> Dict[str, Any]:
    text = (content or "").strip()
    if not text:
        return {}

    issue_summary = _extract_labeled_section(text, "Issue Summary")
    likely_cause = _extract_labeled_section(text, "Likely Cause")
    security_risk = _extract_labeled_section(text, "Security Risk")
    if not security_risk:
        security_risk = _extract_labeled_section(text, "Security Risk Interpretation")
    mitigation_block = _extract_labeled_section(text, "Mitigation Steps")
    if not mitigation_block:
        mitigation_block = _extract_labeled_section(text, "Actionable Mitigation Steps")
    impact = _extract_labeled_section(text, "Impact")

    bullets = []
    if mitigation_block:
        bullet_matches = re.findall(r"^\s*(?:[-*\u2022]|\d+[.)])\s+(.+)$", mitigation_block, flags=re.MULTILINE)
        bullets = [b.strip() for b in bullet_matches if b.strip()]
        if not bullets:
            bullets = [line.strip() for line in mitigation_block.splitlines() if line.strip()]
    if not bullets:
        bullet_matches = re.findall(r"^\s*(?:[-*\u2022]|\d+[.)])\s+(.+)$", text, flags=re.MULTILINE)
        bullets = [b.strip() for b in bullet_matches if b.strip()]

    if not issue_summary and not likely_cause and not security_risk and not bullets and not impact:
        return {}

    mitigations = [
        {
            "title": step,
            "priority": "high",
            "why": "Derived from model mitigation guidance.",
            "steps": [step],
            "owner": "security",
        }
        for step in bullets
    ]

    why_flagged = []
    if likely_cause:
        why_flagged.append(likely_cause)
    if security_risk:
        why_flagged.append(security_risk)

    summary_parts = [p for p in [issue_summary, likely_cause] if p]
    summary = " ".join(summary_parts).strip() or "Assessment generated from endpoint context."

    monitoring = [impact] if impact else []

    return {
        "summary": summary,
        "why_flagged": why_flagged,
        "mitigations": mitigations,
        "mitigation_steps": bullets,
        "monitoring": monitoring,
        "impact": impact,
        "issue_summary": issue_summary,
        "likely_cause": likely_cause,
        "security_risk": security_risk,
    }


def _fallback_mitigation(payload: Dict[str, Any]) -> Dict[str, Any]:
    error_rate = float(payload.get("error_rate") or 0)
    traffic = str(payload.get("traffic_pattern") or "steady traffic")
    endpoint = payload.get("endpoint")

    mitigations = [
        {
            "title": "Apply endpoint authentication",
            "priority": "high",
            "why": "Endpoint appears exposed without explicit auth context.",
            "steps": [
                "Enforce JWT or API key auth on the route.",
                "Block unauthenticated requests at gateway.",
                "Add role-based access control for admin or internal routes.",
            ],
            "owner": "security",
        },
        {
            "title": "Add rate limiting and spike protection",
            "priority": "high" if traffic == "sudden spike" else "medium",
            "why": "Traffic behavior indicates a potential abuse pattern.",
            "steps": [
                "Set per-IP and per-token rate limits at API gateway.",
                "Enable burst controls and temporary blocking rules.",
                "Monitor top callers and origin distribution.",
            ],
            "owner": "platform",
        },
    ]

    if error_rate >= 0.3:
        mitigations.append(
            {
                "title": "Reduce failure rate",
                "priority": "high",
                "why": f"Error rate is elevated at {error_rate*100:.1f}%.",
                "steps": [
                    "Inspect recent 4xx/5xx trends and top failing paths.",
                    "Add retries and circuit breakers for flaky dependencies.",
                    "Introduce alerting on error budget burn rate.",
                ],
                "owner": "backend",
            }
        )

    flat_steps = [
        step
        for item in mitigations
        for step in item.get("steps", [])
        if isinstance(step, str) and step.strip()
    ]

    return {
        "llm_source": "fallback",
        "summary": f"{endpoint} requires tighter access controls and runtime protections.",
        "why_flagged": [
            "High Error Rate" if error_rate >= 0.05 else "Anomalous behavior",
            "Slow Response Time" if float(payload.get("frequency") or 0) > 0 else "Traffic anomaly",
        ],
        "mitigations": mitigations,
        "mitigation_steps": flat_steps,
        "monitoring": [
            "Track 4xx/5xx by endpoint and caller identity.",
            "Alert on sudden request spikes and latency regression.",
        ],
    }


def _annotate_traffic_analysis(df: pd.DataFrame) -> pd.DataFrame:
    """Derive traffic analysis labels before persisting analysis rows."""
    if df.empty:
        return df

    traffic_patterns = []
    traffic_risks = []
    for _, row in df.iterrows():
        traffic_pattern = _detect_traffic_pattern(row.to_dict())
        traffic_patterns.append(traffic_pattern)
        traffic_risks.append(_traffic_risk_score(traffic_pattern))

    result_df = df.copy()
    result_df["traffic_pattern"] = traffic_patterns
    result_df["traffic_risk_score"] = traffic_risks

    if "risk_score" in result_df.columns:
        result_df["risk_score"] = (
            pd.to_numeric(result_df["risk_score"], errors="coerce").fillna(0).astype(float)
            .add(result_df["traffic_risk_score"] * 15)
            .clip(upper=100)
        )

    return result_df


def _process_logs_for_user(user_id: str, logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Shared ingestion pipeline used by dashboard upload and agent ingestion."""
    if not logs:
        raise ValueError("No logs provided")

    session_id = SupabaseOps.create_upload_session(user_id, len(logs))
    processed_count = 0
    analysis_df = pd.DataFrame()
    summary = {}

    try:
        df = normalize_logs_dataframe(logs)
        processed_count = len(df)

        analysis_df = risk_model.detect_risks(df, user_id)
        analysis_df = _annotate_traffic_analysis(analysis_df)

        if len(analysis_df) > 0:
            analysis_records = analysis_df.to_dict(orient="records")
            SupabaseOps.upsert_api_analysis(user_id, analysis_records)
            SupabaseOps.clear_unresolved_alerts(user_id)
            alert_count = SupabaseOps.create_risk_alerts(user_id, analysis_df)

            nodes, edges = risk_model.get_graph_nodes_edges(analysis_df)
            SupabaseOps.save_graph_data(user_id, nodes, edges)

            summary = {
                "total_apis": len(analysis_df),
                "critical_count": len(analysis_df[analysis_df["risk_level"] == "CRITICAL"]),
                "high_count": len(analysis_df[analysis_df["risk_level"] == "HIGH"]),
                "zombie_count": len(analysis_df[analysis_df["is_zombie"]]),
                "shadow_count": len(analysis_df[analysis_df["is_shadow_api"]]),
                "sudden_spike_count": len(analysis_df[analysis_df["traffic_pattern"] == "sudden spike"]),
                "error_heavy_count": len(analysis_df[analysis_df["traffic_pattern"] == "error-heavy burst"]),
                "alerts_created": alert_count,
            }
        else:
            SupabaseOps.clear_unresolved_alerts(user_id)

        SupabaseOps.update_upload_session(session_id, "COMPLETED", processed_count, summary)

        return {
            "session_id": session_id,
            "logs_ingested": processed_count,
            "apis_analyzed": len(analysis_df),
            "summary": summary,
        }
    except Exception:
        SupabaseOps.update_upload_session(session_id, "FAILED", processed_count, None, "Upload/analysis failed")
        raise


def generate_groq_mitigation(context_payload: Dict[str, Any]) -> Dict[str, Any]:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is missing")

    system_prompt = (
        "You are a senior cybersecurity expert specializing in API security, "
        "threat detection, and incident response. Follow the requested format exactly."
    )

    prompt_template = """You are a senior cybersecurity expert specializing in API security, threat detection, and incident response.

Analyze the following API security context and provide a detailed, context-aware assessment.

Your response must include:

1. *Issue Summary*

   * Clearly explain what is happening with this API
   * Mention abnormal behavior and why it is concerning

2. *Likely Cause*

   * Identify the most probable reason for this behavior
   * Consider factors like traffic patterns, lack of authentication, misuse, or system failure

3. *Security Risk Interpretation*

   * Explain what kind of threat this represents (e.g., brute-force attack, exposed endpoint, zombie API risk, abuse, misconfiguration)

4. *Actionable Mitigation Steps*

   * Provide specific, practical steps (not generic advice)
   * Focus on what a developer or security engineer should do immediately
   * Include both short-term fixes and long-term improvements

5. *Impact (Optional but Preferred)*

   * Briefly describe what could happen if this issue is not resolved

---

### IMPORTANT INSTRUCTIONS:

* Do NOT give generic suggestions like "check logs" or "improve security"
* Base your reasoning strictly on the provided context
* Be concise but insightful
* Do NOT assume missing data - work only with what is given
* Do NOT include any sensitive data or speculation beyond the context

---

### API SECURITY CONTEXT:

{JSON_DATA}

---

### OUTPUT FORMAT:

Issue Summary:
...

Likely Cause:
...

Security Risk:
...

Mitigation Steps:

* ...
* ...
* ...

Impact:
..."""

    user_prompt = prompt_template.replace(
        "{JSON_DATA}", json.dumps(context_payload, ensure_ascii=True)
    )

    body = {
        "model": GROQ_MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Accept": "application/json",
            "User-Agent": "AegisAPI/1.0 (+https://api.aegis-security.com)",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw)
            content = (
                parsed.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )
            result = _extract_json(content)
            if result:
                result["llm_source"] = "groq-json"
                return result
            sectioned = _extract_sectioned_assessment(content)
            if sectioned:
                sectioned["llm_source"] = "groq-sectioned"
                return sectioned
            raise RuntimeError("Groq response parse failed: missing expected JSON/sectioned format")
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode("utf-8", errors="replace")
        except Exception:
            error_body = "<unable to read error body>"

        print(
            "Groq HTTP error:",
            {
                "code": getattr(e, "code", None),
                "reason": getattr(e, "reason", None),
                "body": error_body,
            },
        )

        raise RuntimeError(
            f"Groq HTTP error {getattr(e, 'code', 'unknown')} {getattr(e, 'reason', '')}: {error_body[:300]}"
        )
    except (urllib.error.URLError, TimeoutError) as e:
        print("Groq request error:", str(e))
        raise RuntimeError(f"Groq request failed: {str(e)}")


@app.post("/api/upload")
async def upload_logs(logs: List[Dict[str, Any]], user_id: str = Depends(get_user_id)):
    """
    Upload API logs and run risk detection analysis.
    
    Flow:
    1. Validate and normalize log format
    2. Normalize logs in-memory (no raw persistence)
    3. Run ML-based risk detection
    4. Store analysis results in api_analysis table
    5. Create alerts for high-risk APIs
    6. Return results
    """
    try:
        result = _process_logs_for_user(user_id, logs)
        return {
            "message": "Logs uploaded and analyzed successfully",
            **result,
        }
    
    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/agents")
async def create_agent_key(
    payload: AgentCreateRequest,
    request: Request,
    user_id: str = Depends(get_user_id),
):
    """Generate and persist an agent secret key for the authenticated user."""
    try:
        dashboard_url = _normalize_dashboard_url(user_id, payload.dashboard_url or "", request)

        agent = SupabaseOps.create_agent(user_id=user_id, dashboard_url=dashboard_url)
        if not agent:
            raise HTTPException(status_code=500, detail="Failed to create agent key")

        return {
            "id": agent.get("id"),
            "secret_key": agent.get("secret_key"),
            "dashboard_url": agent.get("dashboard_url"),
            "created_at": agent.get("created_at"),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create agent key error: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to create agent key")


@app.get("/api/agents")
async def list_agent_keys(user_id: str = Depends(get_user_id)):
    """List all agent keys for the authenticated user."""
    try:
        rows = SupabaseOps.list_user_agents(user_id)
        return {"agents": rows}
    except Exception as e:
        print(f"List agent keys error: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to list agent keys")


@app.post("/api/agent/ingest")
@app.post("/api/agents/ingest")
async def ingest_agent_logs(payload: AgentIngestRequest, redirect: bool = Query(False)):
    """Ingest normalized logs from logs.exe using a secret key generated from the agents page."""
    try:
        secret_key = (payload.secret_key or "").strip()
        if not secret_key:
            raise HTTPException(status_code=401, detail="Missing secret key")

        agent = SupabaseOps.get_agent_by_secret(secret_key)
        if not agent:
            raise HTTPException(status_code=401, detail="Invalid secret key")

        user_id = (agent.get("user_id") or "").strip()
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid agent mapping")

        dashboard_url = (agent.get("dashboard_url") or "").strip()
        result = _process_logs_for_user(user_id, payload.logs)

        if redirect and dashboard_url:
            parsed = urlparse(dashboard_url)
            params = dict(parse_qsl(parsed.query, keep_blank_values=True))
            params["agent_key"] = secret_key
            redirect_url = urlunparse(
                (
                    parsed.scheme,
                    parsed.netloc,
                    parsed.path,
                    parsed.params,
                    urlencode(params),
                    parsed.fragment,
                )
            )
            return RedirectResponse(url=redirect_url, status_code=307)

        return {
            "message": "Agent logs ingested successfully",
            "dashboard_url": dashboard_url,
            "secret_key": secret_key,
            "ingest_status": "processed",
            **result,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Agent ingest error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/agents/scheduled/generate")
async def generate_scheduled_agent(
    payload: ScheduledAgentRequest,
    request: Request,
    user_id: str = Depends(get_user_id),
):
    """Generate scheduled logs.exe and return zip with logs.exe + config.json."""
    allowed_intervals = {21600, 43200, 86400, 604800}
    interval_seconds = int(payload.interval_seconds)
    run_count = int(payload.run_count)
    if interval_seconds not in allowed_intervals:
        raise HTTPException(status_code=400, detail="Unsupported interval")
    if run_count == 0 or run_count < -1:
        raise HTTPException(status_code=400, detail="run_count must be -1 or a positive integer")

    secret_key = (payload.secret_key or "").strip()
    if not secret_key:
        raise HTTPException(status_code=400, detail="secret_key is required")

    agent = SupabaseOps.get_agent_by_secret(secret_key)
    if not agent:
        raise HTTPException(status_code=401, detail="Invalid secret key")
    if str(agent.get("user_id") or "") != user_id:
        raise HTTPException(status_code=403, detail="Secret key does not belong to current user")

    temp_root = Path(tempfile.mkdtemp(prefix="aegis_scheduled_agent_"))
    try:
        script_path = temp_root / "logs.py"
        dist_dir = temp_root / "dist"
        build_dir = temp_root / "build"
        spec_dir = temp_root / "spec"
        dist_dir.mkdir(parents=True, exist_ok=True)
        build_dir.mkdir(parents=True, exist_ok=True)
        spec_dir.mkdir(parents=True, exist_ok=True)

        # Auto-repair localhost dashboard_url and persist corrected URL for future builds.
        dashboard_url = _normalize_dashboard_url(user_id, agent.get("dashboard_url") or "", request)
        if dashboard_url != (agent.get("dashboard_url") or "").strip() and agent.get("id"):
            SupabaseOps.update_agent_dashboard_url(str(agent.get("id")), dashboard_url)

        parsed = urlparse(dashboard_url)
        dashboard_origin = f"{parsed.scheme}://{parsed.netloc}"
        ingest_origin = (os.getenv("AGENT_PUBLIC_BASE_URL") or "").strip().rstrip("/")
        if not ingest_origin:
            ingest_origin = dashboard_origin

        script_path.write_text(_build_scheduled_logs_source(interval_seconds, run_count, ingest_origin), encoding="utf-8")

        build_cmd = [
            sys.executable,
            "-m",
            "PyInstaller",
            "--onefile",
            "--name",
            "logs",
            str(script_path),
            "--distpath",
            str(dist_dir),
            "--workpath",
            str(build_dir),
            "--specpath",
            str(spec_dir),
        ]

        process = subprocess.run(
            build_cmd,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )
        if process.returncode != 0:
            snippet = (process.stderr or process.stdout or "PyInstaller failed")[-1200:]
            raise HTTPException(status_code=500, detail=f"Scheduled agent build failed: {snippet}")

        exe_path = dist_dir / "logs.exe"
        if not exe_path.exists():
            raise HTTPException(status_code=500, detail="Scheduled logs.exe was not generated")

        config_payload = {
            "secret_key": secret_key,
            "api_key": secret_key,
            "log_path": "/var/log/nginx/access.log",
            "agent_server_url": f"{ingest_origin}/api/agent/ingest?redirect=true",
            "open_dashboard_on_ingest": True,
            "scan_interval_seconds": interval_seconds,
            "max_scan_runs": run_count,
        }
        config_path = temp_root / "config.json"
        config_path.write_text(json.dumps(config_payload, indent=2), encoding="utf-8")

        zip_path = temp_root / "scheduled-agent.zip"
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.write(exe_path, arcname="logs.exe")
            zf.write(config_path, arcname="config.json")

        zip_bytes = zip_path.read_bytes()
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=scheduled-agent.zip"},
        )
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)

@app.get("/api/analysis")
async def get_analysis(user_id: str = Depends(resolve_user_id_for_read)):
    """
    Fetch analysis results for all APIs for this user from Supabase.
    """
    try:
        analysis_data = SupabaseOps.get_user_analysis(user_id)
        
        if not analysis_data:
            return {
                "metrics": {
                    "total_apis": 0,
                    "zombie_apis": 0,
                    "critical_apis": 0,
                    "suspicious_apis": 0,
                    "total_logs": 0,
                },
                "api_data": []
            }
        
        # Calculate metrics
        df = pd.DataFrame(analysis_data)
        metrics = {
            "total_apis": len(df),
            "zombie_apis": int(df["is_zombie"].sum()),
            "critical_apis": int((df["risk_level"] == "CRITICAL").sum()),
            "high_apis": int((df["risk_level"] == "HIGH").sum()),
            "suspicious_apis": int(df["is_shadow_api"].sum()),
            "traffic_spike_apis": int((df.get("traffic_pattern", pd.Series(dtype=str)) == "sudden spike").sum()) if "traffic_pattern" in df.columns else int(((df["daily_calls"] > 500)).sum()),
        }
        
        return {
            "metrics": metrics,
            "api_data": analysis_data
        }
    
    except Exception as e:
        print(f"Analysis fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/graph")
async def get_graph_data(user_id: str = Depends(resolve_user_id_for_read)):
    """
    Fetch graph visualization data from Supabase.
    """
    try:
        graph_data = SupabaseOps.get_user_graph_data(user_id)
        
        return {
            "nodes": graph_data.get("nodes", []),
            "edges": graph_data.get("edges", [])
        }
    
    except Exception as e:
        print(f"Graph fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/alerts")
async def get_alerts(user_id: str = Depends(resolve_user_id_for_read)):
    """
    Fetch all unresolved risk alerts for this user.
    """
    try:
        alerts = SupabaseOps.get_user_alerts(user_id, unresolved_only=True)
        
        return {
            "alerts": alerts,
            "count": len(alerts)
        }
    
    except Exception as e:
        print(f"Alerts fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/profile")
async def get_profile(
    user_id: str = Depends(resolve_user_id_for_read),   
):
    """Fetch profile details for the resolved user, including agent-key redirected sessions."""
    try:
        profile = SupabaseOps.get_user_profile(user_id)
        if not profile:
            return {"profile": None}
        return {"profile": profile}
    except Exception as e:
        print(f"Profile fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "AegisAPI Backend"}
@app.post("/api/mitigations/generate")
async def generate_mitigation(
    payload: MitigationRequest,
    user_id: str = Depends(resolve_user_id_for_read),
):
    """
    Generate endpoint-specific mitigation techniques with Groq.
    Trigger this when user clicks a specific endpoint detail card.
    """
    try:
        analysis = SupabaseOps.get_endpoint_analysis(user_id, payload.endpoint, payload.method)
        if not analysis and payload.method:
            analysis = SupabaseOps.get_endpoint_analysis(user_id, payload.endpoint, None)

        # LLM-only mode: even if analysis row is missing, build a minimal context and still require Groq output.
        if not analysis:
            llm_input = {
                "endpoint": payload.endpoint,
                "error_rate": 0,
                "frequency": 0,
                "anomaly": -1,
                "risk_level": "UNKNOWN",
                "auth_type": "Unknown",
                "traffic_pattern": "unknown",
            }
        else:
            llm_input = _build_llm_payload(analysis)

        profile = SupabaseOps.get_user_profile(user_id)
        alerts = SupabaseOps.get_endpoint_alerts(user_id, analysis.get("id") if analysis else None)
        related_apis = SupabaseOps.get_related_api_samples(user_id, payload.endpoint)

        context_payload = {
            "input": llm_input,
            "analysis": analysis,
            "alerts": alerts,
            "related_apis": related_apis,
            "profile": profile,
        }

        result = generate_groq_mitigation(context_payload)
        llm_source = result.get("llm_source") or "generated"

        # Enforce Groq-only results; do not return local fallback mitigations.
        if llm_source.startswith("fallback"):
            raise HTTPException(
                status_code=502,
                detail=f"LLM generation failed ({llm_source}). Check GROQ_API_KEY and Groq availability.",
            )

        summary = result.get("summary") or "Mitigation guidance generated."
        mitigations = result.get("mitigations") or []
        mitigation_steps = result.get("mitigation_steps") or [
            step
            for item in mitigations
            for step in item.get("steps", [])
            if isinstance(step, str) and step.strip()
        ]

        saved = SupabaseOps.save_mitigation(
            user_id=user_id,
            endpoint=payload.endpoint,
            method=payload.method or (analysis.get("method") if analysis else None) or "GET",
            api_analysis_id=analysis.get("id") if analysis else None,
            risk_level=str((analysis.get("risk_level") if analysis else None) or "LOW"),
            llm_provider="groq",
            llm_model=GROQ_MODEL,
            prompt_payload=llm_input,
            context_payload=context_payload,
            mitigation_summary=summary,
            mitigation_steps=mitigations,
            raw_response=json.dumps(result, ensure_ascii=True),
        )

        return {
            "endpoint": payload.endpoint,
            "summary": summary,
            "mitigations": mitigations,
            "mitigation_steps": mitigation_steps,
            "monitoring": result.get("monitoring") or [],
            "why_flagged": result.get("why_flagged") or [],
            "input": llm_input,
            "saved_id": saved.get("id") if saved else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Mitigation generation error: {str(e)}")
        raise HTTPException(status_code=502, detail=f"LLM generation failed: {str(e)}")


@app.post("/api/reset-data")
async def reset_user_data(user_id: str = Depends(get_user_id)):
    """Clear current user's analysis artifacts so next login starts fresh."""
    try:
        SupabaseOps.clear_user_data(user_id)
        return {"message": "User data cleared"}
    except Exception as e:
        print(f"Reset data error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/stats")
async def admin_global_stats():
    """
    Fetch global statistics across all users and uploads.
    Returns: total users, total active agents, online agents, regions covered
    """
    try:
        stats = SupabaseOps.get_admin_global_stats()
        return stats
    except Exception as e:
        print(f"Admin stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/risk-distribution")
async def admin_risk_distribution():
    """
    Fetch global risk distribution across all analyzed APIs.
    Returns: counts by risk level (Critical, High, Medium, Low)
    """
    try:
        distribution = SupabaseOps.get_admin_risk_distribution()
        return distribution
    except Exception as e:
        print(f"Admin risk distribution error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/api-categories")
async def admin_api_categories():
    """
    Fetch API analysis grouped by category and suspicious/zombie status.
    Returns: categories with suspicious and zombie API counts
    """
    try:
        categories = SupabaseOps.get_admin_api_categories()
        return categories
    except Exception as e:
        print(f"Admin API categories error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/system-health")
async def admin_system_health():
    """
    Fetch system health metrics: total logs analyzed, average latency
    """
    try:
        health = SupabaseOps.get_admin_system_health()
        return health
    except Exception as e:
        print(f"Admin system health error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/heatmap")
async def admin_heatmap():
    """
    Fetch regional risk matrix data based on user locations and API risks.
    Returns: matrix of risk levels by region
    """
    try:
        heatmap = SupabaseOps.get_admin_heatmap_data()
        return heatmap
    except Exception as e:
        print(f"Admin heatmap error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/user-distribution")
async def admin_user_distribution():
    """
    Fetch real user distribution by role/profession.
    Returns: users grouped by their roles from profiles table
    """
    try:
        distribution = SupabaseOps.get_admin_user_distribution()
        return distribution
    except Exception as e:
        print(f"Admin user distribution error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
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


class MitigationRequest(BaseModel):
    endpoint: str
    method: Optional[str] = None


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


def _build_llm_payload(row: Dict[str, Any]) -> Dict[str, Any]:
    risk_level = str(row.get("risk_level") or "LOW").upper()
    anomaly = -1 if risk_level in ["HIGH", "CRITICAL"] else 1
    return {
        "endpoint": row.get("endpoint"),
        "error_rate": float(row.get("error_rate") or 0),
        "frequency": float(row.get("daily_calls") or row.get("call_count") or 0),
        "anomaly": anomaly,
        "risk_level": risk_level,
        "auth_type": "Unknown",
        "traffic_pattern": _detect_traffic_pattern(row),
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
    pattern = rf"{label}:\s*(.*?)(?=\n\s*[A-Za-z][A-Za-z\s]*:\s*|$)"
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
    impact = _extract_labeled_section(text, "Impact")

    bullets = []
    if mitigation_block:
        bullet_matches = re.findall(r"^\s*(?:[-*\u2022]|\d+[.)])\s+(.+)$", mitigation_block, flags=re.MULTILINE)
        bullets = [b.strip() for b in bullet_matches if b.strip()]
        if not bullets:
            bullets = [line.strip() for line in mitigation_block.splitlines() if line.strip()]

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


def generate_groq_mitigation(context_payload: Dict[str, Any]) -> Dict[str, Any]:
    if not GROQ_API_KEY:
        fallback = _fallback_mitigation(context_payload.get("input", {}))
        fallback["llm_source"] = "fallback-no-key"
        return fallback

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
            fallback = _fallback_mitigation(context_payload.get("input", {}))
            fallback["llm_source"] = "fallback-parse"
            return fallback
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
        fallback = _fallback_mitigation(context_payload.get("input", {}))
        fallback["llm_source"] = "fallback-request"
        return fallback


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
    session_id = None
    try:
        if not logs:
            raise ValueError("No logs provided")
        
        # Create upload session
        session_id = SupabaseOps.create_upload_session(user_id, len(logs))
        
        # Normalize logs in-memory only; raw rows are not persisted for security.
        df = normalize_logs_dataframe(logs)
        processed_count = len(df)
        
        # Run risk detection
        analysis_df = risk_model.detect_risks(df, user_id)
        
        if len(analysis_df) > 0:
            # Convert to dict for Supabase
            analysis_records = analysis_df.to_dict(orient="records")
            
            # Upsert analysis results into api_analysis.
            SupabaseOps.upsert_api_analysis(user_id, analysis_records)
            
            # Replace old unresolved alerts with latest alert set.
            SupabaseOps.clear_unresolved_alerts(user_id)
            alert_count = SupabaseOps.create_risk_alerts(user_id, analysis_df)
            
            # Generate graph data
            nodes, edges = risk_model.get_graph_nodes_edges(analysis_df)
            SupabaseOps.save_graph_data(user_id, nodes, edges)
            
            # Update session status
            summary = {
                "total_apis": len(analysis_df),
                "critical_count": len(analysis_df[analysis_df["risk_level"] == "CRITICAL"]),
                "high_count": len(analysis_df[analysis_df["risk_level"] == "HIGH"]),
                "zombie_count": len(analysis_df[analysis_df["is_zombie"]]),
                "shadow_count": len(analysis_df[analysis_df["is_shadow_api"]]),
                "alerts_created": alert_count,
            }
            SupabaseOps.update_upload_session(session_id, "COMPLETED", processed_count, summary)
        else:
            SupabaseOps.clear_unresolved_alerts(user_id)
            SupabaseOps.update_upload_session(session_id, "COMPLETED", processed_count, {})
        
        return {
            "message": "Logs uploaded and analyzed successfully",
            "session_id": session_id,
            "logs_ingested": processed_count,
            "apis_analyzed": len(analysis_df),
            "summary": summary if len(analysis_df) > 0 else {}
        }
    
    except Exception as e:
        print(f"Upload error: {str(e)}")
        SupabaseOps.update_upload_session(session_id, "FAILED", 0, None, str(e))
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/analysis")
async def get_analysis(user_id: str = Depends(get_user_id)):
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
        }
        
        return {
            "metrics": metrics,
            "api_data": analysis_data
        }
    
    except Exception as e:
        print(f"Analysis fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/graph")
async def get_graph_data(user_id: str = Depends(get_user_id)):
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
async def get_alerts(user_id: str = Depends(get_user_id)):
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


@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "AegisAPI Backend"}


<<<<<<< HEAD
@app.post("/api/mitigations/generate")
async def generate_mitigation(
    payload: MitigationRequest,
    user_id: str = Depends(get_user_id),
):
    """
    Generate endpoint-specific mitigation techniques with Groq.
    Trigger this when user clicks a specific endpoint detail card.
    """
    try:
        analysis = SupabaseOps.get_endpoint_analysis(user_id, payload.endpoint, payload.method)
        if not analysis and payload.method:
            analysis = SupabaseOps.get_endpoint_analysis(user_id, payload.endpoint, None)

        if not analysis:
            fallback_input = {
                "endpoint": payload.endpoint,
                "error_rate": 0,
                "frequency": 0,
                "anomaly": -1,
                "risk_level": "UNKNOWN",
                "auth_type": "Unknown",
                "traffic_pattern": "unknown",
            }
            fallback_result = _fallback_mitigation(fallback_input)
            return {
                "endpoint": payload.endpoint,
                "source": "fallback-no-analysis",
                "summary": fallback_result.get("summary") or "Mitigation guidance generated.",
                "mitigations": fallback_result.get("mitigations") or [],
                "mitigation_steps": fallback_result.get("mitigation_steps") or [],
                "monitoring": fallback_result.get("monitoring") or [],
                "why_flagged": fallback_result.get("why_flagged") or ["Endpoint analysis not available yet"],
                "input": fallback_input,
                "saved_id": None,
            }

        llm_input = _build_llm_payload(analysis)
        profile = SupabaseOps.get_user_profile(user_id)
        alerts = SupabaseOps.get_endpoint_alerts(user_id, analysis.get("id"))
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
            method=payload.method or analysis.get("method") or "GET",
            api_analysis_id=analysis.get("id"),
            risk_level=str(analysis.get("risk_level") or "LOW"),
            llm_provider="groq" if GROQ_API_KEY else "fallback",
            llm_model=GROQ_MODEL if GROQ_API_KEY else "rule-based",
            prompt_payload=llm_input,
            context_payload=context_payload,
            mitigation_summary=summary,
            mitigation_steps=mitigations,
            raw_response=json.dumps(result, ensure_ascii=True),
        )

        return {
            "endpoint": payload.endpoint,
            "source": llm_source,
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
        raise HTTPException(status_code=500, detail="Failed to generate mitigation")
=======
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
>>>>>>> 95799056cfaccdfc7304f7f727e5cb45baf956ac

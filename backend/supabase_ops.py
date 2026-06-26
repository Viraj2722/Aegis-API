"""
Supabase client and utilities for backend operations
"""

import os
import math
import secrets
from supabase import create_client, Client
from typing import List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
import pandas as pd

# Load both possible env locations for local development.
load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SERVICE_ROLE_KEY")
    or os.getenv("NEXT_PUBLIC_SERVICE_ROLE_KEY")
)

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _require_supabase() -> Client:
    if not supabase:
        raise ValueError(
            "Supabase is not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) "
            "and SUPABASE_SERVICE_ROLE_KEY in your .env file."
        )
    return supabase


class SupabaseOps:
    """Helper class for Supabase database operations"""

    @staticmethod
    def _as_iso(value):
        if value is None:
            return None
        if isinstance(value, pd.Timestamp):
            return value.to_pydatetime().isoformat()
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return value

    @staticmethod
    def _as_float(value, default: float = 0.0) -> float:
        try:
            v = float(value)
            if math.isnan(v) or math.isinf(v):
                return default
            return v
        except Exception:
            return default

    @staticmethod
    def _as_int(value, default: int = 0) -> int:
        try:
            v = int(float(value))
            return v
        except Exception:
            return default

    @staticmethod
    def get_user_id_from_token(access_token: str) -> str:
        """Validate Supabase JWT and return authenticated user id."""
        if not access_token:
            raise ValueError("Missing access token")
        client = _require_supabase()
        user_response = client.auth.get_user(access_token)
        user = user_response.user
        if not user or not user.id:
            raise ValueError("Invalid access token")
        return user.id

    @staticmethod
    def _generate_agent_secret_key() -> str:
        return f"ag_{secrets.token_urlsafe(24)}"

    @staticmethod
    def create_agent(user_id: str, dashboard_url: str, secret_key: str = None) -> Dict[str, Any]:
        """Create an agent key mapped to a dashboard URL for a user."""
        client = _require_supabase()
        key = (secret_key or SupabaseOps._generate_agent_secret_key()).strip()
        record = {
            "user_id": user_id,
            "secret_key": key,
            "dashboard_url": dashboard_url,
        }
        try:
            result = client.table("agents").insert(record).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            print(f"Error creating agent key: {e}")
            raise

    @staticmethod
    def get_agent_by_secret(secret_key: str) -> Dict[str, Any]:
        """Resolve an agent row from a provided secret key."""
        try:
            client = _require_supabase()
            result = (
                client.table("agents")
                .select("id,user_id,secret_key,dashboard_url,created_at")
                .eq("secret_key", secret_key)
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else {}
        except Exception as e:
            print(f"Error fetching agent by secret: {e}")
            return {}

    @staticmethod
    def list_user_agents(user_id: str) -> List[Dict[str, Any]]:
        """List all generated agent keys for the authenticated user."""
        try:
            client = _require_supabase()
            result = (
                client.table("agents")
                .select("id,secret_key,dashboard_url,created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            return result.data or []
        except Exception as e:
            print(f"Error listing agents: {e}")
            return []

    @staticmethod
    def update_agent_dashboard_url(agent_id: str, dashboard_url: str) -> Dict[str, Any]:
        """Update dashboard_url for an existing agent row."""
        try:
            client = _require_supabase()
            result = (
                client.table("agents")
                .update({"dashboard_url": dashboard_url})
                .eq("id", agent_id)
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else {}
        except Exception as e:
            print(f"Error updating agent dashboard_url: {e}")
            return {}
    
    @staticmethod
    def clear_unresolved_alerts(user_id: str) -> None:
        """Clear unresolved alerts so each upload reflects current analysis only."""
        try:
            client = _require_supabase()
            client.table("risk_alerts").delete().eq("user_id", user_id).eq("is_resolved", False).execute()
        except Exception as e:
            print(f"Error clearing unresolved alerts: {e}")

    @staticmethod
    def clear_user_data(user_id: str) -> None:
        """Delete per-user analysis artifacts to start with a clean dashboard state."""
        # Delete child/dependent rows first to satisfy FK constraints.
        tables = [
            "risk_alerts",
            "api_mitigations",
            "graph_data",
            "api_analysis",
            "upload_sessions",
        ]
        client = _require_supabase()
        for table in tables:
            try:
                client.table(table).delete().eq("user_id", user_id).execute()
            except Exception as e:
                print(f"Error clearing {table} for user {user_id}: {e}")
    
    @staticmethod
    def upsert_api_analysis(user_id: str, analysis_records: List[Dict[str, Any]]) -> int:
        """
        Upsert API analysis results. Updates if exists, inserts if new.
        
        Returns: number of upserted records
        """
        records = []
        for record in analysis_records:
            endpoint = record.get("api")
            if not endpoint:
                continue
            api_record = {
                "user_id": user_id,
                "endpoint": endpoint,
                "method": record.get("method", "GET"),
                "call_count": SupabaseOps._as_int(record.get("call_count", 0)),
                "error_count": SupabaseOps._as_int(record.get("error_count", 0)),
                "error_rate": SupabaseOps._as_float(record.get("error_rate", 0)),
                "avg_response_time": SupabaseOps._as_float(record.get("avg_response_time", 0)),
                "avg_latency": SupabaseOps._as_float(record.get("avg_latency", 0)),
                "payload_size": SupabaseOps._as_float(record.get("payload_size", 0)),
                "days_active": SupabaseOps._as_int(record.get("days_active", 0)),
                "days_inactive": SupabaseOps._as_int(record.get("days_inactive", 0)),
                "daily_calls": SupabaseOps._as_float(record.get("daily_calls", 0)),
                "last_seen": SupabaseOps._as_iso(record.get("last_seen")),
                "first_seen": SupabaseOps._as_iso(record.get("first_seen")),
                "risk_score": SupabaseOps._as_float(record.get("risk_score", 0)),
                "risk_level": record.get("risk_level", "LOW"),
                "is_zombie": bool(record.get("is_zombie", False)),
                "is_shadow_api": bool(record.get("is_shadow_api", False)),
                "anomaly_score": SupabaseOps._as_float(record.get("anomaly_score", 0)),
                "fingerprint": record.get("fingerprint"),
                "traffic_pattern": record.get("traffic_pattern"),
            }
            records.append(api_record)
        
        if not records:
            return 0
        
        try:
            client = _require_supabase()
            # Upsert using endpoint as unique identifier per user
            result = client.table("api_analysis").upsert(
                records,
                on_conflict="user_id,endpoint"
            ).execute()
            return len(records)
        except Exception as e:
            print(f"Error upserting api_analysis: {e}")
            return 0
    
    @staticmethod
    def create_risk_alerts(user_id: str, analysis_df) -> int:
        """
        Create alerts for high-risk APIs.
        
        Returns: number of alerts created
        """
        alerts = []
        
        # Fetch existing API analysis IDs for reference
        try:
            client = _require_supabase()
            existing = client.table("api_analysis").select("id,endpoint").eq("user_id", user_id).execute()
            api_id_map = {r["endpoint"]: r["id"] for r in existing.data}
        except:
            api_id_map = {}
        
        for idx, row in analysis_df.iterrows():
            if row['risk_level'] in ['HIGH', 'CRITICAL']:
                # Determine alert type
                if row.get('is_zombie'):
                    alert_type = 'ZOMBIE'
                elif row.get('is_shadow_api'):
                    alert_type = 'SHADOW'
                elif row['error_rate'] > 0.5:
                    alert_type = 'HIGH_ERROR_RATE'
                elif row['avg_response_time'] > 500:
                    alert_type = 'HIGH_LATENCY'
                else:
                    alert_type = 'ANOMALY'
                
                api_id = api_id_map.get(row.get('api'))
                
                alert = {
                    "user_id": user_id,
                    "api_analysis_id": api_id,
                    "alert_type": alert_type,
                    "severity": row['risk_level'],
                    "title": f"{alert_type} detected on {row.get('api')}",
                    "description": f"API {row.get('api')} has risk score {SupabaseOps._as_float(row.get('risk_score')):.0f}/100. "
                                   f"Error rate: {SupabaseOps._as_float(row.get('error_rate'))*100:.1f}%, "
                                   f"Avg latency: {SupabaseOps._as_float(row.get('avg_response_time')):.0f}ms",
                    "recommendation": SupabaseOps._get_recommendation(alert_type, row),
                    "is_resolved": False,
                }
                alerts.append(alert)
        
        if not alerts:
            return 0
        
        try:
            # Create new alerts (don't overwrite existing)
            client = _require_supabase()
            result = client.table("risk_alerts").insert(alerts).execute()
            return len(alerts)
        except Exception as e:
            print(f"Error creating risk_alerts: {e}")
            return 0
    
    @staticmethod
    def _get_recommendation(alert_type: str, row) -> str:
        """Generate recommendation based on alert type"""
        recs = {
            'ZOMBIE': 'This API has been inactive for extended period. Consider deprecating or archiving.',
            'SHADOW': 'This API has similar behavior to another API. Review for duplication/redundancy.',
            'HIGH_ERROR_RATE': f'Error rate is {row.get("error_rate", 0)*100:.1f}%. Investigate error logs and fix issues.',
            'HIGH_LATENCY': f'Response time is {row.get("avg_response_time", 0):.0f}ms. Consider optimization or scaling.',
            'ANOMALY': 'This API shows abnormal behavior. Review logs and configurations.',
        }
        return recs.get(alert_type, 'Review this API for potential security or performance issues.')
    
    @staticmethod
    def create_upload_session(user_id: str, log_count: int) -> str:
        """
        Create a new upload session record.
        
        Returns: session ID
        """
        try:
            client = _require_supabase()
            result = client.table("upload_sessions").insert({
                "user_id": user_id,
                "log_count": log_count,
                "status": "PROCESSING"
            }).execute()
            return result.data[0]["id"]
        except Exception as e:
            print(f"Error creating upload_session: {e}")
            return None
    
    @staticmethod
    def update_upload_session(session_id: str, status: str, processed_count: int, analysis_results: Dict = None, error_msg: str = None):
        """Update upload session with results"""
        if not session_id:
            return
        try:
            client = _require_supabase()
            data = {
                "status": status,
                "processed_count": processed_count,
            }
            if analysis_results:
                data["analysis_results"] = analysis_results
            if error_msg:
                data["error_message"] = error_msg
            
            client.table("upload_sessions").update(data).eq("id", session_id).execute()
        except Exception as e:
            print(f"Error updating upload_session: {e}")
    
    @staticmethod
    def save_graph_data(user_id: str, nodes: List[Dict], edges: List[Dict]):
        """Save/update graph visualization data"""
        try:
            client = _require_supabase()
            data = {
                "user_id": user_id,
                "nodes": nodes,
                "edges": edges,
            }
            client.table("graph_data").upsert(data, on_conflict="user_id").execute()
        except Exception as e:
            print(f"Error saving graph_data: {e}")
    
    @staticmethod
    def get_user_analysis(user_id: str) -> List[Dict]:
        """Fetch all API analysis for a user"""
        try:
            client = _require_supabase()
            result = client.table("api_analysis").select("*").eq("user_id", user_id).execute()
            return result.data
        except Exception as e:
            print(f"Error fetching api_analysis: {e}")
            return []
    
    @staticmethod
    def get_user_graph_data(user_id: str) -> Dict:
        """Fetch graph data for a user"""
        try:
            client = _require_supabase()
            result = client.table("graph_data").select("*").eq("user_id", user_id).execute()
            if result.data:
                return result.data[0]
            return {"nodes": [], "edges": []}
        except Exception as e:
            print(f"Error fetching graph_data: {e}")
            return {"nodes": [], "edges": []}
    
    @staticmethod
    def get_user_alerts(user_id: str, unresolved_only: bool = True) -> List[Dict]:
        """Fetch alerts for a user"""
        try:
            client = _require_supabase()
            query = client.table("risk_alerts").select("*").eq("user_id", user_id)
            if unresolved_only:
                query = query.eq("is_resolved", False)
            result = query.execute()
            return result.data
        except Exception as e:
            print(f"Error fetching risk_alerts: {e}")
            return []
    @staticmethod
    def get_user_email(user_id: str) -> str:
        """Fetch user email from Supabase auth (requires service role access)."""
        try:
            client = _require_supabase()
            # Use admin API to get user email from auth.users
            user = client.auth.admin.get_user(user_id)
            return user.user.email if user and user.user else None
        except Exception as e:
            print(f"Error fetching user email: {e}")
            return None

    @staticmethod
    def get_user_profile(user_id: str) -> Dict[str, Any]:
        """Fetch profile details for personalization/context."""
        try:
            client = _require_supabase()
            result = (
                client.table("profiles")
                .select("*")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            if not result.data:
                return {}

            raw_profile = result.data[0] or {}

            # Handle schema drift: some deployments use company_name, others use company.
            company_value = (
                raw_profile.get("company_name")
                or raw_profile.get("company")
                or raw_profile.get("organization")
            )

            # Fetch email from auth table
            email = SupabaseOps.get_user_email(user_id)

            return {
                "id": raw_profile.get("id"),
                "full_name": raw_profile.get("full_name"),
                "email": email,
                "company_name": company_value,
                "role": raw_profile.get("role"),
                "country": raw_profile.get("country"),
            }
        except Exception as e:
            print(f"Error fetching user profile: {e}")
            return {}

    @staticmethod
    def get_endpoint_analysis(user_id: str, endpoint: str, method: str = None) -> Dict[str, Any]:
        """Fetch analysis row for one endpoint."""
        try:
            client = _require_supabase()
            query = client.table("api_analysis").select("*").eq("user_id", user_id).eq("endpoint", endpoint)
            if method:
                query = query.eq("method", method)
            result = query.limit(1).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            print(f"Error fetching endpoint analysis: {e}")
            return {}

    @staticmethod
    def get_endpoint_alerts(user_id: str, api_analysis_id: str = None) -> List[Dict[str, Any]]:
        """Fetch latest alerts for the endpoint."""
        try:
            client = _require_supabase()
            query = (
                client.table("risk_alerts")
                .select("id,alert_type,severity,title,description,recommendation,created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(10)
            )
            if api_analysis_id:
                query = query.eq("api_analysis_id", api_analysis_id)
            result = query.execute()
            return result.data or []
        except Exception as e:
            print(f"Error fetching endpoint alerts: {e}")
            return []

    @staticmethod
    def get_related_api_samples(user_id: str, endpoint: str) -> List[Dict[str, Any]]:
        """Fetch a few additional API rows to provide broader context to the LLM."""
        try:
            client = _require_supabase()
            result = (
                client.table("api_analysis")
                .select("endpoint,method,risk_level,error_rate,avg_response_time,daily_calls,is_shadow_api,is_zombie")
                .eq("user_id", user_id)
                .neq("endpoint", endpoint)
                .order("risk_score", desc=True)
                .limit(5)
                .execute()
            )
            return result.data or []
        except Exception as e:
            print(f"Error fetching related API samples: {e}")
            return []

    @staticmethod
    def get_latest_mitigation(user_id: str, endpoint: str) -> Dict[str, Any]:
        """Fetch the latest saved LLM mitigation record for an endpoint."""
        try:
            client = _require_supabase()
            result = (
                client.table("api_mitigations")
                .select("*")
                .eq("user_id", user_id)
                .eq("endpoint", endpoint)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else {}
        except Exception as e:
            print(f"Error fetching latest mitigation: {e}")
            return {}

    @staticmethod
    def save_mitigation(
        user_id: str,
        endpoint: str,
        method: str,
        api_analysis_id: str,
        risk_level: str,
        llm_provider: str,
        llm_model: str,
        prompt_payload: Dict[str, Any],
        context_payload: Dict[str, Any],
        mitigation_summary: str,
        mitigation_steps: List[Dict[str, Any]],
        raw_response: str,
    ) -> Dict[str, Any]:
        """Persist generated mitigation output for audit/history."""
        try:
            client = _require_supabase()
            record = {
                "user_id": user_id,
                "api_analysis_id": api_analysis_id,
                "endpoint": endpoint,
                "method": method,
                "risk_level": risk_level,
                "llm_provider": llm_provider,
                "llm_model": llm_model,
                "prompt_payload": prompt_payload,
                "context_payload": context_payload,
                "mitigation_summary": mitigation_summary,
                "mitigation_steps": mitigation_steps,
                "raw_response": raw_response,
            }
            result = client.table("api_mitigations").insert(record).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            print(f"Error saving mitigation: {e}")
            return {}

    # ===== ADMIN ANALYTICS =====

    @staticmethod
    def get_admin_global_stats() -> Dict[str, Any]:
        """
        Fetch global admin statistics across all users and uploads.
        Returns: totalUsers, activeAgents (unique user count from api_analysis), onlineAgents, regionsCovered
        """
        try:
            from datetime import datetime, timedelta

            profiles_result = supabase.table("profiles").select("id, country").execute()
            profile_rows = profiles_result.data or []
            profile_user_ids = {r.get("id") for r in profile_rows if r.get("id")}

            analysis_users_result = supabase.table("api_analysis").select("user_id").execute()
            analysis_rows = analysis_users_result.data or []
            analysis_user_ids = {r.get("user_id") for r in analysis_rows if r.get("user_id")}

            total_users = len(profile_user_ids.union(analysis_user_ids))

            agents_result = supabase.table("agents").select("id, updated_at, created_at").execute()
            agent_rows = agents_result.data or []
            active_agents = len(agent_rows)

            now = datetime.utcnow()
            online_cutoff = now - timedelta(hours=24)
            online_agents = 0
            for row in agent_rows:
                ts_raw = row.get("updated_at") or row.get("created_at")
                ts = pd.to_datetime(ts_raw, utc=True, errors="coerce")
                if ts is not None and not pd.isna(ts):
                    ts_naive = ts.tz_convert("UTC").tz_localize(None)
                    if ts_naive >= online_cutoff:
                        online_agents += 1

            regions = len({r.get("country") for r in profile_rows if r.get("country")})

            return {
                "globalStats": {
                    "totalUsers": int(total_users),
                    "activeAgents": int(active_agents),
                    "onlineAgents": int(online_agents),
                    "regionsCovered": int(regions),
                }
            }
        except Exception as e:
            print(f"Error fetching admin global stats: {e}")
            return {
                "globalStats": {
                    "totalUsers": 0,
                    "activeAgents": 0,
                    "onlineAgents": 0,
                    "regionsCovered": 0
                }
            }

    @staticmethod
    def get_admin_risk_distribution() -> Dict[str, Any]:
        """
        Fetch global risk distribution across all analyzed APIs.
        Returns: threatData.donut with Critical, High, Medium, Low counts
        """
        try:
            result = supabase.table("api_analysis").select("risk_level").execute()

            risk_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
            for row in (result.data or []):
                level = str(row.get("risk_level") or "LOW").upper()
                if level in risk_counts:
                    risk_counts[level] += 1
            
            return {
                "threatData": {
                    "donut": [
                        {"name": "Critical", "value": risk_counts["CRITICAL"], "color": "#f87171"},
                        {"name": "High", "value": risk_counts["HIGH"], "color": "#fb923c"},
                        {"name": "Medium", "value": risk_counts["MEDIUM"], "color": "#fbbf24"},
                        {"name": "Low", "value": risk_counts["LOW"], "color": "#38bdf8"},
                    ]
                }
            }
        except Exception as e:
            print(f"Error fetching admin risk distribution: {e}")
            return {
                "threatData": {
                    "donut": [
                        {"name": "Critical", "value": 0, "color": "#f87171"},
                        {"name": "High", "value": 0, "color": "#fb923c"},
                        {"name": "Medium", "value": 0, "color": "#fbbf24"},
                        {"name": "Low", "value": 0, "color": "#38bdf8"},
                    ]
                }
            }

    @staticmethod
    def get_admin_api_categories() -> Dict[str, Any]:
        """
        Fetch API analysis grouped by category (auth, payments, users, reports, internal).
        Categories inferred from endpoint patterns.
        Returns: threatData.categories with suspicious and zombie counts per category
        """
        try:
            result = supabase.table("api_analysis").select("endpoint, is_zombie, is_shadow_api, risk_level").execute()
            
            # Categorize endpoints by pattern
            categories = {
                "Auth": {"suspicious": 0, "zombie": 0},
                "Payments": {"suspicious": 0, "zombie": 0},
                "Users": {"suspicious": 0, "zombie": 0},
                "Reports": {"suspicious": 0, "zombie": 0},
                "Internal": {"suspicious": 0, "zombie": 0},
            }
            
            if result.data:
                for api in result.data:
                    endpoint = (api.get("endpoint", "") or "").lower()
                    is_shadow = api.get("is_shadow_api", False)
                    is_zombie = api.get("is_zombie", False)
                    
                    # Infer category from endpoint
                    category = "Internal"
                    if any(x in endpoint for x in ["auth", "login", "signin", "oauth"]):
                        category = "Auth"
                    elif any(x in endpoint for x in ["payment", "invoice", "billing", "charge", "payment"]):
                        category = "Payments"
                    elif any(x in endpoint for x in ["user", "profile", "account"]):
                        category = "Users"
                    elif any(x in endpoint for x in ["report", "analytics", "export"]):
                        category = "Reports"
                    
                    is_high_risk = str(api.get("risk_level") or "").upper() in {"HIGH", "CRITICAL"}

                    if is_shadow or is_high_risk:
                        categories[category]["suspicious"] += 1
                    if is_zombie:
                        categories[category]["zombie"] += 1
            
            return {
                "threatData": {
                    "categories": [
                        {"category": cat, **counts}
                        for cat, counts in categories.items()
                    ]
                }
            }
        except Exception as e:
            print(f"Error fetching admin API categories: {e}")
            return {
                "threatData": {
                    "categories": [
                        {"category": "Auth", "suspicious": 0, "zombie": 0},
                        {"category": "Payments", "suspicious": 0, "zombie": 0},
                        {"category": "Users", "suspicious": 0, "zombie": 0},
                        {"category": "Reports", "suspicious": 0, "zombie": 0},
                        {"category": "Internal", "suspicious": 0, "zombie": 0},
                    ]
                }
            }

    @staticmethod
    def get_admin_system_health() -> Dict[str, Any]:
        """
        Fetch system health metrics: total logs analyzed, average latency
        """
        try:
            api_result = supabase.table("api_analysis").select("call_count, avg_latency, avg_response_time, updated_at").execute()

            total_logs = 0
            latencies = []
            ingestion_data = []

            api_rows = api_result.data or []
            if api_rows:
                api_df = pd.DataFrame(api_rows)
                total_logs = int(api_df["call_count"].fillna(0).sum())

                latency_series = api_df.get("avg_latency")
                if latency_series is None or latency_series.isna().all():
                    latency_series = api_df.get("avg_response_time")
                if latency_series is not None:
                    latencies = [float(v) for v in latency_series.fillna(0).tolist() if float(v) > 0]

                if "updated_at" in api_df.columns:
                    ts = pd.to_datetime(api_df["updated_at"], utc=True, errors="coerce")
                    temp_df = pd.DataFrame({
                        "ts": ts,
                        "calls": api_df["call_count"].fillna(0),
                    }).dropna(subset=["ts"])

                    if not temp_df.empty:
                        temp_df["bucket"] = temp_df["ts"].dt.floor("h")
                        grouped = (
                            temp_df.groupby("bucket", as_index=False)["calls"]
                            .sum()
                            .sort_values("bucket")
                            .tail(8)
                        )
                        ingestion_data = [
                            {"time": row["bucket"].strftime("%H:%M"), "logs": int(row["calls"])}
                            for _, row in grouped.iterrows()
                        ]

            if not ingestion_data:
                sessions = supabase.table("upload_sessions").select("created_at, log_count, processed_count").execute()
                session_rows = sessions.data or []
                if session_rows:
                    session_df = pd.DataFrame(session_rows)
                    session_df["ts"] = pd.to_datetime(session_df["created_at"], utc=True, errors="coerce")
                    session_df["logs"] = session_df["processed_count"].fillna(session_df["log_count"]).fillna(0)
                    session_df = session_df.dropna(subset=["ts"])
                    if not session_df.empty:
                        session_df["bucket"] = session_df["ts"].dt.floor("h")
                        grouped = (
                            session_df.groupby("bucket", as_index=False)["logs"]
                            .sum()
                            .sort_values("bucket")
                            .tail(8)
                        )
                        ingestion_data = [
                            {"time": row["bucket"].strftime("%H:%M"), "logs": int(row["logs"])}
                            for _, row in grouped.iterrows()
                        ]

            avg_latency = round(sum(latencies) / len(latencies)) if latencies else 28

            return {
                "ingestionStats": {
                    "totalLogsAnalyzed": int(total_logs),
                    "avgLatencyMs": int(avg_latency),
                },
                "ingestionData": ingestion_data,
            }
        except Exception as e:
            print(f"Error fetching admin system health: {e}")
            return {
                "ingestionStats": {
                    "totalLogsAnalyzed": 0,
                    "avgLatencyMs": 0
                },
                "ingestionData": [],
            }

    @staticmethod
    def get_admin_heatmap_data() -> Dict[str, Any]:
        """
        Fetch regional risk matrix based on user profiles and their API risks.
        Returns: matrix of risk counts by region x risk level
        """
        try:
            # Get user profiles with their countries
            profiles_result = supabase.table("profiles").select("id, country").execute()
            user_countries = {r["id"]: r["country"] for r in profiles_result.data if r.get("country")}
            
            # Get all api_analysis records with user_id and risk_level
            api_result = supabase.table("api_analysis").select("user_id, risk_level").execute()
            
            # Define regions
            regions = ["NA", "EU", "IN", "APAC", "MEA"]
            risk_levels = ["Critical", "High", "Medium", "Low", "Info"]
            
            # Map countries to regions
            country_to_region = {
                "United States": "NA", "Canada": "NA", "Mexico": "NA",
                "United Kingdom": "EU", "Germany": "EU", "France": "EU", "India": "IN",
                "Australia": "APAC", "Japan": "APAC", "China": "APAC",
                "South Africa": "MEA", "UAE": "MEA",
            }
            
            # Initialize matrix
            matrix = [[0] * len(risk_levels) for _ in regions]
            
            if api_result.data:
                for api in api_result.data:
                    user_id = api.get("user_id")
                    country = user_countries.get(user_id, "IN")  # Default to India
                    region = country_to_region.get(country, "APAC")  # Default to APAC
                    
                    risk_level = api.get("risk_level", "Low").capitalize()
                    risk_idx = risk_levels.index(risk_level) if risk_level in risk_levels else 3
                    region_idx = regions.index(region)
                    
                    matrix[region_idx][risk_idx] += 1
            
            return {
                "riskMatrixData": {
                    "regions": regions,
                    "riskLevels": risk_levels,
                    "matrix": matrix
                }
            }
        except Exception as e:
            print(f"Error fetching admin heatmap data: {e}")
            return {
                "riskMatrixData": {
                    "regions": ["NA", "EU", "IN", "APAC", "MEA"],
                    "riskLevels": ["Critical", "High", "Medium", "Low", "Info"],
                    "matrix": [[0] * 5 for _ in range(5)]
                }
            }

    @staticmethod
    def get_admin_user_distribution() -> Dict[str, Any]:
        """
        Fetch real user distribution by role/profession from profiles table.
        Returns: list of roles with user counts
        """
        try:
            result = supabase.table("profiles").select("role").execute()
            
            # Count users by role
            role_counts = {}
            if result.data:
                for profile in result.data:
                    role = profile.get("role", "Unassigned")
                    if role:
                        role_counts[role] = role_counts.get(role, 0) + 1
            
            # Convert to list format for chart, with predefined colors
            colors = {
                "Security Engineers": "#38bdf8",
                "Security Engineer": "#38bdf8",
                "Backend Developers": "#a855f7",
                "Backend Developer": "#a855f7",
                "DevOps Engineers": "#34d399",
                "DevOps Engineer": "#34d399",
                "SRE": "#f59e0b",
                "Platform Engineers": "#22d3ee",
                "Platform Engineer": "#22d3ee",
            }
            
            profession_list = []
            for role, count in sorted(role_counts.items(), key=lambda x: x[1], reverse=True):
                profession_list.append({
                    "name": role,
                    "value": count,
                    "color": colors.get(role, "#64748b")
                })
            
            # If no data, return empty list (not mock data)
            return {
                "professionData": profession_list
            }
        except Exception as e:
            print(f"Error fetching admin user distribution: {e}")
            return {
                "professionData": []
            }

    @staticmethod
    def get_admin_users_details() -> Dict[str, Any]:
        """
        Fetch full admin users list from profiles and related activity tables.
        Returns per-user: name, email, role, country, is_admin, created_at,
        api_count, risk_alert_count, agent_count, last_activity.
        """
        try:
            profiles_result = supabase.table("profiles").select(
                "id, full_name, role, country, is_admin, created_at, updated_at"
            ).execute()
            profile_rows = profiles_result.data or []

            api_result = supabase.table("api_analysis").select(
                "user_id, endpoint, updated_at"
            ).execute()
            api_rows = api_result.data or []

            alert_result = supabase.table("risk_alerts").select(
                "user_id, created_at"
            ).execute()
            alert_rows = alert_result.data or []

            agents_result = supabase.table("agents").select(
                "user_id, created_at, updated_at"
            ).execute()
            agent_rows = agents_result.data or []

            api_count_by_user: Dict[str, int] = {}
            last_api_by_user: Dict[str, Any] = {}
            for row in api_rows:
                uid = row.get("user_id")
                if not uid:
                    continue
                api_count_by_user[uid] = api_count_by_user.get(uid, 0) + 1
                ts = pd.to_datetime(row.get("updated_at"), utc=True, errors="coerce")
                if ts is not None and not pd.isna(ts):
                    prev = last_api_by_user.get(uid)
                    if prev is None or ts > prev:
                        last_api_by_user[uid] = ts

            alerts_by_user: Dict[str, int] = {}
            last_alert_by_user: Dict[str, Any] = {}
            for row in alert_rows:
                uid = row.get("user_id")
                if not uid:
                    continue
                alerts_by_user[uid] = alerts_by_user.get(uid, 0) + 1
                ts = pd.to_datetime(row.get("created_at"), utc=True, errors="coerce")
                if ts is not None and not pd.isna(ts):
                    prev = last_alert_by_user.get(uid)
                    if prev is None or ts > prev:
                        last_alert_by_user[uid] = ts

            agents_by_user: Dict[str, int] = {}
            last_agent_by_user: Dict[str, Any] = {}
            for row in agent_rows:
                uid = row.get("user_id")
                if not uid:
                    continue
                agents_by_user[uid] = agents_by_user.get(uid, 0) + 1
                ts = pd.to_datetime(
                    row.get("updated_at") or row.get("created_at"),
                    utc=True,
                    errors="coerce",
                )
                if ts is not None and not pd.isna(ts):
                    prev = last_agent_by_user.get(uid)
                    if prev is None or ts > prev:
                        last_agent_by_user[uid] = ts

            users = []
            for profile in profile_rows:
                uid = profile.get("id")
                if not uid:
                    continue

                email = SupabaseOps.get_user_email(uid)

                candidates = [
                    pd.to_datetime(profile.get("updated_at"), utc=True, errors="coerce"),
                    last_api_by_user.get(uid),
                    last_alert_by_user.get(uid),
                    last_agent_by_user.get(uid),
                ]
                valid_candidates = [c for c in candidates if c is not None and not pd.isna(c)]
                last_activity = max(valid_candidates).isoformat() if valid_candidates else None

                users.append({
                    "id": uid,
                    "full_name": profile.get("full_name") or "Unnamed User",
                    "email": email or "",
                    "role": profile.get("role") or "Unassigned",
                    "country": profile.get("country") or "N/A",
                    "is_admin": bool(profile.get("is_admin")),
                    "created_at": profile.get("created_at"),
                    "api_count": int(api_count_by_user.get(uid, 0)),
                    "risk_alert_count": int(alerts_by_user.get(uid, 0)),
                    "agent_count": int(agents_by_user.get(uid, 0)),
                    "last_activity": last_activity,
                })

            users.sort(
                key=lambda x: (
                    pd.to_datetime(x.get("last_activity"), utc=True, errors="coerce")
                    if x.get("last_activity")
                    else pd.Timestamp.min.tz_localize("UTC")
                ),
                reverse=True,
            )

            return {"users": users}
        except Exception as e:
            print(f"Error fetching admin users details: {e}")
            return {"users": []}

    @staticmethod
    def get_admin_agents_data() -> Dict[str, Any]:
        """
        Fetch agents list and infer status buckets from last update time.
        Status inference:
        - online: updated in last 24h
        - idle: updated in last 7d but older than 24h
        - offline: older than 7d
        """
        try:
            result = (
                supabase
                .table("agents")
                .select("id, secret_key, dashboard_url, created_at, updated_at")
                .order("updated_at", desc=True)
                .execute()
            )

            rows = result.data or []
            now = pd.Timestamp.utcnow()

            agents = []
            online = 0
            offline = 0
            idle = 0

            for idx, row in enumerate(rows):
                updated_raw = row.get("updated_at") or row.get("created_at")
                updated_at = pd.to_datetime(updated_raw, utc=True, errors="coerce")
                age_hours = None
                if updated_at is not None and not pd.isna(updated_at):
                    age_hours = max((now - updated_at).total_seconds() / 3600, 0)

                if age_hours is None:
                    status = "offline"
                elif age_hours <= 24:
                    status = "online"
                elif age_hours <= 24 * 7:
                    status = "idle"
                else:
                    status = "offline"

                if status == "online":
                    online += 1
                elif status == "idle":
                    idle += 1
                else:
                    offline += 1

                # Region is not in agents schema; derive a stable placeholder.
                region_cycle = ["NA", "EU", "IN", "APAC", "MEA"]
                region = region_cycle[idx % len(region_cycle)]

                # Approximate load from recency so admins can still visualize utilization.
                if status == "offline":
                    load = 0
                elif status == "idle":
                    load = 25
                else:
                    load = 70

                agents.append({
                    "id": str(row.get("id") or f"AG-{idx+1:04d}"),
                    "name": f"Agent {idx + 1}",
                    "region": region,
                    "status": status,
                    "load": load,
                })

            return {
                "agentsData": {
                    "total": len(agents),
                    "online": online,
                    "offline": offline,
                    "idle": idle,
                    "agents": agents,
                }
            }
        except Exception as e:
            print(f"Error fetching admin agents data: {e}")
            return {
                "agentsData": {
                    "total": 0,
                    "online": 0,
                    "offline": 0,
                    "idle": 0,
                    "agents": [],
                }
            }

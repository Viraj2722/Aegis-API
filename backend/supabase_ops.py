"""
Supabase client and utilities for backend operations
"""

import os
import math
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
    def clear_unresolved_alerts(user_id: str) -> None:
        """Clear unresolved alerts so each upload reflects current analysis only."""
        try:
            client = _require_supabase()
            client.table("risk_alerts").delete().eq("user_id", user_id).eq("is_resolved", False).execute()
        except Exception as e:
            print(f"Error clearing unresolved alerts: {e}")
    
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
            result = supabase.table("upload_sessions").insert({
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
    def get_user_profile(user_id: str) -> Dict[str, Any]:
        """Fetch profile details for personalization/context."""
        try:
            client = _require_supabase()
            result = (
                client.table("profiles")
                .select("id,full_name,company_name,role,country")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else {}
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

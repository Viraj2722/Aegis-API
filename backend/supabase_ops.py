"""
Supabase client and utilities for backend operations
"""

import os
from supabase import create_client, Client
from typing import List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")

# Use service role key for backend operations (full access)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


class SupabaseOps:
    """Helper class for Supabase database operations"""

    @staticmethod
    def get_user_id_from_token(access_token: str) -> str:
        """Validate Supabase JWT and return authenticated user id."""
        if not access_token:
            raise ValueError("Missing access token")
        user_response = supabase.auth.get_user(access_token)
        user = user_response.user
        if not user or not user.id:
            raise ValueError("Invalid access token")
        return user.id
    
    @staticmethod
    def clear_unresolved_alerts(user_id: str) -> None:
        """Clear unresolved alerts so each upload reflects current analysis only."""
        try:
            supabase.table("risk_alerts").delete().eq("user_id", user_id).eq("is_resolved", False).execute()
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
                "call_count": int(record.get("call_count", 0)),
                "error_count": int(record.get("error_count", 0)),
                "error_rate": float(record.get("error_rate", 0)),
                "avg_response_time": float(record.get("avg_response_time", 0)),
                "avg_latency": float(record.get("avg_latency", 0)),
                "payload_size": float(record.get("payload_size", 0)),
                "days_active": int(record.get("days_active", 0)),
                "days_inactive": int(record.get("days_inactive", 0)),
                "daily_calls": float(record.get("daily_calls", 0)),
                "last_seen": record.get("last_seen"),
                "first_seen": record.get("first_seen"),
                "risk_score": float(record.get("risk_score", 0)),
                "risk_level": record.get("risk_level", "LOW"),
                "is_zombie": bool(record.get("is_zombie", False)),
                "is_shadow_api": bool(record.get("is_shadow_api", False)),
                "anomaly_score": float(record.get("anomaly_score", 0)),
                "fingerprint": record.get("fingerprint"),
            }
            records.append(api_record)
        
        if not records:
            return 0
        
        try:
            # Upsert using endpoint as unique identifier per user
            result = supabase.table("api_analysis").upsert(
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
            existing = supabase.table("api_analysis").select("id,endpoint").eq("user_id", user_id).execute()
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
                    "description": f"API {row.get('api')} has risk score {row['risk_score']:.0f}/100. "
                                   f"Error rate: {row['error_rate']*100:.1f}%, "
                                   f"Avg latency: {row['avg_response_time']:.0f}ms",
                    "recommendation": SupabaseOps._get_recommendation(alert_type, row),
                    "is_resolved": False,
                }
                alerts.append(alert)
        
        if not alerts:
            return 0
        
        try:
            # Create new alerts (don't overwrite existing)
            result = supabase.table("risk_alerts").insert(alerts).execute()
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
            data = {
                "status": status,
                "processed_count": processed_count,
            }
            if analysis_results:
                data["analysis_results"] = analysis_results
            if error_msg:
                data["error_message"] = error_msg
            
            supabase.table("upload_sessions").update(data).eq("id", session_id).execute()
        except Exception as e:
            print(f"Error updating upload_session: {e}")
    
    @staticmethod
    def save_graph_data(user_id: str, nodes: List[Dict], edges: List[Dict]):
        """Save/update graph visualization data"""
        try:
            data = {
                "user_id": user_id,
                "nodes": nodes,
                "edges": edges,
            }
            supabase.table("graph_data").upsert(data, on_conflict="user_id").execute()
        except Exception as e:
            print(f"Error saving graph_data: {e}")
    
    @staticmethod
    def get_user_analysis(user_id: str) -> List[Dict]:
        """Fetch all API analysis for a user"""
        try:
            result = supabase.table("api_analysis").select("*").eq("user_id", user_id).execute()
            return result.data
        except Exception as e:
            print(f"Error fetching api_analysis: {e}")
            return []
    
    @staticmethod
    def get_user_graph_data(user_id: str) -> Dict:
        """Fetch graph data for a user"""
        try:
            result = supabase.table("graph_data").select("*").eq("user_id", user_id).execute()
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
            query = supabase.table("risk_alerts").select("*").eq("user_id", user_id)
            if unresolved_only:
                query = query.eq("is_resolved", False)
            result = query.execute()
            return result.data
        except Exception as e:
            print(f"Error fetching risk_alerts: {e}")
            return []

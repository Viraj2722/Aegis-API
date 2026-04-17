from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from risk_detector import RiskDetectionModel
from supabase_ops import SupabaseOps
import pandas as pd
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

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

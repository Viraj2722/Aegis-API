from agents import app
from agents import app
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
        analysis_df = _annotate_traffic_analysis(analysis_df)
        
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
                "sudden_spike_count": len(analysis_df[analysis_df["traffic_pattern"] == "sudden spike"]),
                "error_heavy_count": len(analysis_df[analysis_df["traffic_pattern"] == "error-heavy burst"]),
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

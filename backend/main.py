from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from data_generator import generate_mock_logs
from ml_pipeline import AegisDetector
import json
import pandas as pd
from typing import List, Dict, Any

app = FastAPI(title="AegisAPI Backend", description="AI Zombie API Detector")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend domain
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize data and detector in memory for demonstration
raw_logs = generate_mock_logs(5000)
detector = AegisDetector()

@app.post("/api/upload")
async def upload_logs(logs: List[Dict[str, Any]]):
    global raw_logs
    try:
        df = pd.DataFrame(logs)
        
        # Schema-Agnostic Log Parser (Auto-detects columns via fuzzy heuristic mapping)
        heuristic_map = {
            "endpoint": ["api", "path", "url", "uri", "route", "endpoint"],
            "status_code": ["response_code", "status", "code", "http_status"],
            "response_time_ms": ["response_time", "latency", "duration", "time_ms"],
            "payload_size_bytes": ["payload_size", "bytes", "size", "length"],
            "timestamp": ["time", "date", "created_at", "timestamp"]
        }
        
        actual_columns = {col.lower(): col for col in df.columns}
        for target_col, aliases in heuristic_map.items():
            for alias in aliases:
                if alias in actual_columns and target_col not in df.columns:
                    df.rename(columns={actual_columns[alias]: target_col}, inplace=True)
                    break
        
        # Ensure required columns exist after mapping
        required_cols = ['endpoint', 'status_code', 'response_time_ms', 'timestamp']
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise ValueError(f"Uploaded logs are missing required fields: {', '.join(missing)}")
            
        # Coerce numeric columns to prevent ML crashes when parsing CSV strings
        for col in ['status_code', 'response_time_ms', 'payload_size_bytes']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
                
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp']).dt.tz_localize(None)
        raw_logs = df
        return {"message": "Logs uploaded successfully", "count": len(df)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/reset-demo")
def reset_demo():
    global raw_logs
    raw_logs = generate_mock_logs(5000)
    return {"message": "Demo data restored"}

@app.get("/api/analysis")
def get_analysis():
    features = detector.extract_features(raw_logs)
    results = detector.detect(features)
    
    # Convert dates to string for JSON serialization
    results['last_seen'] = results['last_seen'].astype(str)
    
    # Calculate traffic volume
    is_suspicious = (results['error_rate'] > 0.50) & (results['avg_response_time'] > 300)

    metrics = {
        "total_apis": len(results),
        "zombie_apis": int(results['is_zombie'].sum()),
        "critical_risk": int((results['risk_level'] == 'Critical').sum()),
        "suspicious_apis": int(is_suspicious.sum()),
        "total_logs": len(raw_logs),
        "zombie_traffic": int(results.loc[results['is_zombie'], 'call_count'].sum()) if results['is_zombie'].any() else 0,
        "suspicious_traffic": int(results.loc[is_suspicious, 'call_count'].sum()) if is_suspicious.any() else 0
    }
    
    return {
        "metrics": metrics,
        "api_data": results.to_dict(orient='records')
    }

@app.get("/api/graph")
def get_graph_data():
    features = detector.extract_features(raw_logs)
    results = detector.detect(features)
    
    nodes = [{"id": "gateway", "data": {"label": "API Gateway\n(External Entry)"}, "position": {"x": 400, "y": 0}, "type": "input", "style": {"background": "#1e293b", "color": "#f8fafc", "border": "1px solid #334155"}}]
    edges = []
    
    external_nodes = []
    internal_nodes = []
    
    # Build Microservice Topography
    for idx, row in results.iterrows():
        node_id = row['endpoint']
        is_risky = row['risk_level'] in ['High', 'Critical']
        
        # Calculate visual risk gradient
        risk_intensity = int((row['risk_score'] / 100) * 255)
        bg_color = f"rgba({risk_intensity}, {max(0, 200 - risk_intensity)}, 50, 0.15)"
        border_color = f"rgba({risk_intensity}, {max(0, 200 - risk_intensity)}, 50, 1)"
        
        # Heuristic to separate external facing APIs vs internal microservices
        if "internal" in node_id or "legacy" in node_id or "debug" in node_id:
            internal_nodes.append((node_id, is_risky, row['is_zombie']))
            y_pos = 300 + (len(internal_nodes) * 60)
            x_pos = 200 + (len(internal_nodes) % 3 * 200)
        else:
            external_nodes.append((node_id, is_risky, row['is_zombie']))
            y_pos = 150
            x_pos = 100 + (len(external_nodes) * 200)
        
        nodes.append({
            "id": node_id,
            "data": {
                "label": f"{node_id}\nRisk: {row['risk_score']}",
                "is_risky": is_risky
            },
            "position": {"x": x_pos, "y": y_pos},
            "style": {"background": bg_color, "border": f"2px solid {border_color}", "borderRadius": "8px", "padding": "10px", "color": "#f8fafc", "fontWeight": "bold", "boxShadow": f"0 0 15px {bg_color}"}
        })
        
    # Connect Gateway to External APIs
    for ext_id, is_risky, is_zombie in external_nodes:
        edges.append({
            "id": f"e-gateway-{ext_id}",
            "source": "gateway",
            "target": ext_id,
            "animated": not is_zombie,
            "data": { "is_risky": is_risky }
        })
        
    # Simulate Lateral Movement Connections (External -> Internal)
    kill_chain_edges = []
    for i, (int_id, int_risky, int_zombie) in enumerate(internal_nodes):
        # Link to a corresponding external node
        ext_id, ext_risky, ext_zombie = external_nodes[i % len(external_nodes)] if external_nodes else ("gateway", False, False)
        
        # Define Kill Chain: External Suspicious -> Internal Zombie/Vulnerable
        is_lateral_breach = ext_risky and int_risky
        if is_lateral_breach:
            kill_chain_edges.append(f"e-lateral-{ext_id}-{int_id}")
            
        edges.append({
            "id": f"e-lateral-{ext_id}-{int_id}",
            "source": ext_id,
            "target": int_id,
            "animated": not int_zombie,
            "data": { "is_risky": is_lateral_breach, "is_kill_chain": is_lateral_breach }
        })

    return {"nodes": nodes, "edges": edges, "kill_chain": kill_chain_edges}

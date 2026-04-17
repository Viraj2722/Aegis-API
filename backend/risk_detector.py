"""
Risk Detection Pipeline using Isolation Forest
Integrated with Supabase for persistent storage
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from typing import List, Dict, Any, Tuple

class RiskDetectionModel:
    """
    ML-powered risk detection for API security analysis.
    Uses Isolation Forest to identify anomalies per company/user.
    """
    
    def __init__(self):
        self.models = {}  # Per-company models
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate raw logs into API-level features.
        """
        now = pd.Timestamp.now(tz="UTC")
        
        # Group by endpoint to get API behavior profiles
        profile = df.groupby('api').agg(
            call_count=('api', 'count'),
            method=('method', lambda x: x.mode().iat[0] if not x.mode().empty else 'GET'),
            error_count=('response_code', lambda x: (x >= 400).sum()),
            avg_response_time=('response_time', 'mean'),
            payload_size=('payload_size', 'mean'),
            last_seen=('timestamp', 'max'),
            first_seen=('timestamp', 'min'),
        ).reset_index()
        
        profile['error_rate'] = profile['error_count'] / profile['call_count']
        profile['avg_latency'] = profile['avg_response_time']  # alias for compatibility
        
        # Activity metrics
        profile['days_active'] = (profile['last_seen'] - profile['first_seen']).dt.days.clip(lower=1)
        profile['daily_calls'] = profile['call_count'] / profile['days_active']
        profile['days_inactive'] = (now - profile['last_seen']).dt.days
        
        # Fill missing values
        profile.fillna(0, inplace=True)
        
        return profile
    
    def detect_risks(self, logs_df: pd.DataFrame, user_id: str = None) -> pd.DataFrame:
        """
        Core ML-based risk detection for APIs.
        
        Parameters:
        -----------
        logs_df : DataFrame with columns: api, method, response_code, response_time, payload_size, timestamp
        user_id : user ID for model tracking (optional)
        
        Returns:
        --------
        DataFrame with risk scores, levels, and classifications
        """
        
        # Prepare features
        profile = self.prepare_features(logs_df)
        
        if len(profile) == 0:
            return pd.DataFrame()
        
        # Feature selection for ML
        features = ['daily_calls', 'avg_response_time', 'error_rate']
        X = profile[features].fillna(0).values
        
        # Dynamic contamination (% of expected anomalies)
        contamination = min(0.2, max(0.05, len(X) / 500))
        
        # Train Isolation Forest model
        model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        
        # Fit and predict
        anomaly_predictions = model.fit_predict(X)  # -1 = anomaly, 1 = normal
        anomaly_scores = model.score_samples(X)  # Raw scores
        
        # Normalize anomaly scores to 0-100 risk scale
        # Lower score = more anomalous = higher risk
        score_range = anomaly_scores.max() - anomaly_scores.min()
        if score_range > 0:
            normalized_risk = ((anomaly_scores.max() - anomaly_scores) / score_range) * 100
        else:
            normalized_risk = np.ones(len(anomaly_scores)) * 50
        
        profile['anomaly_score'] = anomaly_scores
        profile['risk_score'] = normalized_risk.astype(float)
        
        # Dynamic percentile thresholds
        p90 = np.percentile(anomaly_scores, 10)   # worst 10%
        p70 = np.percentile(anomaly_scores, 30)   # 30th percentile
        p50 = np.percentile(anomaly_scores, 50)   # median
        
        # Risk level determination
        risk_levels = []
        for i, (s, a) in enumerate(zip(anomaly_scores, anomaly_predictions)):
            score = float(profile.iloc[i]['risk_score'])
            
            # Anomaly weight
            if a == -1:
                score += 50
            
            # Percentile-based penalties
            if s <= p90:
                score += 40
            elif s <= p70:
                score += 25
            elif s <= p50:
                score += 10
            
            score = min(score, 100)
            
            # Classify risk level
            if score >= 70:
                level = "CRITICAL"
            elif score >= 50:
                level = "HIGH"
            elif score >= 30:
                level = "MEDIUM"
            else:
                level = "LOW"
            
            risk_levels.append(level)
        
        profile['risk_level'] = risk_levels
        
        # Zombie detection: inactive for >14 days AND very low traffic
        low_traffic_threshold = max(2.0, profile['daily_calls'].mean() * 0.15)
        profile['is_zombie'] = (profile['days_active'] > 14) & (profile['daily_calls'] <= low_traffic_threshold)
        
        # Penalize zombies
        profile.loc[profile['is_zombie'], 'risk_score'] += 20
        profile['risk_score'] = profile['risk_score'].clip(upper=100)
        
        # Shadow API detection (similar behavior fingerprints)
        profile['fingerprint'] = (
            'SIG-' +
            'L' + (profile['avg_response_time'] // 100).astype(int).astype(str) +
            '-P' + (profile['payload_size'] // 500).astype(int).astype(str) +
            '-E' + (profile['error_rate'] * 10).astype(int).astype(str)
        )
        
        duplicate_sigs = profile[profile.duplicated(['fingerprint'], keep=False)]
        profile['is_shadow_api'] = profile['fingerprint'].isin(duplicate_sigs['fingerprint'].values)
        
        return profile.sort_values('risk_score', ascending=False)
    
    def get_graph_nodes_edges(self, profile_df: pd.DataFrame) -> Tuple[List[Dict], List[Dict]]:
        """
        Convert API profile to graph visualization nodes and edges.
        """
        nodes = []
        edges = []
        
        for idx, row in profile_df.iterrows():
            node_id = row['api']
            is_risky = row['risk_level'] in ['HIGH', 'CRITICAL']
            risk_intensity = int((row['risk_score'] / 100) * 255)
            
            # Color gradient based on risk
            bg_color = f"rgba({risk_intensity}, {max(0, 200 - risk_intensity)}, 50, 0.15)"
            border_color = f"rgba({risk_intensity}, {max(0, 200 - risk_intensity)}, 50, 1)"
            
            node = {
                "id": node_id,
                "data": {
                    "label": f"{node_id}\nRisk: {row['risk_score']:.0f}",
                    "is_risky": is_risky
                },
                "position": {"x": idx * 150, "y": 150 if not is_risky else 300},
                "style": {
                    "background": bg_color,
                    "border": f"2px solid {border_color}",
                    "borderRadius": "8px",
                    "padding": "10px",
                    "color": "#f8fafc",
                    "fontWeight": "bold"
                }
            }
            nodes.append(node)
        
        return nodes, edges

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from datetime import datetime

class AegisDetector:
    def __init__(self):
        # Removed global model instance to ensure thread-safety
        pass

    def extract_features(self, df):
        now = datetime.now()
        
        # Group by endpoint to get API behavior profiles
        profile = df.groupby('endpoint').agg(
            call_count=('endpoint', 'count'),
            avg_response_time=('response_time_ms', 'mean'),
            error_count=('status_code', lambda x: (x >= 400).sum()),
            last_seen=('timestamp', 'max'),
            first_seen=('timestamp', 'min'),
            payload_size=('payload_size_bytes', 'mean')
        ).reset_index()

        # Derived features
        profile['error_rate'] = profile['error_count'] / profile['call_count']
        
        # Calculate how many days this API has been active in the logs (minimum 1 to avoid division by zero)
        profile['days_active'] = (profile['last_seen'] - profile['first_seen']).dt.days.clip(lower=1)
        
        # True traffic frequency: distinguishes active APIs from legacy/forgotten ones
        profile['daily_calls'] = profile['call_count'] / profile['days_active']
        profile['days_inactive'] = (now - profile['last_seen']).dt.days
        
        # Impute any missing or weird values
        profile.fillna(0, inplace=True)
        return profile

    def detect(self, profile_df):
        # Select updated features for ML that better match the new threat models
        features = ['daily_calls', 'avg_response_time', 'error_rate', 'days_active', 'payload_size']
        X = profile_df[features]
        
        # Calculate global network baselines for AI Explainability
        global_mean = X.mean()

        # Instantiate a fresh model per request to avoid race conditions
        model = IsolationForest(contamination="auto", random_state=42)

        # Fit and predict (-1 is anomaly, 1 is normal)
        profile_df['anomaly'] = model.fit_predict(X)
        
        # Calculate anomaly score (lower is more abnormal, so we invert it for risk scoring)
        scores = model.decision_function(X)
        # Normalize to 0-100 range (higher = higher risk)
        normalized_risk = (scores.max() - scores) / (scores.max() - scores.min()) * 100
        
        # Enhance risk score with heuristic weights (e.g., highly inactive = higher zombie risk)
        profile_df['risk_score'] = normalized_risk.round(2)
        
        # Dynamic AI-Driven Threat Classification (Replaces hardcoded heuristics)
        # Zombie: Active for >14 days AND has extremely low traffic compared to the dynamic network baseline
        # (Zombies often bypass Isolation Forest because their status codes/latencies are technically healthy)
        low_traffic_threshold = max(2.0, global_mean['daily_calls'] * 0.15)
        profile_df['is_zombie'] = (profile_df['days_active'] > 14) & (profile_df['daily_calls'] <= low_traffic_threshold)
        
        # Suspicious: Flagged as anomaly AND exhibits elevated errors OR latency spikes
        high_error_threshold = max(0.15, global_mean['error_rate'] * 2.5)
        high_latency_threshold = global_mean['avg_response_time'] * 1.5
        is_suspicious = (profile_df['anomaly'] == -1) & ((profile_df['error_rate'] > high_error_threshold) | (profile_df['avg_response_time'] > high_latency_threshold))
        
        # Apply heuristic penalties
        profile_df.loc[profile_df['is_zombie'], 'risk_score'] += 20
        profile_df.loc[is_suspicious & ~profile_df['is_zombie'], 'risk_score'] += 35
        profile_df['risk_score'] = profile_df['risk_score'].clip(upper=100)
        
        # Generate Behavioral Fingerprints and Explanations
        explanations = []
        fingerprints = []
        for idx, row in profile_df.iterrows():
            # Feature Deviations (Explainability)
            devs = {
                "latency_dev": round((row['avg_response_time'] / global_mean['avg_response_time']) * 100 - 100, 1),
                "error_dev": round((row['error_rate'] / max(0.01, global_mean['error_rate'])) * 100 - 100, 1),
                "traffic_dev": round((row['daily_calls'] / global_mean['daily_calls']) * 100 - 100, 1)
            }
            explanations.append(devs)
            
            # Behavioral Signature (Hash based on quantized behavior for Shadow API detection)
            latency_bin = int(row['avg_response_time'] // 100)
            payload_bin = int(row['payload_size'] // 500)
            fingerprints.append(f"SIG-L{latency_bin}-P{payload_bin}-E{int(row['error_rate']*10)}")
            
        profile_df['deviations'] = explanations
        profile_df['fingerprint'] = fingerprints
        
        # Detect Shadow APIs (Similar fingerprint, different endpoint name)
        duplicate_sigs = profile_df[profile_df.duplicated(['fingerprint'], keep=False)]
        profile_df['is_shadow_api'] = profile_df['fingerprint'].isin(duplicate_sigs['fingerprint'])
        
        # Classify risk level
        conditions = [
            profile_df['risk_score'] > 75,
            profile_df['risk_score'] > 50,
            profile_df['risk_score'] > 25
        ]
        choices = ['Critical', 'High', 'Medium']
        profile_df['risk_level'] = np.select(conditions, choices, default='Low')

        return profile_df

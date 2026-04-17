-- Supabase Schema for Aegis API Security Platform

-- Privacy-first: raw uploaded logs are intentionally NOT persisted.
DROP TABLE IF EXISTS logs CASCADE;

-- 1. API Analysis Results (aggregated analysis per API)
CREATE TABLE IF NOT EXISTS api_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  call_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_rate FLOAT DEFAULT 0,
  avg_response_time FLOAT DEFAULT 0,
  avg_latency FLOAT DEFAULT 0,
  payload_size FLOAT DEFAULT 0,
  days_active INTEGER DEFAULT 0,
  days_inactive INTEGER DEFAULT 0,
  daily_calls FLOAT DEFAULT 0,
  last_seen TIMESTAMP WITH TIME ZONE,
  first_seen TIMESTAMP WITH TIME ZONE,
  risk_score FLOAT DEFAULT 0, -- 0-100
  risk_level TEXT DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
  is_zombie BOOLEAN DEFAULT FALSE,
  is_shadow_api BOOLEAN DEFAULT FALSE,
  anomaly_score FLOAT DEFAULT 0,
  fingerprint TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- 2. Risk Alerts (high-risk findings)
CREATE TABLE IF NOT EXISTS risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_analysis_id UUID REFERENCES api_analysis(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- ZOMBIE, SHADOW, ANOMALY, HIGH_ERROR_RATE, HIGH_LATENCY
  severity TEXT NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
  title TEXT NOT NULL,
  description TEXT,
  recommendation TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Upload Sessions (track upload metadata only)
CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_count INTEGER NOT NULL,
  processed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PROCESSING', -- PROCESSING, COMPLETED, FAILED
  error_message TEXT,
  analysis_results JSONB, -- Store summary stats
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Graph Data Cache (for performance - stores network topology)
CREATE TABLE IF NOT EXISTS graph_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nodes JSONB NOT NULL, -- Array of node objects
  edges JSONB NOT NULL, -- Array of edge objects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_analysis_user_risk ON api_analysis(user_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_api_analysis_user_updated ON api_analysis(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_user_unresolved ON risk_alerts(user_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_severity ON risk_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_status ON upload_sessions(user_id, status);

-- Enable RLS (Row Level Security)
ALTER TABLE api_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
DROP POLICY IF EXISTS api_analysis_user_policy ON api_analysis;
CREATE POLICY api_analysis_user_policy ON api_analysis
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS risk_alerts_user_policy ON risk_alerts;
CREATE POLICY risk_alerts_user_policy ON risk_alerts
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS upload_sessions_user_policy ON upload_sessions;
CREATE POLICY upload_sessions_user_policy ON upload_sessions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS graph_data_user_policy ON graph_data;
CREATE POLICY graph_data_user_policy ON graph_data
  FOR ALL USING (auth.uid() = user_id);

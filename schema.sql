-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.api_analysis (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  call_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  error_rate double precision DEFAULT 0,
  avg_response_time double precision DEFAULT 0,
  avg_latency double precision DEFAULT 0,
  payload_size double precision DEFAULT 0,
  days_active integer DEFAULT 0,
  days_inactive integer DEFAULT 0,
  daily_calls double precision DEFAULT 0,
  last_seen timestamp with time zone,
  first_seen timestamp with time zone,
  risk_score double precision DEFAULT 0,
  risk_level text DEFAULT 'LOW'::text,
  is_zombie boolean DEFAULT false,
  is_shadow_api boolean DEFAULT false,
  anomaly_score double precision DEFAULT 0,
  fingerprint text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_analysis_pkey PRIMARY KEY (id),
  CONSTRAINT api_analysis_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.graph_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nodes jsonb NOT NULL,
  edges jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT graph_data_pkey PRIMARY KEY (id),
  CONSTRAINT graph_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  company_name text,
  role text,
  avatar_url text,
  is_admin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  country text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.risk_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  api_analysis_id uuid,
  alert_type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  description text,
  recommendation text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT risk_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT risk_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT risk_alerts_api_analysis_id_fkey FOREIGN KEY (api_analysis_id) REFERENCES public.api_analysis(id)
);

CREATE TABLE public.api_mitigations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  api_analysis_id uuid,
  endpoint text NOT NULL,
  method text,
  risk_level text,
  llm_provider text NOT NULL DEFAULT 'groq'::text,
  llm_model text,
  prompt_payload jsonb,
  context_payload jsonb,
  mitigation_summary text,
  mitigation_steps jsonb,
  raw_response text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_mitigations_pkey PRIMARY KEY (id),
  CONSTRAINT api_mitigations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT api_mitigations_api_analysis_id_fkey FOREIGN KEY (api_analysis_id) REFERENCES public.api_analysis(id)
);
-- System Settings Table (for super_admin to configure AI and other settings)
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist (safe for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'openai_api_key') THEN
    ALTER TABLE system_settings ADD COLUMN openai_api_key TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'ai_model') THEN
    ALTER TABLE system_settings ADD COLUMN ai_model TEXT DEFAULT 'gpt-4o-mini';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'ai_parsing_enabled') THEN
    ALTER TABLE system_settings ADD COLUMN ai_parsing_enabled BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'ai_fallback_threshold') THEN
    ALTER TABLE system_settings ADD COLUMN ai_fallback_threshold DECIMAL DEFAULT 0.6;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'max_ai_requests_per_day') THEN
    ALTER TABLE system_settings ADD COLUMN max_ai_requests_per_day INTEGER DEFAULT 100;
  END IF;
END $$;

-- Insert default settings (only if table is empty)
INSERT INTO system_settings (id, ai_parsing_enabled, ai_model)
SELECT gen_random_uuid(), false, 'gpt-4o-mini'
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- AI Parsing Logs (for monitoring usage and costs)
CREATE TABLE IF NOT EXISTS ai_parsing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  row_count INTEGER,
  model_used TEXT,
  success BOOLEAN DEFAULT false,
  confidence DECIMAL,
  error_message TEXT,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON ai_parsing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_school ON ai_parsing_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_date ON ai_parsing_logs(created_at);

-- RLS Policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_parsing_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admin can view/edit system settings
CREATE POLICY "Super admin can manage system settings"
ON system_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Users can view their own AI logs, super_admin can view all
CREATE POLICY "Users can view their own AI logs"
ON ai_parsing_logs
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Only authenticated users can insert AI logs (handled by API)
CREATE POLICY "Authenticated users can insert AI logs"
ON ai_parsing_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT ALL ON system_settings TO authenticated;
GRANT ALL ON ai_parsing_logs TO authenticated;

COMMENT ON TABLE system_settings IS 'Global system configuration including AI API keys';
COMMENT ON TABLE ai_parsing_logs IS 'Logs all AI-assisted file parsing for monitoring and billing';

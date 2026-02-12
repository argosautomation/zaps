-- Migration: 007_add_provider_keys
-- Description: Create table for storing encrypted LLM provider keys
-- Created: 2026-02-11

CREATE TABLE provider_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Provider details
    provider VARCHAR(50) NOT NULL, -- e.g. 'openai', 'anthropic', 'deepseek', 'gemini'
    encrypted_key TEXT NOT NULL,
    
    -- Status
    enabled BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, provider)
);

-- Trigger for updated_at
CREATE TRIGGER update_provider_keys_updated_at 
    BEFORE UPDATE ON provider_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_provider_keys_lookup ON provider_keys(tenant_id, provider);

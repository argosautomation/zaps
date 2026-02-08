-- Migration: 001_initial_schema
-- Description: Create initial multi-tenant database schema
-- Created: 2026-02-04

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table (organizations)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Billing
    stripe_customer_id VARCHAR(255) UNIQUE,
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'enterprise')),
    
    -- Quotas
    monthly_quota INTEGER DEFAULT 1000,
    current_usage INTEGER DEFAULT 0,
    quota_reset_at TIMESTAMP WITH TIME ZONE DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month'),
    overage_allowed BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Security
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP WITH TIME ZONE
);

-- API Keys table (metadata only, actual keys stored in Redis)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Key identification
    key_hash VARCHAR(255) UNIQUE NOT NULL, -- SHA256 of gk_...
    key_prefix VARCHAR(20) NOT NULL, -- First 12 chars for display (e.g., "gk_abc123...")
    name VARCHAR(255) NOT NULL,
    
    -- Usage tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,
    request_count BIGINT DEFAULT 0,
    
    -- Status
    enabled BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT
);

-- Usage logs (hourly aggregates for analytics)
CREATE TABLE usage_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    
    -- Time bucket (rounded to hour)
    hour_bucket TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Metrics
    request_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_latency_ms INTEGER,
    total_tokens_processed BIGINT DEFAULT 0,
    
    -- PII breakdown
    pii_events JSONB DEFAULT '{}'::jsonb, -- {"email": 50, "phone": 20, "api_key": 10}
    
    -- Unique constraint on tenant + hour + api_key
    UNIQUE(tenant_id, api_key_id, hour_bucket)
);

-- Subscriptions table (Stripe integration)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Stripe identifiers
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    
    -- Plan details
    plan VARCHAR(50) CHECK (plan IN ('starter', 'pro', 'enterprise')),
    status VARCHAR(50) CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
    
    -- Billing period
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    canceled_at TIMESTAMP WITH TIME ZONE
);

-- Audit log for important events
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL, -- e.g., 'user.login', 'api_key.created', 'subscription.upgraded'
    event_data JSONB DEFAULT '{}'::jsonb,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_enabled ON api_keys(enabled) WHERE enabled = TRUE;

CREATE INDEX idx_usage_tenant_time ON usage_logs(tenant_id, hour_bucket DESC);
CREATE INDEX idx_usage_api_key_time ON usage_logs(api_key_id, hour_bucket DESC);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type, created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to reset monthly quota
CREATE OR REPLACE FUNCTION reset_monthly_quota()
RETURNS void AS $$
BEGIN
    UPDATE tenants
    SET current_usage = 0,
        quota_reset_at = DATE_TRUNC('month', NOW() + INTERVAL '1 month')
    WHERE quota_reset_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE tenants IS 'Organizations using the Zaps.ai platform';
COMMENT ON TABLE users IS 'Individual users belonging to tenants';
COMMENT ON TABLE api_keys IS 'Gateway API keys (gk_prefix) - actual keys stored in Redis';
COMMENT ON TABLE usage_logs IS 'Aggregated hourly usage statistics';
COMMENT ON TABLE subscriptions IS 'Stripe subscription details';
COMMENT ON TABLE audit_logs IS 'Audit trail for security and compliance';

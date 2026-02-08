-- Migration: 001_initial_schema (down)
-- Description: Rollback initial schema

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;

DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS reset_monthly_quota();

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS usage_logs;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;

DROP EXTENSION IF EXISTS "uuid-ossp";

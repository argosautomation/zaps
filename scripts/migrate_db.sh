#!/bin/bash
# scripts/migrate_db.sh
# Usage: ./migrate_db.sh <lightsail_host> <lightsail_db_password>

LIGHTSAIL_HOST=$1
LIGHTSAIL_USER="postgres"
LIGHTSAIL_DB="zaps"
LIGHTSAIL_PASSWORD=$2

if [ -z "$LIGHTSAIL_HOST" ] || [ -z "$LIGHTSAIL_PASSWORD" ]; then
    echo "Usage: ./scripts/migrate_db.sh <lightsail_host> <lightsail_db_password>"
    exit 1
fi

echo "🔍 Retrieval of RDS Credentials from Copilot..."
# We can get the secret, but the host/port comes from the addon output or `copilot svc show`
# For now, we will ask the user to input the RDS endpoint after deployment, 
# or we can try to fetch it via AWS CLI if we know the stack name.
# Let's assume we'll run this interactively or pass RDS_HOST as env var.

if [ -z "$RDS_HOST" ]; then
    echo "⚠️  RDS_HOST environment variable not set."
    echo "Please set RDS_HOST=<your-rds-endpoint> and run again."
    # Try to fetch from copilot
    # RDS_HOST=$(aws cloudformation describe-stacks --stack-name zaps-production-backend-addons --query "Stacks[0].Outputs[?OutputKey=='DBHOST'].OutputValue" --output text)
    exit 1
fi

RDS_USER="postgres"
RDS_DB="zaps"
# RDS_PASSWORD is in SSM, we can fetch it or ask user.
# AWS_PROFILE=default aws ssm get-parameter --name /copilot/zaps/production/secrets/DB_PASSWORD --with-decryption --query Parameter.Value --output text

echo "🚀 Starting Migration..."
echo "1️⃣  Dumping data from Lightsail ($LIGHTSAIL_HOST)..."
PGPASSWORD=$LIGHTSAIL_PASSWORD pg_dump -h $LIGHTSAIL_HOST -U $LIGHTSAIL_USER -d $LIGHTSAIL_DB --no-owner --no-acl --clean --if-exists --verbose --file dump.sql

if [ $? -ne 0 ]; then
    echo "❌ Dump failed!"
    exit 1
fi

echo "2️⃣  Restoring data to RDS ($RDS_HOST)..."
# We might need the RDS password here.
echo "Enter RDS Password:"
read -s RDS_PASSWORD

PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USER -d $RDS_DB < dump.sql

if [ $? -ne 0 ]; then
    echo "❌ Restore failed!"
    exit 1
fi

echo "✅ Migration Complete!"

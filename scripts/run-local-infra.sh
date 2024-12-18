#!/bin/bash
set -e

# Function to stop and clean up the services
echo "Stopping and cleaning up the container..."
docker-compose -f docker-compose-local.yml down -v
echo "Cleanup completed."

echo "Starting container..."
docker-compose -f docker-compose-local.yml up -d

# Wait for the conntainer to be ready (adjust the time as needed)
echo "Waiting for the container..."
sleep 10

echo "Deploying Prisma migrations to the test database..."
npx prisma generate
npx prisma migrate deploy --schema=./prisma/schema.prisma

export NODE_ENV="local"

echo "Local infrastructure started"
echo "Configuring localstack..."
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_REGION="us-east-1"
export AWS_ENDPOINT_URL="http://localhost:4566"
export AWS_PAGER=""
export LOG_GROUP_NAME_TRANSCENDENCE="data-insights-staging"
export LOG_STREAM_NAME_TRANSCENDENCE="data-insights-staging"

echo "Creating DynamoDB tables..."

echo "Messages..."
aws dynamodb create-table --cli-input-json file://${PWD}/dynamo/message.json

echo "Dynamo tables created!"

echo "Local infrastructure started!"






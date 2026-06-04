#!/bin/bash
# LocalStack ready-hook: creates the S3 bucket required by the app if it
# does not already exist. Runs once after LocalStack reports ready.
# Bucket name is taken from $AWS_S3_BUCKET (set on the localstack service).
set -euo pipefail

BUCKET="${AWS_S3_BUCKET:-properties}"
REGION="${AWS_DEFAULT_REGION:-eu-central-1}"

echo "[localstack-init] Ensuring S3 bucket '$BUCKET' exists in region '$REGION'..."

if awslocal s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  echo "[localstack-init] Bucket '$BUCKET' already exists, skipping creation."
  exit 0
fi

if [ "$REGION" = "us-east-1" ]; then
  awslocal s3api create-bucket --bucket "$BUCKET"
else
  awslocal s3api create-bucket \
    --bucket "$BUCKET" \
    --create-bucket-configuration "LocationConstraint=$REGION"
fi

echo "[localstack-init] Created bucket '$BUCKET'."

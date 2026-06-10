#!/bin/bash
# LocalStack ready-hook: creates S3 buckets required by the app.
# Runs once after LocalStack reports ready.
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-eu-central-1}"
BUCKETS="${LOCALSTACK_S3_BUCKETS:-properties avatars}"

echo "[localstack-init] Ensuring S3 buckets exist in region '$REGION': $BUCKETS"

for BUCKET in $BUCKETS; do
  if awslocal s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
    echo "[localstack-init] Bucket '$BUCKET' already exists."
    continue
  fi
  if [ "$REGION" = "us-east-1" ]; then
    awslocal s3api create-bucket --bucket "$BUCKET"
  else
    awslocal s3api create-bucket \
      --bucket "$BUCKET" \
      --create-bucket-configuration "LocationConstraint=$REGION"
  fi
  echo "[localstack-init] Created bucket '$BUCKET'."
done

#!/bin/bash
# Creates LocalStack S3 buckets from the host (LocalStack must be running on :4566).
set -euo pipefail

ENDPOINT="${AWS_ENDPOINT_URL:-http://localhost:4566}"
REGION="${AWS_REGION:-eu-central-1}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
BUCKETS="${LOCALSTACK_S3_BUCKETS:-properties avatars}"

aws_cli() {
  if command -v awslocal >/dev/null 2>&1; then
    awslocal "$@"
    return
  fi
  aws --endpoint-url="$ENDPOINT" "$@"
}

echo "[localstack-create-buckets] Endpoint: $ENDPOINT region: $REGION buckets: $BUCKETS"

for BUCKET in $BUCKETS; do
  if aws_cli s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
    echo "[localstack-create-buckets] Bucket '$BUCKET' already exists."
    continue
  fi
  if [ "$REGION" = "us-east-1" ]; then
    aws_cli s3api create-bucket --bucket "$BUCKET"
  else
    aws_cli s3api create-bucket \
      --bucket "$BUCKET" \
      --create-bucket-configuration "LocationConstraint=$REGION"
  fi
  echo "[localstack-create-buckets] Created bucket '$BUCKET'."
done

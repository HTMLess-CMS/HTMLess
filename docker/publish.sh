#!/bin/bash
set -euo pipefail

# ─── Build and push HTMLess Docker images to Docker Hub ───
# Usage: ./docker/publish.sh [version]
#
# Prerequisites:
#   docker login
#
# Examples:
#   ./docker/publish.sh 0.1.0
#   ./docker/publish.sh          # tags as "latest" only

VERSION=${1:-latest}
REPO="htmless"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building HTMLess Docker images (version: $VERSION)..."
echo ""

# Build images
echo "Building $REPO/api:$VERSION..."
docker build -f "$ROOT/Dockerfile.api" -t "$REPO/api:$VERSION" -t "$REPO/api:latest" "$ROOT"

echo "Building $REPO/admin:$VERSION..."
docker build -f "$ROOT/Dockerfile.admin" -t "$REPO/admin:$VERSION" -t "$REPO/admin:latest" "$ROOT"

echo "Building $REPO/worker:$VERSION..."
docker build -f "$ROOT/Dockerfile.worker" -t "$REPO/worker:$VERSION" -t "$REPO/worker:latest" "$ROOT"

echo ""
echo "Pushing images to Docker Hub..."
echo ""

# Push to Docker Hub
docker push "$REPO/api:$VERSION"
docker push "$REPO/api:latest"

docker push "$REPO/admin:$VERSION"
docker push "$REPO/admin:latest"

docker push "$REPO/worker:$VERSION"
docker push "$REPO/worker:latest"

echo ""
echo "Published:"
echo "  $REPO/api:$VERSION"
echo "  $REPO/admin:$VERSION"
echo "  $REPO/worker:$VERSION"
echo ""
echo "Done."

#!/usr/bin/env bash
# Run the backend (pytest) and frontend (node:test) tests in throwaway containers.
# The backend tests use their own temporary SQLite file; the production database is never mounted.
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose build -q backend
echo "== backend"
docker run --rm -v "$PWD/backend:/src:ro" -w /src gridironscore-backend \
  sh -c "pip install -q -r requirements-dev.txt 2>/dev/null && python -m pytest -q -p no:cacheprovider tests"
echo "== frontend"
docker run --rm -v "$PWD/frontend:/src:ro" -w /src node:20-alpine node --test tests/

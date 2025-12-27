#!/bin/sh
set -e

# Set CI=true to avoid interactive prompts
export CI=true

# Install dependencies if node_modules is empty or lock file has changed
if [ ! -d "node_modules/.pnpm" ]; then
  echo "Installing dependencies..."
  pnpm install
elif [ "pnpm-lock.yaml" -nt "node_modules/.pnpm/lock.yaml" ] 2>/dev/null; then
  echo "pnpm-lock.yaml has changed, updating dependencies..."
  pnpm install
fi

exec "$@"

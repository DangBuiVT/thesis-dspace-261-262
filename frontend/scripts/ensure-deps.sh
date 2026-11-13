#!/bin/sh
# Docker keeps /app/node_modules in an anonymous volume across `docker compose up`,
# so dependencies added on another branch never reach the container on their own.
# Reinstall whenever package-lock.json differs from the one last installed, then run the command.
set -e
hash=$(md5sum package-lock.json | cut -d" " -f1)
if [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$hash" ]; then
  echo "[ensure-deps] package-lock.json changed, running npm install"
  npm install --no-save --no-audit --no-fund
  echo "$hash" > node_modules/.lock-hash
fi
exec "$@"

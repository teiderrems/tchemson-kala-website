#!/bin/sh
set -eu

PORT="${PORT:-8080}"

sed "s/__PORT__/${PORT}/g" /etc/nginx/nginx.conf.template > /tmp/nginx.conf

uvicorn app.main:app --host 127.0.0.1 --port 8000 &
api_pid="$!"

i=0
while [ "$i" -lt 60 ]; do
  i=$((i + 1))

  if ! kill -0 "$api_pid" 2>/dev/null; then
    wait "$api_pid"
    exit 1
  fi

  if python -c "import socket; s=socket.socket(); s.settimeout(1); s.connect(('127.0.0.1', 8000)); s.close()" 2>/dev/null; then
    break
  fi

  sleep 1
done

if [ "$i" -ge 60 ]; then
  echo "FastAPI did not start listening on 127.0.0.1:8000" >&2
  kill "$api_pid" 2>/dev/null || true
  wait "$api_pid" 2>/dev/null || true
  exit 1
fi

nginx -c /tmp/nginx.conf -g "daemon off;" &
nginx_pid="$!"

while kill -0 "$api_pid" 2>/dev/null; do
  if ! kill -0 "$nginx_pid" 2>/dev/null; then
    wait "$nginx_pid"
    exit "$?"
  fi
  sleep 2
done

wait "$api_pid"
status="$?"
kill "$nginx_pid" 2>/dev/null || true
wait "$nginx_pid" 2>/dev/null || true
exit "$status"

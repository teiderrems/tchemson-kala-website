#!/bin/sh
set -eu

PORT="${PORT:-8080}"

sed "s/__PORT__/${PORT}/g" /etc/nginx/nginx.conf.template > /tmp/nginx.conf

uvicorn app.main:app --host 127.0.0.1 --port 8000 &

exec nginx -c /tmp/nginx.conf -g "daemon off;"

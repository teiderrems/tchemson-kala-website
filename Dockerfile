FROM cgr.dev/chainguard/node:latest-dev AS frontend-builder

USER root
WORKDIR /src/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM python:3.13-alpine AS python-builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=2.4.1 \
    POETRY_VIRTUALENVS_IN_PROJECT=true

WORKDIR /app

RUN apk add --no-cache build-base libffi-dev
RUN pip install --no-cache-dir "poetry==$POETRY_VERSION"

COPY pyproject.toml poetry.lock README.md ./
COPY app ./app

RUN poetry install --only main --no-root --no-interaction --no-ansi


FROM python:3.13-alpine AS api

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

RUN apk add --no-cache libstdc++ \
    && addgroup -S appuser \
    && adduser -S -G appuser -h /app -s /sbin/nologin appuser

COPY --from=python-builder /app/.venv ./.venv
COPY app ./app

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


FROM cgr.dev/chainguard/nginx:latest AS nginx

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-builder /src/dist /usr/share/nginx/html

EXPOSE 8080

# Stage 1: Builder
FROM python:3.11-slim AS builder

# Build arguments
ARG POETRY_VERSION=1.4.0
ARG POETRY_NO_INTERACTION=1
ARG POETRY_VIRTUALENVS_CREATE=false

# Set Python environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VERSION=${POETRY_VERSION} \
    POETRY_NO_INTERACTION=${POETRY_NO_INTERACTION} \
    POETRY_VIRTUALENVS_CREATE=${POETRY_VIRTUALENVS_CREATE}

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry with version pinning
RUN curl -sSL https://install.python-poetry.org | python - && \
    ln -s /root/.local/bin/poetry /usr/local/bin/poetry

# Set working directory
WORKDIR /build

# Copy Poetry configuration files
COPY pyproject.toml poetry.lock ./

# Install production dependencies only
RUN poetry install --no-dev --no-root

# Generate requirements.txt for CI/CD compatibility
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes

# Copy application source code
COPY . .

# Clean build artifacts and cache
RUN find . -type d -name __pycache__ -exec rm -rf {} + && \
    rm -rf ~/.cache/pip ~/.cache/poetry

# Stage 2: Final
FROM python:3.11-slim

# Build arguments for non-root user
ARG APP_USER=arena
ARG APP_GROUP=arena
ARG APP_HOME=/app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_USER=${APP_USER} \
    APP_GROUP=${APP_GROUP} \
    APP_HOME=${APP_HOME}

# Install production-only system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user and group
RUN groupadd -r ${APP_GROUP} && \
    useradd -r -g ${APP_GROUP} -d ${APP_HOME} -s /bin/bash ${APP_USER} && \
    mkdir -p ${APP_HOME}

# Set up application directory structure
RUN mkdir -p ${APP_HOME}/logs ${APP_HOME}/media ${APP_HOME}/static

# Copy dependencies from builder stage
COPY --from=builder /build/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && \
    rm /tmp/requirements.txt

# Copy application code with correct permissions
COPY --from=builder --chown=${APP_USER}:${APP_GROUP} /build ${APP_HOME}

# Configure entrypoint script
COPY --from=builder --chown=${APP_USER}:${APP_GROUP} /build/scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set secure file permissions
RUN chown -R ${APP_USER}:${APP_GROUP} ${APP_HOME} && \
    chmod -R 755 ${APP_HOME}

# Switch to non-root user
USER ${APP_USER}

# Configure work directory
WORKDIR ${APP_HOME}

# Expose application port
EXPOSE 8000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]
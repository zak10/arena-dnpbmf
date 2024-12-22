# Stage 1: Builder
FROM node:16.20.2-alpine3.18 AS builder

# Build arguments
ARG API_URL
ARG NODE_ENV=production
ARG BUILD_VERSION
ENV VITE_API_URL=${API_URL}
ENV NODE_ENV=${NODE_ENV}
ENV DISABLE_ESLINT_PLUGIN=true
ENV GENERATE_SOURCEMAP=true

# Install build dependencies
RUN apk add --no-cache \
    git=2.40.1-r0 \
    python3=3.11.5-r0 \
    make=4.4.1-r1 \
    g++=12.2.1_git20220924-r10 \
    && rm -rf /var/cache/apk/*

# Set npm configuration for production
RUN npm config set unsafe-perm true \
    && npm config set audit true \
    && npm config set fund false

# Create app directory and set ownership
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with specific version
RUN npm ci --only=production \
    && npm cache clean --force

# Security audit
RUN npm audit

# Copy source code and configuration
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Production
FROM nginx:1.24.0-alpine3.18

# Build arguments and labels
ARG BUILD_VERSION
ARG BUILD_DATE
ARG VCS_REF

LABEL maintainer="Arena DevOps Team" \
      version="${BUILD_VERSION}" \
      build-date="${BUILD_DATE}" \
      vcs-ref="${VCS_REF}" \
      description="Arena Web Application"

# Install additional security packages
RUN apk add --no-cache \
    curl=8.4.0-r0 \
    tzdata=2023c-r1 \
    && rm -rf /var/cache/apk/*

# Create nginx user and group with specific UID/GID
RUN addgroup -g 101 -S nginx \
    && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Set working directory
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist .

# Create required directories with proper permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/nginx.conf \
    && chmod -R 755 /var/cache/nginx /var/log/nginx

# Set resource limits
RUN ulimit -n 65535 \
    && echo "* soft nofile 65535" >> /etc/security/limits.conf \
    && echo "* hard nofile 65535" >> /etc/security/limits.conf

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose port
EXPOSE 80

# Switch to non-root user
USER nginx

# Set resource constraints
ENV NGINX_WORKER_PROCESSES="auto" \
    NGINX_WORKER_CONNECTIONS="2048" \
    NGINX_WORKER_RLIMIT_NOFILE="65535"

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Apply security limits
STOPSIGNAL SIGQUIT
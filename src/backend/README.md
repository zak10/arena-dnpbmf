# Arena MVP Backend Service

[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue)](https://www.python.org/downloads/)
[![Code style: black](https://img.shields.io/badge/code%20style-black-black)](https://github.com/psf/black)
[![Test Coverage](https://img.shields.io/badge/coverage-pytest--cov-green)](https://pytest-cov.readthedocs.io/)
[![Security](https://img.shields.io/badge/security-bandit-yellow)](https://github.com/PyCQA/bandit)

Arena MVP is a web-based software evaluation platform designed to streamline the vendor selection process for business leaders. This repository contains the backend service implementation.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Monitoring](#monitoring)

## Prerequisites

- Python 3.11 or higher
- Poetry 1.4+ (dependency management)
- Docker and Docker Compose
- AWS CLI configured with appropriate credentials
- Required API keys (Anthropic Claude)
- PostgreSQL 14+ (provided via Docker)
- Redis 6+ (provided via Docker)

## Getting Started

1. Clone the repository:
```bash
# Clone repository
git clone https://github.com/your-org/arena-mvp.git
cd arena-mvp/backend

# Install dependencies
poetry install

# Start development environment
docker-compose up -d

# Run migrations
poetry run python manage.py migrate

# Start development server
poetry run python manage.py runserver
```

2. Configure environment variables:
Create a `.env` file in the project root with the following variables:

```env
# Django Configuration
DJANGO_SETTINGS_MODULE=arena.settings.development
DJANGO_SECRET_KEY=your_secret_key_here
DJANGO_DEBUG=True

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@db:5432/arena

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-west-2

# External Services
ANTHROPIC_API_KEY=your_api_key_here

# Security Configuration
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

## Development Environment

### Docker Environment

The development environment is containerized using Docker Compose:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - '8000:8000'
    volumes:
      - .:/app
    depends_on:
      - db
      - redis

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: arena
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  redis:
    image: redis:6-alpine
    ports:
      - '6379:6379'
```

### Code Quality Tools

- **Formatting**: Black (v23.3.0)
  ```bash
  poetry run black .
  ```

- **Linting**: pylint
  ```bash
  poetry run pylint arena
  ```

- **Type Checking**: mypy
  ```bash
  poetry run mypy arena
  ```

- **Security Scanning**: bandit
  ```bash
  poetry run bandit -r arena
  ```

## API Documentation

The API is documented using OpenAPI/Swagger specifications. View the full API documentation at `/api/docs/` when running the development server.

### Key Endpoints

- Authentication:
  - POST `/api/v1/auth/login/` - Email magic link authentication
  - POST `/api/v1/auth/verify/` - Verify magic link token

- Requests:
  - POST `/api/v1/requests/` - Create new software request
  - GET `/api/v1/requests/` - List user's requests
  - GET `/api/v1/requests/{id}/` - Get request details

- Proposals:
  - GET `/api/v1/proposals/` - List proposals
  - PUT `/api/v1/proposals/{id}/` - Update proposal status

### WebSocket Integration

WebSocket connections are available for real-time updates:

```javascript
// Connect to WebSocket
ws = new WebSocket('ws://localhost:8000/ws/updates/');

// Authentication
ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'your_jwt_token'
}));
```

## Security

### Authentication Flow

1. User requests magic link via email
2. Time-limited token (15 minutes) is generated and sent
3. Token verification creates JWT session
4. JWT token required for all authenticated endpoints

### Security Headers

```python
SECURE_HEADERS = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'"
}
```

### Data Protection

- Database encryption at rest using AWS RDS encryption
- Field-level encryption for sensitive data using AWS KMS
- TLS 1.3 for all data in transit
- Secure session handling with Redis backend

## Testing

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=arena

# Generate coverage report
poetry run pytest --cov=arena --cov-report=html
```

### Test Categories

- Unit Tests: `tests/unit/`
- Integration Tests: `tests/integration/`
- API Tests: `tests/api/`
- Security Tests: `tests/security/`

## Deployment

### AWS ECS Deployment

1. Build and push Docker image:
```bash
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin
docker build -t arena-backend .
docker tag arena-backend:latest $ECR_REPO:latest
docker push $ECR_REPO:latest
```

2. Update ECS service:
```bash
aws ecs update-service --cluster arena-cluster --service arena-backend --force-new-deployment
```

### Health Checks

- HTTP health check endpoint: `/health/`
- Database connectivity check
- Redis connectivity check
- External service dependency checks

## Monitoring

### CloudWatch Metrics

- Application metrics:
  - Request latency
  - Error rates
  - API endpoint usage
  - Authentication success/failure

- Infrastructure metrics:
  - CPU utilization
  - Memory usage
  - Database connections
  - Cache hit rates

### Logging

- Structured JSON logging
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Log shipping to CloudWatch Logs
- Log retention: 30 days

### Alerting

- CloudWatch Alarms for critical metrics
- Error rate thresholds
- Infrastructure health
- External service availability

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

Copyright © 2023 Arena MVP. All rights reserved.
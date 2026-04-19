# Todo API (Django + PostgreSQL)

## Prerequisites

- Python 3.12+ (or 3.10+)
- Docker (for PostgreSQL and pgAdmin)

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # edit if your DB credentials differ
```

## Database (Docker)

```bash
docker compose -f docker-compose.yml up -d
```

- PostgreSQL is exposed on **localhost:5433** (user `admin`, password `secret`, database `mydb`).
- pgAdmin: **http://localhost:5050** — email `admin@mail.com`, password `admin`. Add a server with host `localhost`, port `5433` (from your machine).

## Migrate and run

```bash
source .venv/bin/activate
python manage.py migrate
python manage.py runserver
```

API base: `http://127.0.0.1:8000/api/todos/`

## OpenAPI / Swagger

- **Swagger UI**: `http://127.0.0.1:8000/api/schema/swagger-ui/`
- **ReDoc**: `http://127.0.0.1:8000/api/schema/redoc/`
- **Схема OpenAPI (JSON)**: `http://127.0.0.1:8000/api/schema/`

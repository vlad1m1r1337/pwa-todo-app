#!/usr/bin/env bash
# Build script for Render. Runs during deploy: installs deps, collects static, applies migrations.
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

#!/bin/bash
set -e

echo "=== Starting Mortgage Underwriter Backend ==="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
while ! python -c "
import psycopg2
import os
import dj_database_url
db = dj_database_url.parse(os.environ.get('DATABASE_URL', ''))
conn = psycopg2.connect(
    host=db['HOST'],
    port=db['PORT'],
    user=db['USER'],
    password=db['PASSWORD'],
    dbname=db['NAME']
)
conn.close()
" 2>/dev/null; do
    echo "PostgreSQL not ready, waiting..."
    sleep 2
done
echo "PostgreSQL is ready!"

# Generate migrations if they don't exist
echo "Checking migrations..."
python manage.py makemigrations users applications underwriting agents compliance --noinput 2>&1 || true

# Apply migrations (idempotent - safe to run multiple times)
echo "Applying migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput 2>&1 || true

echo "=== Backend ready, starting Gunicorn ==="
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -

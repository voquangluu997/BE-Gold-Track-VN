#!/bin/bash
# ============================================
# DOCKER ENTRYPOINT SCRIPT
# ============================================
set -e
# set -e: Dừng script nếu có lệnh thất bại

echo "🚀 Starting GoldTrack Backend..."

# Chờ database sẵn sàng
echo "⏳ Waiting for database to be ready..."
until pg_isready -h postgres -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-goldtrack_dev}; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "✅ Database is ready!"

# Chạy migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma Client (đảm bảo có)
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Seed data (chỉ trong development)
if [ "$NODE_ENV" = "development" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed || true
fi

# Start application
echo "🎯 Starting application..."
exec "$@"
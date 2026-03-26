#!/bin/bash

echo "=== Fixing Prisma postinstall error ==="

# 1. Backup package.json
cp package.json package.json.bak

# 2. Sửa postinstall script trong package.json
echo "Fixing postinstall script..."
node << 'EOF'
const fs = require('fs');
const package = require('./package.json');

// Change postinstall script
package.scripts.postinstall = "echo 'Skipping prisma generate in postinstall. Run manually if needed.'";

// Ensure prisma generate script exists
if (!package.scripts['prisma:generate']) {
  package.scripts['prisma:generate'] = "prisma generate";
}

fs.writeFileSync('package.json', JSON.stringify(package, null, 2));
console.log('✅ Updated package.json');
EOF

# 3. Cập nhật Dockerfile.dev
echo "Updating Dockerfile.dev..."
cat > Dockerfile.dev << 'EOF'
FROM node:22-alpine

RUN apk add --no-cache \
    bash \
    curl \
    postgresql-client \
    openssl \
    openssl-dev

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY . .

EXPOSE 3000 9229

CMD ["npm", "run", "start:dev"]
EOF

echo "✅ Dockerfile.dev updated"

# 4. Tạo package-lock.json với cài đặt đầy đủ
echo "Creating package-lock.json..."
npm install --package-lock-only 2>/dev/null || npm install

# 5. Clean Docker cache
echo "Cleaning Docker cache..."
docker system prune -f

# 6. Build lại
echo "Building Docker images..."
docker-compose -f docker-compose.dev.yml build --no-cache

echo ""
echo "=== Fix completed! ==="
echo "Run: docker-compose -f docker-compose.dev.yml up -d"
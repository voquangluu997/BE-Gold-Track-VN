npm installFROM node:22-alpine AS builder

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl-dev

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Cài đặt dependencies (bao gồm devDependencies cho build)
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build ứng dụng
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN apk add --no-cache postgresql-client openssl

WORKDIR /app

# Copy package files cho production
COPY package*.json ./
COPY prisma ./prisma/

# Chỉ cài production dependencies
RUN npm install --omit=dev

# Generate Prisma Client
RUN npx prisma generate

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

CMD ["node", "dist/main"]
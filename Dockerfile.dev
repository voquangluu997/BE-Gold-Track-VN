FROM node:22-alpine AS builder

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl-dev

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# Copy source code
COPY . .

# Build ứng dụng
RUN npm run build

# Kiểm tra dist đã được tạo
RUN ls -la dist/

FROM node:22-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN apk add --no-cache postgresql-client openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Chỉ cài production dependencies
RUN npm ci --omit=dev

# Generate Prisma Client
RUN npx prisma generate

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Kiểm tra dist đã được copy
RUN ls -la dist/

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

CMD ["node", "dist/main"]
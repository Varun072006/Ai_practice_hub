# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Install dependencies including devDependencies for building
# npm ci is faster and more reliable for builds
RUN npm ci --legacy-peer-deps

COPY . .

# Build TypeScript code
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Expose backend port
EXPOSE 5000

# Environment variables will be passed via docker-compose
ENV NODE_ENV=production

CMD ["npm", "start"]

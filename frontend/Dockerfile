# Build Stage
FROM node:18-alpine AS builder

ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_API_URL
ARG VITE_BASE_PATH

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Build Vite app
RUN printf "VITE_GOOGLE_CLIENT_ID=%s\nVITE_API_URL=%s\nVITE_BASE_PATH=%s\n" "$VITE_GOOGLE_CLIENT_ID" "$VITE_API_URL" "$VITE_BASE_PATH" > .env
RUN npm run build

# Production Stage
FROM nginx:alpine

# Copy built assets from builder stage to nginx root
# (Portal nginx strips /aiportal/aipracticehub/ prefix before forwarding here)
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

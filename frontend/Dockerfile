# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json .
RUN npm install

COPY . .

# Point API at the backend container
ENV VITE_API_URL=http://localhost:8000
RUN npm run build

# ── Serve stage ───────────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback — serve index.html for all routes
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { try_files $uri $uri/ /index.html; } \
    location /api/ { proxy_pass http://backend:8000/; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

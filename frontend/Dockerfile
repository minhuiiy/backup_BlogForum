# Stage 1: Build Angular app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build -- --configuration=production

# Stage 2: Serve với nginx
FROM nginx:alpine
# Cài envsubst để hỗ trợ env variables trong nginx.conf
RUN apk add --no-cache gettext

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

# Dùng envsubst để thay thế ${BACKEND_URL} trong nginx.conf rồi khởi động nginx
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

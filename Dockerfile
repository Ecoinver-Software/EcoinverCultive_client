
FROM node:18-slim AS build
WORKDIR /app

# Copia deps e instala (no necesita gcompat)
COPY package*.json ./
RUN npm ci

# Copia el código y construye
COPY . .
RUN npm run build -- --output-path=dist

# Etapa 2: NGINX + HTTPS en puerto 80 (Alpine)
FROM nginx:1.23-alpine
RUN mkdir -p /etc/ssl/certs /etc/ssl/private

# COPY rootCA.crt    /usr/local/share/ca-certificates/rootCA.crt
# RUN update-ca-certificates

COPY nginx/certs/server.crt  /etc/ssl/certs/server.crt
COPY nginx/certs/server.key  /etc/ssl/private/server.key
COPY nginx/default.conf      /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/browser/  /usr/share/nginx/html/

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]

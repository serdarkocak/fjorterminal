# ----- Build Stage -----
FROM node:20 AS build

WORKDIR /app

# Coolify environment variable'ını build aşamasında Docker ARG ile al
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm install

COPY . .

RUN npm install -g vite
RUN vite build

# ----- Deploy Stage -----
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Nginx SPA config & API proxy
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://api.fjorterminal.com;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

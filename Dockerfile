# ----- Build Stage -----
FROM node:20 AS build

WORKDIR /app

# GLOBAL VITE KURULUYOR — ÇÖZÜM BUDUR
RUN npm install -g vite

COPY package*.json ./

RUN npm install

COPY . .

# Global vite üzerinden build alıyoruz
RUN node_modules/.bin/vite --version || true
RUN vite build

# ----- Deploy Stage -----
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

RUN sed -i 's/try_files.*/try_files $uri $uri\/ \/index.html;/' /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ----- Build Stage -----
FROM node:20-alpine AS build   # Node 18 yerine node 20 şart (react-router v7, p-limit v7, vite v7 için)

WORKDIR /app

COPY package*.json ./

RUN npm install

# Vite ve diğer bin dosyalarına execute izni ver
RUN chmod +x node_modules/.bin/*

COPY . .

RUN npm run build

# ----- Deploy Stage -----
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

RUN sed -i 's/try_files.*/try_files \$uri \$uri\/ \/index.html;/' /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

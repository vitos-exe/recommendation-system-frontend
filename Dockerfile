FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/recommendation-system-frontend/browser /usr/share/nginx/html
COPY proxy.conf.json /etc/nginx/conf.d/default.conf

EXPOSE 80

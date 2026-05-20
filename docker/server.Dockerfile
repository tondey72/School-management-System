FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
COPY server/package.json ./server/package.json
COPY shared/package.json ./shared/package.json
RUN npm ci
COPY . .
EXPOSE 4000

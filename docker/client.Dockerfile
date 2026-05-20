FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
COPY client/package.json ./client/package.json
COPY shared/package.json ./shared/package.json
RUN npm ci
COPY . .
EXPOSE 5173

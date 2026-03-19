FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm install -D typescript tsx concurrently

# Copy source
COPY . .

# Build Next.js
RUN npm run build

EXPOSE 3000 2567

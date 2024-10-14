# Base image for Node.js
FROM node:21.7.3

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install all dependencies (both frontend and backend dependencies)
RUN npm install

# Copy the entire application to the container
COPY . .

RUN npm run build

# Expose ports for both frontend (3000) and backend (5000)
EXPOSE 3000 5000 8000

# Default command will be handled in docker-compose.yml

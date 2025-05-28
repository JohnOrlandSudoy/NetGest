FROM node:slim

# Install required system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
RUN mkdir -p /app /logs/nginx

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Create nginx logs directory and add a sample log file for development
RUN mkdir -p /app/logs/nginx
RUN echo "192.168.1.1 - - [2023-01-01:12:00:00 +0000] \"GET /dashboard HTTP/1.1\" 200 1024 \"http://example.com\" \"Mozilla/5.0\" 0.123" > /app/logs/nginx/access.log

# Build the application
RUN npm run build

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]


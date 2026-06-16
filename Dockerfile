# Root Dockerfile.
# Render auto-detects Docker from the Dockerfile.* / docker-compose files in this
# repo and then looks for a file named exactly "Dockerfile" at the repo root.
# This is that file. It builds and runs ONLY the Node backend in server/.
# Build context = repo root (keep the service's "Root Directory" blank).
FROM node:20-alpine

WORKDIR /app

# Install backend dependencies first (better layer caching).
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy the backend source.
COPY server/ ./

# Render injects PORT at runtime; server/index.js already listens on process.env.PORT.
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "index.js"]

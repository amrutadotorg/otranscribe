FROM node:26.5.0-slim AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm install -g npm@12.0.1
RUN npm ci

# Copy source and build the Vite app
COPY . .
RUN npm run build

# Build the TypeScript server
RUN npm run build:server

# ─── Production stage ──────────────────────────────────────────

FROM node:26.5.0-slim

WORKDIR /app

# Only production dependencies
COPY package.json package-lock.json ./
RUN npm install -g npm@12.0.1
RUN npm ci --omit=dev

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy compiled server
COPY --from=build /app/dist-server ./dist-server

# Security: non-root user
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["node", "dist-server/index.js"]

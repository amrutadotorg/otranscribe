FROM node:24-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm install -g npm@12.0.0
RUN npm ci --legacy-peer-deps

# Copy source and build the Vite app
COPY . .
RUN npm run build

# Build the TypeScript server
RUN npm run build:server

# ─── Production stage ──────────────────────────────────────────

FROM node:24-alpine

WORKDIR /app

# Only production dependencies
COPY package.json package-lock.json ./
RUN npm install -g npm@12.0.0
RUN npm ci --omit=dev --legacy-peer-deps

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy compiled server
COPY --from=build /app/dist-server ./dist-server

# Security: non-root user
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000

CMD ["node", "dist-server/index.js"]

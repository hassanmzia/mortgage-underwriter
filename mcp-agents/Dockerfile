FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Create non-root user
RUN adduser -D appuser && chown -R appuser /app
USER appuser

EXPOSE 3000

CMD ["node", "dist/index.js"]

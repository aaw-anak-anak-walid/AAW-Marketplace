# Stage 1: Fetching the node image and building the application
FROM node:18.18.2 AS builder

# Setting up the work directory
WORKDIR /service-tenant

# Copying package.json separately
COPY package.json ./

# Install pnpm
RUN npm install -g pnpm typescript

# Installing dependencies
RUN pnpm install

# Copying the rest of the application
COPY . .

# Building our application
RUN pnpm run build

# Stage 2: Creating a lightweight image for production
FROM node:18.18.2-slim

# Declaring env
ENV PORT 8003
ENV NODE_ENV production

# Set working directory
WORKDIR /service-tenant

# Copy built files from the previous stage
COPY --from=builder /service-tenant/dist ./dist
COPY --from=builder /service-tenant/package.json ./package.json
COPY --from=builder /service-tenant/drizzle ./drizzle
COPY --from=builder /service-tenant/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

# Install production dependencies only
RUN npm install --only=production

# Expose server port
EXPOSE 8003

# Start the application
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/src/server.js"]
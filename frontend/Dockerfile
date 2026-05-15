# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Accept build arguments
ARG APP_NAME
ARG NEXT_PUBLIC_API_URL

# Copy root package files
COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./

# Copy shared packages and all apps
COPY packages ./packages
COPY apps ./apps

# Set environment variable for build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install dependencies
RUN npm install

# Build the specific app
RUN npm run build --workspace=$APP_NAME

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

ARG APP_NAME
ENV APP_NAME=$APP_NAME
ENV NODE_ENV=production

# Copy built files and dependencies
COPY --from=builder /app ./

EXPOSE 3000

# Start using the workspace command
CMD ["sh", "-c", "npm run start --workspace=$APP_NAME"]

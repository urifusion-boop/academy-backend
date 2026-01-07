# Stage 1: Build the application
FROM node:22-alpine as build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 2: Production container
FROM node:22-alpine as production

WORKDIR /app

# Copy necessary files from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma

# Expose the ports the app runs on
EXPOSE 3000

# Configure the application
ENV NODE_ENV=production
ENV PORT=3000

# ENV NODE_OPTIONS="--experimental-specifier-resolution=node"

CMD ["node", "dist/src/server.js"]

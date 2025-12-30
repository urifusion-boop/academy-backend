FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma
RUN npm run prisma:generate && npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]

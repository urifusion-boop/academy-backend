import fs from 'fs';
import http from 'http';
import https from 'https';
import app from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const HTTP_PORT = parseInt(env.HTTP_PORT, 10);
const HTTPS_PORT = parseInt(env.HTTPS_PORT, 10);

async function start() {
  try {
    // Check DB connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // HTTP Server
    http.createServer(app).listen(HTTP_PORT, () => {
      logger.info(`HTTP server running on port ${HTTP_PORT}`);
    });

    // HTTPS Server (Production only)
    if (env.NODE_ENV === 'production') {
      try {
        const keyPath = process.env.SSL_KEY_PATH || '/certs/privkey.pem';
        const certPath = process.env.SSL_CERT_PATH || '/certs/fullchain.pem';

        const sslOptions = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };

        https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
          logger.info(`HTTPS server running on port ${HTTPS_PORT}`);
        });
      } catch (error) {
        logger.error({ error }, 'Failed to start HTTPS server - check certificates');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();

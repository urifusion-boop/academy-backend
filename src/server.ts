import app from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const port = parseInt(env.PORT, 10);

async function start() {
  try {
    // Check DB connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();

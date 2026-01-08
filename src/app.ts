import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { generalLimiter } from './config/rateLimit';
import { requestLogger, attachRequestId } from './middlewares/requestLogger';
import { errorHandler } from './middlewares/errorHandler';
import routes from './routes';
import swaggerUi from 'swagger-ui-express';
import { openapi } from './docs/openapi';

const app = express();

app.use(attachRequestId);
app.use(requestLogger);
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      (req as express.Request).rawBody = buf;
    },
  }),
);
if (env.NODE_ENV !== 'test') {
  app.use(generalLimiter);
}

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.use(['/api', '/'], routes);

// Catch 404 and forward to error handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NotFound',
      message: `Route not found: ${req.method} ${req.path}`,
    },
  });
});

app.use(errorHandler);

export default app

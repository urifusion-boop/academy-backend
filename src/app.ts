import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env'
import { generalLimiter } from './config/rateLimit'
import { requestLogger, attachRequestId } from './middlewares/requestLogger'
import { errorHandler } from './middlewares/errorHandler'
import routes from './routes'
import swaggerUi from 'swagger-ui-express'
import { openapi } from './docs/openapi'

const app = express()

app.use(attachRequestId)
app.use(requestLogger)
app.use(helmet())
app.use(
  cors({
    origin: env.CORS_ORIGIN || env.APP_URL,
    credentials: true
  })
)
app.use(express.json({ limit: '1mb' }))
if (env.NODE_ENV !== 'test') {
  app.use(generalLimiter)
}

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi))
app.use('/api', routes)

app.use(errorHandler)

export default app

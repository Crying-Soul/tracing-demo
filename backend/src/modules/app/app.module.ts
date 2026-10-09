import type { IncomingMessage } from 'node:http';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthController } from '../health/health.controller.js';
import { TelemetryService } from '../observability/telemetry.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { trace } from '@opentelemetry/api';

@Module({
  imports: [
    DatabaseModule,
    TerminusModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',

        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },

        // middie на время вызова middleware срезает префикс монтирования
        // из req.url, полный путь остаётся только в originalUrl
        autoLogging: {
          ignore: (req) => {
            const { originalUrl } = req as IncomingMessage & { originalUrl?: string };
            return (originalUrl ?? req.url ?? '').startsWith('/health/');
          },
        },

        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            headers: {
              'user-agent': req.headers['user-agent'],
              'content-type': req.headers['content-type'],
            },
          }),
          res: (res) => ({ statusCode: res.statusCode }),
        },

        redact: {
          paths: ['password', 'token', 'secret', '*.password', '*.token', '*.secret'],
          censor: '[REDACTED]',
        },

        mixin: () => {
          const span = trace.getActiveSpan();
          if (!span) return {};
          const { traceId, spanId } = span.spanContext();
          return { trace_id: traceId, span_id: spanId };
        },
      },
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, TelemetryService],
})
export class AppModule {}

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { shutdownTelemetry } from '../../tracing.js';

@Injectable()
export class TelemetryService implements OnApplicationShutdown {
  constructor(@InjectPinoLogger(TelemetryService.name) private readonly logger: PinoLogger) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info({ event: 'telemetry_flush_started', signal }, 'flushing telemetry before shutdown');
    await shutdownTelemetry();
  }
}

import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class AppService {
  constructor(@InjectPinoLogger(AppService.name) private readonly logger: PinoLogger) {}

  ping(): string {
    this.logger.debug({ event: 'ping' }, 'ping');
    return 'pong';
  }
}

import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';

export const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        const pool = new pg.Pool({
          connectionString: process.env.DATABASE_URL,
          connectionTimeoutMillis: 2_000,
        });
        // ошибка простаивающего клиента без обработчика роняет процесс
        const logger = new Logger('PgPool');
        pool.on('error', (err) => logger.error({ event: 'pg_idle_client_error', err }, 'idle client error'));
        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

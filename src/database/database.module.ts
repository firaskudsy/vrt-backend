import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file
@Module({
  providers: [
    {
      provide: 'DB_CONNECTION',
      useFactory: async () => {
        const pool = new Pool({
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT, 10) || 5432,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          ssl:
            process.env.DB_SSL === 'true'
              ? {
                  rejectUnauthorized: false,
                }
              : undefined,
          max: 20, // maximum number of clients in the pool
          idleTimeoutMillis: 30000,
        });
        // await client.connect();
        return pool;
      },
    },
  ],
  exports: ['DB_CONNECTION'],
})
export class DatabaseModule {}

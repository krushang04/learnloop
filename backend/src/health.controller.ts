import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness probe - also reports the Mongo connection state' })
  @ApiResponse({
    status: 200,
    description:
      'Always 200 while the process is up. `status` is `degraded` when Mongo is unreachable.',
  })
  check() {
    const dbConnected = this.connection.readyState === 1;
    return {
      status: dbConnected ? 'ok' : 'degraded',
      database: dbConnected ? 'connected' : 'disconnected',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}

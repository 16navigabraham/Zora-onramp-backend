import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServerStatus(): object {
    return {
      message: 'Zora Onramp Server is running!',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        orders: '/api/orders',
        webhooks: '/api/webhooks',
        zora: '/api/zora'
      }
    };
  }
}

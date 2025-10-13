import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServerStatus(): object {
    return {
      message: 'Zora Onramp Server is running!',
      status: 'healthy',
      timestamp: this.formatWATTime(new Date()),
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        orders: '/api/orders',
        webhooks: '/api/webhooks',
        zora: '/api/zora'
      }
    };
  }

  private formatWATTime(date: Date): string {
    return date.toLocaleString('en-GB', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '') + ' WAT';
  }
}

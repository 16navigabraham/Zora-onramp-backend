import { Controller, Get } from '@nestjs/common';
import { ContractsService } from 'src/contracts/contracts.service';

@Controller('health')
export class HealthController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  async getHealth() {
    try {
      const balance = await this.contractsService.getContractBalance();
      const network = await this.contractsService.getNetworkInfo();

      return {
        success: true,
        status: 'operational',
        timestamp: this.formatWATTime(new Date()),
        contract: {
          address: process.env.CONTRACT_ADDRESS,
          userBalance: balance,
        },
        network: {
          name: network.name,
          chainId: network.chainId,
          rpcUrl: process.env.RPC_URL,
        },
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
        },
      };
    } catch (error) {
      return {
        success: false,
        status: 'degraded',
        timestamp: this.formatWATTime(new Date()),
        error: error.message,
      };
    }
  }

  @Get('ping')
  ping() {
    return {
      success: true,
      message: 'pong',
      timestamp: this.formatWATTime(new Date()),
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
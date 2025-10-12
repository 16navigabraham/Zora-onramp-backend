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
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  @Get('ping')
  ping() {
    return {
      success: true,
      message: 'pong',
      timestamp: new Date().toISOString(),
    };
  }
}

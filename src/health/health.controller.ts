import { Controller, Get, Post } from '@nestjs/common';
import { ContractsService } from 'src/contracts/contracts.service';
import { TelegramService } from 'src/telegram/telegram.service';
import { BalanceCheckService } from 'src/maintenance/balance-check.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly telegramService: TelegramService,
    private readonly balanceCheckService: BalanceCheckService,
  ) {}

  @Get()
  async getHealth() {
    try {
      const balance = await this.contractsService.getContractBalance();
      const network = await this.contractsService.getNetworkInfo();

      const status = this.balanceCheckService.getStatus();

      return {
        success: true,
        status: 'operational',
        timestamp: this.formatWATTime(new Date()),
        contract: {
          address: process.env.CONTRACT_ADDRESS,
          userBalance: balance,
          monitoring: {
            lastAlertAt: status.lastAlertAt,
            alerted: status.alerted,
          },
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

  @Get('telegram-config')
  getTelegramConfig() {
    return {
      success: true,
      config: {
        botToken: process.env.TELEGRAM_BOT_TOKEN ? '***configured***' : 'NOT_SET',
        chatId: process.env.TELEGRAM_CHAT_ID ? '***configured***' : 'NOT_SET',
        hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
        hasChatId: !!process.env.TELEGRAM_CHAT_ID,
      },
      timestamp: this.formatWATTime(new Date()),
    };
  }

  @Post('telegram-test')
  async testTelegram() {
    try {
      await this.telegramService.notifyServerEvent('Test message from Railway deployment');
      return {
        success: true,
        message: 'Telegram test notification sent',
        timestamp: this.formatWATTime(new Date()),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: this.formatWATTime(new Date()),
      };
    }
  }

  @Get('ping')
  ping() {
    return {
      success: true,
      message: 'pong',
      timestamp: this.formatWATTime(new Date()),
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'NOT_SET',
        chatId: process.env.TELEGRAM_CHAT_ID ? 'configured' : 'NOT_SET',
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
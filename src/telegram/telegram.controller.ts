import { Controller, Post, Body, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ContractsService } from '../contracts/contracts.service';
import { BalanceCheckService } from '../maintenance/balance-check.service';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly contractsService: ContractsService,
    private readonly balanceCheckService: BalanceCheckService,
  ) {}

  @Post('webhook')
  async handleUpdate(@Body() update: any) {
    try {
      // Telegram update shape: { message: { text, chat: { id } } }
      const message = update?.message?.text?.trim();
      const chatId = update?.message?.chat?.id?.toString();

      if (!message || !chatId) {
        return { ok: true };
      }

      if (message.startsWith('/balance')) {
        const balance = await this.contractsService.getContractBalance();
        const network = await this.contractsService.getNetworkInfo();
        const status = this.balanceCheckService.getStatus();

        const lastAlert = status.lastAlertAt ? new Date(status.lastAlertAt).toISOString() : 'never';

        const contractAddress = process.env.CONTRACT_ADDRESS || 'unknown';
        const maskedAddress = contractAddress && contractAddress !== 'unknown'
          ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`
          : 'unknown';

        const reply = `🔎 Contract balance\n• Address: ${maskedAddress}\n• Balance: ${balance} USDC\n• Network: ${network.name} (chainId ${network.chainId})\n• Last low-balance alert: ${lastAlert} (active: ${status.alerted})`;

        await this.telegramService.sendRawMessageToChat(chatId, reply);
      }

      return { ok: true };
    } catch (error) {
      this.logger.error(`Failed to handle Telegram update: ${error.message}`);
      return { ok: false };
    }
  }
}

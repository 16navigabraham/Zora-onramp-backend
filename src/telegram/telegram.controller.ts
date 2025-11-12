import { Controller, Post, Body, Logger, Get, Query } from '@nestjs/common';
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

      // Log incoming command (mask chat ID for privacy)
      const maskedChatId = chatId.length > 4 
        ? `${chatId.slice(0, 2)}***${chatId.slice(-2)}`
        : '***';
      this.logger.log(`Telegram command received: ${message.split(' ')[0]} from chat ${maskedChatId}`);

      // Handle /balance command
      if (message.startsWith('/balance')) {
        try {
          const balance = await this.contractsService.getContractBalance();
          const network = await this.contractsService.getNetworkInfo();
          const status = this.balanceCheckService.getStatus();

          const lastAlert = status.lastAlertAt 
            ? new Date(status.lastAlertAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }) + ' WAT'
            : 'Never';

          const contractAddress = process.env.CONTRACT_ADDRESS || 'unknown';
          const maskedAddress = contractAddress && contractAddress !== 'unknown'
            ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`
            : 'unknown';

          // Determine status emoji based on alert state
          const statusEmoji = status.alerted ? '🔴' : '✅';
          const statusText = status.alerted ? 'Low Balance Alert Active' : 'Balance OK';

          const reply = 
            `🔎 *Contract Balance*\n\n` +
            `💰 Balance: *${balance} USDC*\n` +
            `🔗 Address: \`${maskedAddress}\`\n` +
            `🌐 Network: ${network.name} (Chain ID: ${network.chainId})\n\n` +
            `${statusEmoji} Status: *${statusText}*\n` +
            `� Last Alert Sent: ${lastAlert}\n\n` +
            `� ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} WAT`;

          await this.telegramService.sendRawMessageToChat(chatId, reply, 'Markdown');
          this.logger.log(`Sent /balance response to chat ${maskedChatId}`);
        } catch (err) {
          this.logger.error(`Failed to fetch balance data: ${err.message}`);
          await this.telegramService.sendRawMessageToChat(
            chatId, 
            `❌ Failed to fetch balance: ${err.message}`,
            '' // No parse mode = plain text
          );
        }
      }

      return { ok: true };
    } catch (error) {
      this.logger.error(`Failed to handle Telegram update: ${error.message}`);
      return { ok: false };
    }
  }

  /**
   * Setup webhook - call this once after deployment
   * GET /api/telegram/setup-webhook?url=https://yourdomain.com/api/telegram/webhook
   */
  @Get('setup-webhook')
  async setupWebhook(@Query('url') webhookUrl: string) {
    if (!webhookUrl) {
      return {
        error: 'Missing webhook URL',
        usage: 'GET /api/telegram/setup-webhook?url=https://yourdomain.com/api/telegram/webhook',
      };
    }

    const result = await this.telegramService.setWebhook(webhookUrl);
    return result;
  }

  /**
   * Check current webhook status
   * GET /api/telegram/webhook-info
   */
  @Get('webhook-info')
  async webhookInfo() {
    const info = await this.telegramService.getWebhookInfo();
    return info;
  }

  /**
   * Delete webhook (for testing)
   * GET /api/telegram/delete-webhook
   */
  @Get('delete-webhook')
  async deleteWebhook() {
    const result = await this.telegramService.deleteWebhook();
    return result;
  }
}

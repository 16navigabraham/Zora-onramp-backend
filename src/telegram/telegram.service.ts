import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface TelegramNotification {
  type: 'order_created' | 'payment_success' | 'payment_failed' | 'order_cancelled' | 'server_event';
  orderId?: string;
  amount?: number;
  currency?: string;
  usdcReceived?: number;
  error?: string;
  message: string;
  timestamp: Date;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.botToken') || '';
    this.chatId = this.configService.get<string>('telegram.chatId') || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Validate Telegram configuration and log friendly warnings.
   * Returns true when configuration looks OK, false otherwise.
   */
  validateConfig(): boolean {
    const issues: string[] = [];
    if (!this.botToken) {
      issues.push('TELEGRAM_BOT_TOKEN is not set');
    } else {
      // bot token format is typically like <botId>:<token>
      const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
      if (!tokenPattern.test(this.botToken)) {
        issues.push('TELEGRAM_BOT_TOKEN does not match expected pattern (looks invalid)');
      }
    }

    if (!this.chatId) {
      issues.push('TELEGRAM_CHAT_ID is not set');
    } else {
      // Accept numeric ids (including negative), or @username
      const chatPattern = /^(-?\d+|@.+)$/;
      if (!chatPattern.test(this.chatId)) {
        issues.push('TELEGRAM_CHAT_ID does not look like a numeric id or @username');
      }
    }

    if (issues.length > 0) {
      this.logger.warn('Telegram configuration issues detected:');
      issues.forEach(i => this.logger.warn(`  - ${i}`));
      this.logger.warn('Telegram notifications will be skipped until configuration is fixed.');
      return false;
    }

    this.logger.log('Telegram configuration looks valid');
    return true;
  }

  async sendNotification(notification: TelegramNotification): Promise<void> {
    if (!this.botToken || !this.chatId) {
      this.logger.warn('Telegram bot not configured, skipping notification');
      return;
    }

    try {
      const message = this.formatMessage(notification);
      await this.sendMessage(message);
      this.logger.log(`Telegram notification sent: ${notification.type}`);
    } catch (error) {
      this.logger.error(`Failed to send Telegram notification: ${error.message}`);
    }
  }

  private formatMessage(notification: TelegramNotification): string {
    const emoji = this.getEmoji(notification.type);
    const timestamp = this.formatWATTime(notification.timestamp);
    
    let message = `${emoji} *${notification.type.toUpperCase().replace('_', ' ')}*\n\n`;
    message += `📅 *Time:* ${timestamp}\n`;
    
    if (notification.orderId) {
      message += `🆔 *Order ID:* \`${notification.orderId}\`\n`;
    }
    
    if (notification.amount && notification.currency) {
      message += `💰 *Amount:* ${notification.amount} ${notification.currency}\n`;
    }
    
    if (notification.usdcReceived) {
      message += `🪙 *USDC Received:* ${notification.usdcReceived} USDC\n`;
    }
    
    if (notification.error) {
      message += `❌ *Error:* ${notification.error}\n`;
    }
    
    message += `\n📝 *Details:* ${notification.message}`;
    
    return message;
  }

  private formatWATTime(date: Date): string {
    const watTime = new Date(date.toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
    return watTime.toLocaleString('en-GB', {
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

  private getEmoji(type: string): string {
    const emojis = {
      'order_created': '🆕',
      'payment_success': '✅',
      'payment_failed': '❌',
      'order_cancelled': '⏰',
      'server_event': '🔔'
    };
    return emojis[type] || '📢';
  }

  private async sendMessage(message: string): Promise<void> {
    // Send as plain text by default to avoid Markdown formatting errors
    // which commonly produce HTTP 400 responses from Telegram.
    const payload: any = {
      chat_id: this.chatId,
      text: message,
      disable_web_page_preview: true,
    };

    // Retry once on network/5xx errors
    const maxAttempts = 2;
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        const response = await axios.post(`${this.baseUrl}/sendMessage`, payload);
        if (!response.data?.ok) {
          // Telegram returned an application-level error (e.g. bad chat id, bad message)
          const desc = response.data?.description || 'Unknown';
          throw new Error(`Telegram API error: ${desc}`);
        }
        return;
      } catch (err: any) {
        attempt++;
        // If it's an axios response error, log concise details; don't dump tokens or full payloads
        if (err.response) {
          const status = err.response.status;
          const desc = err.response.data?.description || err.message;
          // 4xx errors are client errors (do not retry)
          if (status >= 400 && status < 500) {
            this.logger.error(`Telegram API client error ${status}: ${desc}`);
            throw new Error(desc);
          }
          // 5xx: retry
          this.logger.warn(`Telegram API server error ${status}: ${desc} (attempt ${attempt}/${maxAttempts})`);
        } else {
          this.logger.warn(`Telegram send attempt ${attempt} failed: ${err?.message || err}`);
        }

        if (attempt >= maxAttempts) {
          // Final failure
          const messageText = err.response?.data?.description || err.message || String(err);
          this.logger.error(`Failed to send Telegram message: ${messageText}`);
          throw err;
        }

        // Backoff before retrying
        await new Promise(r => setTimeout(r, 200 * attempt));
      }
    }
  }

  /**
   * Public method to send a message to an arbitrary chat ID.
   */
  async sendRawMessageToChat(chatId: string, message: string, parseMode = 'Markdown'): Promise<void> {
    if (!this.botToken) {
      this.logger.warn('Telegram bot not configured, skipping sendRawMessageToChat');
      return;
    }
    const payload: any = {
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    };

    // If caller explicitly passed a parseMode, include it; otherwise send plain text
    if (parseMode) payload.parse_mode = parseMode;

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, payload);
      if (!response.data?.ok) {
        const desc = response.data?.description || 'Unknown';
        this.logger.error(`Telegram API error: ${desc}`);
        throw new Error(desc);
      }
    } catch (err: any) {
      if (err.response) {
        const status = err.response.status;
        const desc = err.response.data?.description || err.message;
        this.logger.error(`Failed to sendRawMessageToChat - Telegram API ${status}: ${desc}`);
      } else {
        this.logger.error(`Failed to sendRawMessageToChat: ${err?.message || err}`);
      }
      throw err;
    }
  }

  /**
   * Register webhook URL with Telegram
   */
  async setWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
    if (!this.botToken) {
      return { success: false, message: 'TELEGRAM_BOT_TOKEN not configured' };
    }

    if (!webhookUrl) {
      return { success: false, message: 'Webhook URL is required' };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message'],
      });

      if (response.data?.ok) {
        this.logger.log(`Webhook registered: ${webhookUrl}`);
        return { success: true, message: `Webhook registered: ${webhookUrl}` };
      } else {
        const desc = response.data?.description || 'Unknown error';
        return { success: false, message: desc };
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.description || err.message || String(err);
      this.logger.error(`Failed to set webhook: ${errorMsg}`);
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Get current webhook info
   */
  async getWebhookInfo(): Promise<any> {
    if (!this.botToken) {
      return { ok: false, error: 'Bot token not configured' };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/getWebhookInfo`);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.description || err.message || String(err);
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(): Promise<{ success: boolean; message: string }> {
    if (!this.botToken) {
      return { success: false, message: 'Bot token not configured' };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/deleteWebhook`);
      if (response.data?.ok) {
        this.logger.log('Webhook deleted');
        return { success: true, message: 'Webhook deleted' };
      } else {
        const desc = response.data?.description || 'Unknown error';
        return { success: false, message: desc };
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.description || err.message || String(err);
      return { success: false, message: errorMsg };
    }
  }

  // Convenience methods for specific notification types
  async notifyOrderCreated(orderId: string, amount: number, currency: string): Promise<void> {
    await this.sendNotification({
      type: 'order_created',
      orderId,
      amount,
      currency,
      message: `New order created for ${amount} ${currency}`,
      timestamp: new Date()
    });
  }

  async notifyPaymentSuccess(orderId: string, amount: number, currency: string, usdcReceived: number): Promise<void> {
    await this.sendNotification({
      type: 'payment_success',
      orderId,
      amount,
      currency,
      usdcReceived,
      message: `Payment completed successfully! User paid ${amount} ${currency} and received ${usdcReceived} USDC`,
      timestamp: new Date()
    });
  }

  async notifyPaymentFailed(orderId: string, error: string): Promise<void> {
    await this.sendNotification({
      type: 'payment_failed',
      orderId,
      error,
      message: `Payment failed for order ${orderId}`,
      timestamp: new Date()
    });
  }

  async notifyOrderCancelled(orderId: string, amount: number, currency: string): Promise<void> {
    await this.sendNotification({
      type: 'order_cancelled',
      orderId,
      amount,
      currency,
      message: `Order cancelled due to timeout - no payment received within 15 minutes`,
      timestamp: new Date()
    });
  }

  async notifyServerEvent(message: string): Promise<void> {
    await this.sendNotification({
      type: 'server_event',
      message,
      timestamp: new Date()
    });
  }
}

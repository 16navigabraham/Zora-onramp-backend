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
    const response = await axios.post(`${this.baseUrl}/sendMessage`, {
      chat_id: this.chatId,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });

    if (!response.data.ok) {
      throw new Error(`Telegram API error: ${response.data.description}`);
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

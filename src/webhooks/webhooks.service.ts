import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { FlutterwaveService } from '../flutterwave/flutterwave.service';
import { OrderService } from '../orders/orders.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private flutterwaveService: FlutterwaveService,
    private orderService: OrderService,
    private telegramService: TelegramService,
  ) {}

  async handleFlutterwaveWebhook(
    signature: string,
    payload: any,
  ): Promise<void> {
    this.logger.log('🔍 Validating webhook signature...');
    
    if (!this.flutterwaveService.verifyWebhookSignature(signature)) {
      this.logger.error('❌ Invalid webhook signature - rejecting request');
      await this.telegramService.notifyServerEvent(
        '⚠️ SECURITY ALERT: Invalid webhook signature received from Flutterwave'
      );
      throw new UnauthorizedException('Invalid signature');
    }

    this.logger.log('✅ Webhook signature verified');

    const { event, data } = payload;

    this.logger.log(`📋 Event type: ${event}`);
    this.logger.log(`📊 Event status: ${data?.status}`);
    this.logger.log(`💰 Amount: ${data?.amount} ${data?.currency}`);
    this.logger.log(`🆔 Transaction reference: ${data?.tx_ref}`);

    if (event === 'charge.completed' && data.status === 'successful') {
      const orderId = data.tx_ref;
      this.logger.log(`🚀 Processing payment for order: ${orderId}`);

      try {
        await this.orderService.processPayment(orderId);
        this.logger.log(`✅ Payment processed successfully for order: ${orderId}`);
      } catch (error) {
        this.logger.error(
          `❌ Failed to process payment for order ${orderId}: ${error.message}`,
        );
        await this.telegramService.notifyServerEvent(
          `⚠️ Payment processing failed for ${orderId}: ${error.message}`
        );
      }
    } else {
      this.logger.warn(
        `⚠️ Event not processed - Event: ${event}, Status: ${data?.status}`,
      );
      await this.telegramService.notifyServerEvent(
        `ℹ️ Unprocessed webhook: ${event} (${data?.status}) for order ${data?.tx_ref || 'unknown'}`
      );
    }
  }
}

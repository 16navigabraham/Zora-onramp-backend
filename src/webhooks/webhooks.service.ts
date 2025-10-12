import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { FlutterwaveService } from 'src/flutterwave/flutterwave.service';
import { OrderService } from 'src/orders/orders.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private flutterwaveService: FlutterwaveService,
    private orderService: OrderService,
  ) {}

  async handleFlutterwaveWebhook(
    signature: string,
    payload: any,
  ): Promise<void> {
    if (!this.flutterwaveService.verifyWebhookSignature(signature)) {
      this.logger.error('Invalid webhook signature');
      throw new UnauthorizedException('Invalid signature');
    }

    this.logger.log('Webhook signature verified');

    const { event, data } = payload;

    this.logger.log(`Event type: ${event}`);
    this.logger.log(`Event status: ${data?.status}`);

    if (event === 'charge.completed' && data.status === 'successful') {
      const orderId = data.tx_ref;
      this.logger.log(`Processing payment for order: ${orderId}`);

      try {
        await this.orderService.processPayment(orderId);
        this.logger.log(`Payment processed successfully for order: ${orderId}`);
      } catch (error) {
        this.logger.error(
          `Failed to process payment for order ${orderId}: ${error.message}`,
        );
      }
    } else {
      this.logger.warn(
        'Event not processed - not a successful charge completion',
      );
    }
  }
}

import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { sign } from 'crypto';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('flutterwave')
  @HttpCode(HttpStatus.OK)
  async handleFlutterwaveWebhook(
    @Headers('verif-hash') signature: string,
    @Body() payload: any,
  ) {
    this.logger.log('Webhook received from Flutterwave');
    // Avoid logging full webhook payloads (may contain PII or payment details).
    // Log a short summary instead.
    const summary = {
      event: payload?.event || 'unknown',
      tx_ref: payload?.data?.tx_ref || payload?.data?.reference || null,
      status: payload?.data?.status || null,
    };
    this.logger.debug('Webhook summary: ' + JSON.stringify(summary));

    await this.webhooksService.handleFlutterwaveWebhook(signature, payload);

    return {
      success: true,
      message: 'Webhook processed successfully',
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testWebhook(@Body() payload: any) {
    this.logger.log('Test webhook received');

    return {
      success: true,
      message: 'Test webhook received',
    };
  }
}

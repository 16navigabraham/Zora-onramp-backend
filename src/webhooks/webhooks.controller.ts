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
    this.logger.log('🔔 Webhook received from Flutterwave');
    
    // Log summary for debugging
    const summary = {
      event: payload?.event || 'unknown',
      tx_ref: payload?.data?.tx_ref || payload?.data?.reference || null,
      status: payload?.data?.status || null,
      amount: payload?.data?.amount || null,
      currency: payload?.data?.currency || null,
      signaturePresent: !!signature,
    };
    this.logger.log(`📊 Webhook summary: ${JSON.stringify(summary)}`);

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
      timestamp: new Date().toISOString(),
      payload: payload,
    };
  }

  @Post('flutterwave-test')
  @HttpCode(HttpStatus.OK)
  async testFlutterwaveWebhook(
    @Headers('verif-hash') signature: string,
    @Body() payload: any,
  ) {
    this.logger.log('Flutterwave test webhook received');
    this.logger.log(`Signature: ${signature?.substring(0, 10)}...`);
    
    const summary = {
      event: payload?.event || 'unknown',
      tx_ref: payload?.data?.tx_ref || payload?.data?.reference || null,
      status: payload?.data?.status || null,
      signatureProvided: !!signature,
      signatureLength: signature?.length || 0,
    };
    
    this.logger.log('Test webhook summary: ' + JSON.stringify(summary));

    // Test signature validation
    const isValid = this.webhooksService['flutterwaveService'].verifyWebhookSignature(signature);
    
    return {
      success: true,
      message: 'Flutterwave test webhook received',
      timestamp: new Date().toISOString(),
      signatureValid: isValid,
      summary: summary,
    };
  }
}

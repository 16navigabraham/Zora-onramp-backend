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
    this.logger.log('==============================================');
    this.logger.log('Webhook received from Flutterwave');
    this.logger.log('==============================================');
    this.logger.debug('Payload: ', JSON.stringify(payload, null, 2));

    await this.webhooksService.handleFlutterwaveWebhook(signature, payload);

    return {
      success: true,
      message: 'Webhook processed successfully',
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testWebhook(@Body() payload: any) {
    this.logger.log('==============================================');
    this.logger.log('Test webhook received');

    return {
      success: true,
      message: 'Test webhook received',
      receivedData: payload,
    };
  }
}

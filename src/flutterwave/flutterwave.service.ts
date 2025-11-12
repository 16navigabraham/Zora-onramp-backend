import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface VirtualAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  reference: string;
}

@Injectable()
export class FlutterwaveService {
  private readonly logger = new Logger(FlutterwaveService.name);
  private readonly apiUrl = 'https://api.flutterwave.com/v3';

  constructor(private configService: ConfigService) {}

  async createVirtualAccount(
    email: string,
    amount: number,
    orderId: string,
  ): Promise<VirtualAccount> {
    try {
      this.logger.log(`Creating virtual account for order ${orderId}`);

      const secretKey = this.configService.get<string>('flutterwave.secretKey');
      const bvn = this.configService.get<string>('flutterwave.bvn');
      const response = await axios.post(
        `${this.apiUrl}/virtual-account-numbers`,
        {
          email,
          is_permanent: false,
          bvn,
          tx_ref: orderId,
          amount,
          frequency: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data.data;

      this.logger.log(`Virtual account created: ${data.account_number}`);

      return {
        accountNumber: data.account_number,
        accountName: data.account_name,
        bankName: data.bank_name,
        reference: data.order_ref,
      };
    } catch (error) {
      this.logger.error(`Failed to create virtual account: ${error.message}`);
      // Do not log full error.response data (may contain sensitive info). Log status/code only.
      if (error.response && error.response.status) {
        this.logger.error(`Flutterwave API responded with status ${error.response.status}`);
      }
      throw new Error('Failed to create virtual account');
    }
  }

  async verifyTransaction(reference: string): Promise<any> {
    try {
      this.logger.log(`Verifying transaction: ${reference}`);

      const secretKey = this.configService.get<string>('flutterwave.secretKey');

      const response = await axios.get(
        `${this.apiUrl}/transactions/${reference}/verify`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        },
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to verify transaction: ${error.message}`);
      throw error;
    }
  }

  verifyWebhookSignature(signature: string): boolean {
    const webhookHash = this.configService.get<string>(
      'flutterwave.webhookHash',
    );
    return signature === webhookHash;
  }
}

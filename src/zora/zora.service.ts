import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

// Use require for the SDK
const ZoraSDK = require('@zoralabs/coins-sdk');

@Injectable()
export class ZoraService {
  private readonly logger = new Logger(ZoraService.name);

  async getAddressFromUsername(username: string): Promise<string> {
    try {
      this.logger.log(`Resolving Zora username: ${username}`);

      // If it's already an address, return it
      if (ethers.isAddress(username)) {
        this.logger.log(`Input is already an address: ${username}`);
        return username;
      }

      // Try to get Zora profile
      const response = await ZoraSDK.getProfile({
        identifier: username,
      });

      const zoraAddress = response.data.profile.publicWallet.walletAddress;

      if (!zoraAddress) {
        throw new Error('No wallet address found for this username');
      }

      this.logger.log(`Resolved ${username} to ${zoraAddress}`);

      return zoraAddress;
    } catch (error) {
      this.logger.error(`Failed to resolve Zora username: ${error.message}`);
      throw new Error(`Could not resolve username: ${username}`);
    }
  }

  async validateUsername(username: string): Promise<{
    isValid: boolean;
    address?: string;
    error?: string;
  }> {
    try {
      const address = await this.getAddressFromUsername(username);
      return {
        isValid: true,
        address,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
      };
    }
  }
}

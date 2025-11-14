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

      const profile = response.data.profile;

      // Check if profile exists
      if (!profile) {
        throw new Error('Profile not found for this username');
      }

      // Priority 1: Check linkedWallets for SMART_WALLET
      let smartWallet: string | undefined;
      if (profile.linkedWallets?.edges?.length > 0) {
        const smartWalletEdge = profile.linkedWallets.edges.find(
          (edge: any) => edge.node?.walletType === 'SMART_WALLET'
        );
        smartWallet = smartWalletEdge?.node?.walletAddress;
      }

      // Priority 2: Fall back to publicWallet (external wallet)
      const externalWallet = profile.publicWallet?.walletAddress;
      
      const zoraAddress = smartWallet || externalWallet;

      if (!zoraAddress) {
        throw new Error('No wallet address found for this username');
      }

      const walletType = smartWallet ? 'smart_wallet' : 'external_wallet';
      this.logger.log(`Resolved ${username} to ${zoraAddress} (${walletType})`);

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

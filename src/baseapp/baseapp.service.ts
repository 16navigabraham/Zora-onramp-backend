import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class BaseAppService {
  private readonly logger = new Logger(BaseAppService.name);
  private readonly provider: ethers.JsonRpcProvider;

  constructor(private configService: ConfigService) {
    // Use Ethereum mainnet for ENS/Basename resolution
    // Basename (.base.eth) is registered on Ethereum mainnet via L2 resolver
    // Using Cloudflare's public Ethereum RPC for reliability
    const ethMainnetRpc = 'https://cloudflare-eth.com';
    this.provider = new ethers.JsonRpcProvider(ethMainnetRpc);
    this.logger.log('BaseApp service initialized with Ethereum mainnet provider for ENS resolution');
  }

  async getAddressFromUsername(usernameOrAddress: string): Promise<string> {
    this.logger.log(`Resolving Base App username: ${usernameOrAddress}`);

    // If it's already an address, return it
    if (ethers.isAddress(usernameOrAddress)) {
      this.logger.log(`Input is already an address: ${usernameOrAddress}`);
      return usernameOrAddress;
    }

    // At this point, it's a username, not an address
    const username: string = usernameOrAddress;
    
    // Base App supports both .base.eth and .farcaster.eth ENS names
    // Frontend should send complete ENS name (e.g., abrahamnavig.base.eth or abrahamnavig.farcaster.eth)
    const ensName: string = username;

    try {
      // Basename uses CCIP-Read (EIP-3668) for L2 resolution
      // The standard resolveName should support this, but we need to handle errors gracefully
      this.logger.log(`Resolving ENS/Basename: ${ensName}`);
      
      const resolvedAddress = await this.provider.resolveName(ensName);

      if (!resolvedAddress) {
        throw new Error(`ENS name ${ensName} not found or not registered`);
      }

      this.logger.log(`Resolved ${ensName} to ${resolvedAddress}`);

      return resolvedAddress;
    } catch (error) {
      this.logger.error(`Failed to resolve ${ensName}: ${error.message}`);
      
      // Provide helpful error message
      if (error.message.includes('could not decode result data')) {
        throw new Error(`ENS name ${ensName} is not registered or has no resolver configured. Please check if this Basename exists.`);
      }
      
      throw new Error(`Could not resolve ${ensName}: ${error.message}`);
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

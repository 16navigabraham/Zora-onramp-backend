import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class BaseAppService {
  private readonly logger = new Logger(BaseAppService.name);
  private readonly provider: ethers.JsonRpcProvider;

  constructor(private configService: ConfigService) {
    // Use Base mainnet RPC for ENS resolution
    const rpcUrl = this.configService.get<string>('blockchain.rpcUrl') || 'https://mainnet.base.org';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
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
      // Resolve ENS name to address using Base mainnet provider
      this.logger.log(`Resolving ENS name: ${ensName}`);
      const resolvedAddress = await this.provider.resolveName(ensName);

      if (!resolvedAddress) {
        throw new Error(`No wallet address found for ENS name: ${ensName}`);
      }

      this.logger.log(`Resolved ${ensName} to ${resolvedAddress} via ENS`);

      return resolvedAddress;
    } catch (error) {
      this.logger.error(`Failed to resolve Base App ENS name: ${error.message}`);
      throw new Error(`Could not resolve Base App ENS name: ${ensName}`);
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

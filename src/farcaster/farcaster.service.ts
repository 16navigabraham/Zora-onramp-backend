import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import axios from 'axios';

@Injectable()
export class FarcasterService {
  private readonly logger = new Logger(FarcasterService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.neynar.com/v2/farcaster';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('farcaster.apiKey') || '';
    if (!this.apiKey) {
      this.logger.warn('NEYNAR_API_KEY not configured');
    }
  }

  async getAddressFromUsername(username: string): Promise<string> {
    // Strip @ prefix if present (Farcaster usernames don't use @)
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    
    try {
      this.logger.log(`Resolving Farcaster username: ${cleanUsername}`);

      // If it's already an address, return it
      if (ethers.isAddress(cleanUsername)) {
        this.logger.log(`Input is already an address: ${cleanUsername}`);
        return cleanUsername;
      }

      // Fetch user from Neynar API
      const response = await axios.get(`${this.baseUrl}/user/by_username`, {
        params: {
          username: cleanUsername,
        },
        headers: {
          'x-api-key': this.apiKey,
        },
      });

      const user = response.data.user;

      if (!user) {
        throw new Error('User not found for this username');
      }

      // Priority 1: Primary verified ETH address
      const primaryEthAddress = user.verified_addresses?.primary?.eth_address;
      
      // Priority 2: First verified ETH address
      const firstVerifiedEth = user.verified_addresses?.eth_addresses?.[0];
      
      // Priority 3: Custody address (Farcaster account address)
      const custodyAddress = user.custody_address;

      const farcasterAddress = primaryEthAddress || firstVerifiedEth || custodyAddress;

      if (!farcasterAddress) {
        throw new Error('No wallet address found for this username');
      }

      const addressType = primaryEthAddress 
        ? 'primary_verified' 
        : firstVerifiedEth 
        ? 'verified' 
        : 'custody';

      this.logger.log(`Resolved ${cleanUsername} to ${farcasterAddress} (${addressType})`);

      return farcasterAddress;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          this.logger.error(`Farcaster user not found: ${cleanUsername}`);
          throw new Error(`Farcaster user not found: ${cleanUsername}`);
        } else if (error.response?.status === 400) {
          this.logger.error(`Invalid Farcaster username format: ${cleanUsername}`);
          throw new Error(`Invalid Farcaster username: ${cleanUsername}. Usernames cannot contain underscores or special characters.`);
        } else if (error.response?.status === 429) {
          this.logger.error(`Neynar API rate limit exceeded`);
          throw new Error(`Rate limit exceeded. Please try again in a few minutes or check your NEYNAR_API_KEY.`);
        }
      }
      this.logger.error(`Failed to resolve Farcaster username: ${error.message}`);
      throw new Error(`Could not resolve username: ${cleanUsername}`);
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

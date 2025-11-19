import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { FarcasterService } from './farcaster.service';

@Controller('farcaster')
export class FarcasterController {
  constructor(private readonly farcasterService: FarcasterService) {}

  @Get('resolve/:username')
  async resolveUsername(@Param('username') username: string) {
    try {
      const address = await this.farcasterService.getAddressFromUsername(username);
      
      return {
        success: true,
        username,
        address,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
          username,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('validate/:username')
  async validateUsername(@Param('username') username: string) {
    const result = await this.farcasterService.validateUsername(username);
    
    return {
      success: true,
      username,
      ...result,
      timestamp: new Date().toISOString(),
    };
  }
}

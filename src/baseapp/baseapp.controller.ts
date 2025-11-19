import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { BaseAppService } from './baseapp.service';

@Controller('baseapp')
export class BaseAppController {
  constructor(private readonly baseAppService: BaseAppService) {}

  @Get('resolve/:username')
  async resolveUsername(@Param('username') username: string) {
    try {
      const baseAppAddress = await this.baseAppService.getAddressFromUsername(username);
      return {
        success: true,
        username,
        address: baseAppAddress,
        message: 'Successfully resolved Base App username to wallet address',
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
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get('validate/:username')
  async validateUsername(@Param('username') username: string) {
    const result = await this.baseAppService.validateUsername(username);
    
    if (result.isValid) {
      return {
        success: true,
        username,
        isValid: true,
        address: result.address,
        message: 'Valid Base App username',
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        success: false,
        username,
        isValid: false,
        error: result.error,
        message: 'Invalid Base App username',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

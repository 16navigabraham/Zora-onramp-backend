import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ZoraService } from './zora.service';

@Controller('zora')
export class ZoraController {
  constructor(private readonly zoraService: ZoraService) {}

  @Get('resolve/:username')
  async resolveUsername(@Param('username') username: string) {
    try {
      const address = await this.zoraService.getAddressFromUsername(username);
      
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
    const result = await this.zoraService.validateUsername(username);
    
    return {
      success: true,
      username,
      ...result,
      timestamp: new Date().toISOString(),
    };
  }
}

import { Controller, Get, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { BalanceCheckService } from './balance-check.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('admin/balance-config')
@UseGuards(ApiKeyGuard)
export class BalanceConfigController {
  private readonly logger = new Logger(BalanceConfigController.name);

  constructor(private readonly balanceCheckService: BalanceCheckService) {}

  @Get()
  getConfig() {
    return {
      lowThresholdUsdc: this.balanceCheckService['lowThresholdUsdc'],
      checkIntervalMinutes: this.balanceCheckService['checkIntervalMinutes'],
      alertCooldownMinutes: this.balanceCheckService['alertCooldownMinutes'],
      hysteresisUsdc: this.balanceCheckService['hysteresisUsdc'],
      status: this.balanceCheckService.getStatus(),
    };
  }

  @Post()
  updateConfig(@Body() body: any) {
    const { lowThresholdUsdc, checkIntervalMinutes, alertCooldownMinutes, hysteresisUsdc } = body;

    if (typeof lowThresholdUsdc === 'number') this.balanceCheckService.setLowThresholdUsdc(lowThresholdUsdc);
    if (typeof checkIntervalMinutes === 'number') this.balanceCheckService.setCheckIntervalMinutes(checkIntervalMinutes);
    if (typeof alertCooldownMinutes === 'number') this.balanceCheckService.setAlertCooldownMinutes(alertCooldownMinutes);
    if (typeof hysteresisUsdc === 'number') this.balanceCheckService.setHysteresisUsdc(hysteresisUsdc);

    this.logger.log('Balance-check configuration updated via admin endpoint');

    return this.getConfig();
  }
}

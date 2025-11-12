import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ContractsService } from '../contracts/contracts.service';
import { TelegramService } from '../telegram/telegram.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BalanceCheckService implements OnModuleInit {
  private readonly logger = new Logger(BalanceCheckService.name);
  private lowThresholdUsdc: number;
  private checkIntervalMinutes: number;
  private alertCooldownMinutes: number;
  private hysteresisUsdc: number;
  private lastAlertAt: number | null = null; // timestamp ms
  private alerted: boolean = false;
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly contractsService: ContractsService,
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
  ) {
    const cfg = this.configService.get('maintenance')?.balanceCheck || {};
    this.lowThresholdUsdc = cfg.lowThresholdUsdc ?? 1;
    this.checkIntervalMinutes = cfg.checkIntervalMinutes ?? 10;
    this.alertCooldownMinutes = cfg.alertCooldownMinutes ?? 360;
    this.hysteresisUsdc = cfg.hysteresisUsdc ?? 5;
  }

  // Runtime setters to adjust configuration without restarting
  setLowThresholdUsdc(value: number) {
    this.lowThresholdUsdc = value;
  }

  setCheckIntervalMinutes(value: number) {
    this.checkIntervalMinutes = value;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      const ms = this.checkIntervalMinutes * 60 * 1000;
      this.intervalHandle = setInterval(() => this.checkBalance(), ms);
    }
  }

  setAlertCooldownMinutes(value: number) {
    this.alertCooldownMinutes = value;
  }

  setHysteresisUsdc(value: number) {
    this.hysteresisUsdc = value;
  }

  onModuleInit() {
    // Start periodic check
    this.logger.log(`Starting balance check every ${this.checkIntervalMinutes} minutes. Threshold: ${this.lowThresholdUsdc} USDC`);
    const ms = this.checkIntervalMinutes * 60 * 1000;
    this.intervalHandle = setInterval(() => this.checkBalance(), ms);
    // Run an immediate check at startup after ContractsService signals readiness.
    (async () => {
      try {
        if (typeof this.contractsService.ready === 'function') {
          await this.contractsService.ready();
        }
        await this.checkBalance();
      } catch (err: any) {
        this.logger.error(`Initial balance check failed: ${err?.message || err}`);
      }
    })();
  }

  private async checkBalance() {
    try {
      const balanceStr = await this.contractsService.getContractBalance();
      const balance = parseFloat(balanceStr);

      this.logger.log(`Contract balance: ${balance} USDC`);

      const now = Date.now();

      if (!this.alerted && balance < this.lowThresholdUsdc) {
        // No prior alert or balance recovered and dropped again
  if (!this.lastAlertAt || now - this.lastAlertAt >= this.alertCooldownMinutes * 60 * 1000) {
          await this.sendLowBalanceAlert(balance);
          this.alerted = true;
          this.lastAlertAt = now;
        } else {
          this.logger.log('Low balance detected but still in cooldown; skipping alert');
        }
      } else if (this.alerted && balance > this.lowThresholdUsdc + this.hysteresisUsdc) {
        // Balance recovered above threshold + hysteresis; reset alert state so we can alert again later
        this.logger.log('Balance recovered above hysteresis margin; clearing alerted state');
        this.alerted = false;
      }
    } catch (error) {
      this.logger.error(`Balance check failed: ${error.message}`);
      await this.telegramService.notifyServerEvent(`Balance check failed: ${error.message}`);
    }
  }

  private async sendLowBalanceAlert(balance: number) {
    const contractAddress = process.env.CONTRACT_ADDRESS || 'unknown';
    const message = `🔔 LOW USDC BALANCE — Contract ${contractAddress} has ${balance} USDC which is below the configured threshold of ${this.lowThresholdUsdc} USDC. Please top up.`;
    this.logger.warn(message);
    await this.telegramService.notifyServerEvent(message);
  }

  /**
   * Return current alerting status for monitoring purposes.
   */
  getStatus(): { lastAlertAt: number | null; alerted: boolean } {
    return {
      lastAlertAt: this.lastAlertAt,
      alerted: this.alerted,
    };
  }
}

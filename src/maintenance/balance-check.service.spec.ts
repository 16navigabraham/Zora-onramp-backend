import { Test, TestingModule } from '@nestjs/testing';
import { BalanceCheckService } from './balance-check.service';
import { ContractsService } from 'src/contracts/contracts.service';
import { TelegramService } from 'src/telegram/telegram.service';
import { ConfigService } from '@nestjs/config';

describe('BalanceCheckService', () => {
  let service: BalanceCheckService;
  let contractsService: Partial<ContractsService>;
  let telegramService: Partial<TelegramService>;

  beforeEach(async () => {
    jest.useFakeTimers();

    contractsService = {
      getContractBalance: jest.fn(),
    } as any;

    telegramService = {
      notifyServerEvent: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceCheckService,
        { provide: ContractsService, useValue: contractsService },
        { provide: TelegramService, useValue: telegramService },
  { provide: ConfigService, useValue: { get: () => ({ balanceCheck: { lowThresholdUsdc: 1, checkIntervalMinutes: 1, alertCooldownMinutes: 0, hysteresisUsdc: 0 } }) } },
      ],
    }).compile();

    service = module.get<BalanceCheckService>(BalanceCheckService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('should alert when balance below threshold and respect cooldown', async () => {
    // first call returns 0.5 -> should alert
    (contractsService.getContractBalance as jest.Mock).mockResolvedValueOnce('0.5');

    // simulate check
    await service['checkBalance']();
    expect(contractsService.getContractBalance).toHaveBeenCalledTimes(1);
    expect(telegramService.notifyServerEvent).toHaveBeenCalledTimes(1);

    // next call still low but within cooldown -> no new alert
    (contractsService.getContractBalance as jest.Mock).mockResolvedValueOnce('0.4');
    await service['checkBalance']();
    expect(telegramService.notifyServerEvent).toHaveBeenCalledTimes(1);
  });

  it('should reset alerted state when balance recovers above hysteresis', async () => {
    // initial low -> alert
    (contractsService.getContractBalance as jest.Mock).mockResolvedValueOnce('0.5');
    await service['checkBalance']();
    expect(telegramService.notifyServerEvent).toHaveBeenCalledTimes(1);

    // recovered above hysteresis (threshold 1 + hysteresis 0) -> reset
    (contractsService.getContractBalance as jest.Mock).mockResolvedValueOnce('2.0');
    await service['checkBalance']();

    // drop again -> should alert again
    (contractsService.getContractBalance as jest.Mock).mockResolvedValueOnce('0.2');
    await service['checkBalance']();
    expect(telegramService.notifyServerEvent).toHaveBeenCalledTimes(2);
  });
});

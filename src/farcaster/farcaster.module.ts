import { Module } from '@nestjs/common';
import { FarcasterService } from './farcaster.service';
import { FarcasterController } from './farcaster.controller';

@Module({
  providers: [FarcasterService],
  controllers: [FarcasterController],
  exports: [FarcasterService],
})
export class FarcasterModule {}

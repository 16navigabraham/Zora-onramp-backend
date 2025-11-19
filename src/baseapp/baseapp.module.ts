import { Module } from '@nestjs/common';
import { BaseAppService } from './baseapp.service';
import { BaseAppController } from './baseapp.controller';

@Module({
  providers: [BaseAppService],
  controllers: [BaseAppController],
  exports: [BaseAppService],
})
export class BaseAppModule {}

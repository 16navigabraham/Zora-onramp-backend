import { Module } from '@nestjs/common';
import { ZoraService } from './zora.service';
import { ZoraController } from './zora.controller';

@Module({
  controllers: [ZoraController],
  providers: [ZoraService],
  exports: [ZoraService],
})
export class ZoraModule {}

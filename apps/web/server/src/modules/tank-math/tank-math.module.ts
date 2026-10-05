import { Module } from '@nestjs/common';

import { BuildsModule } from '../builds';
import { TanksModule } from '../tanks';
import { TankMathReaderService } from './services/tank-math-reader.service';
import { TankMathController } from './tank-math.controller';

@Module({
  imports: [BuildsModule, TanksModule],
  controllers: [TankMathController],
  providers: [TankMathReaderService]
})
export class TankMathModule {}

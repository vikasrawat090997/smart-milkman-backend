import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsLedger } from '../entities/payments-ledger.entity';
import { User } from '../entities/user.entity';
import { PaymentEditHistory } from '../entities/payment-edit-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentsLedger, User, PaymentEditHistory])],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}

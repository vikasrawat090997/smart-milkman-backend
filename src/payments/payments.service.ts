import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsLedger } from '../entities/payments-ledger.entity';
import { User } from '../entities/user.entity';
import { PaymentEditHistory } from '../entities/payment-edit-history.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentsLedger)
    private paymentsLedgerRepository: Repository<PaymentsLedger>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PaymentEditHistory)
    private paymentEditHistoryRepository: Repository<PaymentEditHistory>,
  ) {}

  async createPayment(recordedByUserId: string, dto: CreatePaymentDto) {
    // Check user exists
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('Target user not found');
    }

    const payment = this.paymentsLedgerRepository.create({
      userId: dto.userId,
      date: new Date(dto.date + 'T00:00:00Z'),
      amountPaid: dto.amountPaid,
      paymentMode: dto.paymentMode,
      targetRole: dto.targetRole || user.role,
      recordedBy: recordedByUserId,
    });

    return this.paymentsLedgerRepository.save(payment);
  }

  async updatePayment(id: string, dto: { amountPaid?: number; date?: string; paymentMode?: string }) {
    const payment = await this.paymentsLedgerRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    const oldAmount = Number(payment.amountPaid);
    const oldDate = new Date(payment.date);
    const oldPaymentMode = payment.paymentMode;

    let changed = false;
    let newAmount = oldAmount;
    let newDate = oldDate;
    let newPaymentMode = oldPaymentMode;

    if (dto.amountPaid !== undefined && Number(dto.amountPaid) !== oldAmount) {
      newAmount = Number(dto.amountPaid);
      payment.amountPaid = newAmount;
      changed = true;
    }
    if (dto.date !== undefined) {
      const newD = new Date(dto.date + 'T00:00:00Z');
      // Normalize dates to check equality
      if (newD.toISOString().split('T')[0] !== oldDate.toISOString().split('T')[0]) {
        newDate = newD;
        payment.date = newDate;
        changed = true;
      }
    }
    if (dto.paymentMode !== undefined && dto.paymentMode !== oldPaymentMode) {
      newPaymentMode = dto.paymentMode as any;
      payment.paymentMode = newPaymentMode;
      changed = true;
    }

    if (changed) {
      const history = this.paymentEditHistoryRepository.create({
        paymentId: id,
        oldAmount,
        newAmount,
        oldDate,
        newDate,
        oldPaymentMode,
        newPaymentMode,
      });
      await this.paymentEditHistoryRepository.save(history);
    }

    return this.paymentsLedgerRepository.save(payment);
  }

  async getPaymentsForUser(userId: string) {
    return this.paymentsLedgerRepository.find({
      where: { userId },
      order: { date: 'DESC' },
    });
  }
}

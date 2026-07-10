import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { PaymentsLedger } from './payments-ledger.entity';

@Entity({ name: 'payment_edit_history' })
export class PaymentEditHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'payment_id' })
  paymentId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'old_amount' })
  oldAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'new_amount' })
  newAmount: number;

  @Column({ type: 'date', name: 'old_date' })
  oldDate: Date;

  @Column({ type: 'date', name: 'new_date' })
  newDate: Date;

  @Column({ type: 'varchar', length: 50, name: 'old_payment_mode' })
  oldPaymentMode: string;

  @Column({ type: 'varchar', length: 50, name: 'new_payment_mode' })
  newPaymentMode: string;

  @CreateDateColumn({ name: 'edited_at' })
  editedAt: Date;

  @ManyToOne(() => PaymentsLedger, (payment) => payment.editHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: PaymentsLedger;
}

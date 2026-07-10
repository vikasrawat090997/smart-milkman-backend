import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { PaymentEditHistory } from './payment-edit-history.entity';

export enum PaymentMode {
  CASH = 'cash',
  MANUAL_UPI = 'manual_upi',
}

@Entity({ name: 'payments_ledger' })
export class PaymentsLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'amount_paid' })
  amountPaid: number;

  @Column({ type: 'enum', enum: PaymentMode, name: 'payment_mode' })
  paymentMode: PaymentMode;

  @Column({ type: 'varchar', length: 20, name: 'target_role', nullable: true })
  targetRole: string;

  @Column({ type: 'varchar', length: 36, name: 'recorded_by' })
  recordedBy: string;

  @ManyToOne(() => User, (user) => user.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, (user) => user.recordedPayments)
  @JoinColumn({ name: 'recorded_by' })
  recorder: User;

  @OneToMany(() => PaymentEditHistory, (history) => history.payment)
  editHistory: PaymentEditHistory[];
}

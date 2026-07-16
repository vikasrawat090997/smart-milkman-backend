import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index, Unique } from 'typeorm';
import { RatesHistory } from './rates-history.entity';
import { DailyLedger } from './daily-ledger.entity';
import { PaymentsLedger } from './payments-ledger.entity';

export enum Role {
  MILKMAN = 'milkman',
  FARMER = 'farmer',
  CONSUMER = 'consumer',
  BOTH = 'both',
}

@Entity({ name: 'users' })
@Unique(['mobileNumber', 'role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index('idx_mobile')
  @Column({ type: 'varchar', length: 15, name: 'mobile_number' })
  mobileNumber: string;

  @Column({ type: 'varchar', length: 255, name: 'password_pin' })
  passwordPin: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'text', name: 'milk_types', nullable: true })
  milkTypes: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => RatesHistory, (rate) => rate.user, { cascade: true })
  ratesHistory: RatesHistory[];

  @OneToMany(() => DailyLedger, (ledger) => ledger.user, { cascade: true })
  dailyLedger: DailyLedger[];

  @OneToMany(() => PaymentsLedger, (payment) => payment.user, { cascade: true })
  payments: PaymentsLedger[];

  @OneToMany(() => PaymentsLedger, (payment) => payment.recorder)
  recordedPayments: PaymentsLedger[];
}

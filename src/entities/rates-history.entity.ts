import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { LedgerType } from './daily-ledger.entity';

@Entity({ name: 'rates_history' })
@Index('idx_user_start_milk', ['userId', 'startDate', 'milkType'])
@Index('idx_user_milkman_start_milk', ['userId', 'milkmanId', 'startDate', 'milkType'])
export class RatesHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 36, name: 'milkman_id', nullable: true })
  milkmanId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'rate_per_liter' })
  ratePerLiter: number;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'enum', enum: LedgerType, name: 'rate_type', nullable: true })
  rateType: LedgerType;

  @Column({ type: 'varchar', length: 50, name: 'milk_type', default: 'Buffalo' })
  milkType: string;

  @ManyToOne(() => User, (user) => user.ratesHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'milkman_id' })
  milkman: User;
}

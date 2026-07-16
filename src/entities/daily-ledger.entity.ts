import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './user.entity';

export enum Slot {
  MORNING = 'morning',
  EVENING = 'evening',
}

export enum LedgerType {
  BUY = 'buy',
  SELL_REGULAR = 'sell_regular',
  SELL_WALKIN = 'sell_walkin',
}

@Entity({ name: 'daily_ledger' })
@Unique('unique_user_milkman_date_slot_type_milk', ['userId', 'milkmanId', 'date', 'slot', 'type', 'milkType'])
export class DailyLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 36, name: 'milkman_id', nullable: true })
  milkmanId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'enum', enum: Slot })
  slot: Slot;

  @Column({ type: 'varchar', length: 50, name: 'milk_type', default: 'Buffalo' })
  milkType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, name: 'quantity_liters' })
  quantityLiters: number;

  @Column({ type: 'enum', enum: LedgerType })
  type: LedgerType;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'rate_applied' })
  rateApplied: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'total_price',
    default: 0.00,
  })
  totalPrice: number;

  @ManyToOne(() => User, (user) => user.dailyLedger, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'milkman_id' })
  milkman: User;
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'rates_history' })
@Index('idx_user_start', ['userId', 'startDate'])
@Index('idx_user_milkman_start', ['userId', 'milkmanId', 'startDate'])
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

  @ManyToOne(() => User, (user) => user.ratesHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'milkman_id' })
  milkman: User;
}

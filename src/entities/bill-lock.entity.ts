import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'bill_locks' })
@Unique('unique_month_milkman', ['monthYear', 'milkmanId'])
export class BillLock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 7, name: 'month_year' })
  monthYear: string;

  @Column({ type: 'varchar', length: 36, name: 'milkman_id', nullable: true })
  milkmanId: string;

  @Column({ type: 'boolean', default: false, name: 'is_locked' })
  isLocked: boolean;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'locked_at' })
  lockedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'milkman_id' })
  milkman: User;
}

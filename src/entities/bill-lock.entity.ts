import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'bill_locks' })
export class BillLock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @Column({ type: 'varchar', length: 36, name: 'milkman_id', nullable: true })
  milkmanId: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id', nullable: true })
  userId?: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_locked' })
  isLocked: boolean;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'locked_at' })
  lockedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'milkman_id' })
  milkman: User;
}

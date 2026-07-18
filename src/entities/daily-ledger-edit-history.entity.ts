import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { DailyLedger } from './daily-ledger.entity';

@Entity({ name: 'daily_ledger_edit_history' })
export class DailyLedgerEditHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'ledger_id' })
  ledgerId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'old_quantity' })
  oldQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'new_quantity' })
  newQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'old_rate' })
  oldRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'new_rate' })
  newRate: number;

  @Column({ type: 'varchar', length: 36, name: 'edited_by' })
  editedBy: string;

  @CreateDateColumn({ name: 'edited_at' })
  editedAt: Date;

  @ManyToOne(() => DailyLedger, (ledger) => ledger.editHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ledger_id' })
  ledger: DailyLedger;
}

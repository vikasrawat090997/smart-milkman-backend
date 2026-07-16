import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'milkman_customers' })
@Unique('unique_milkman_customer', ['milkmanId', 'customerId'])
export class MilkmanCustomer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'milkman_id' })
  milkmanId: string;

  @Column({ type: 'varchar', length: 36, name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', length: 100, name: 'custom_name', nullable: true })
  customName: string;

  @Column({ type: 'varchar', length: 20, name: 'relationship_role', default: 'both' })
  relationshipRole: string;

  @Column({ type: 'varchar', length: 50, name: 'milk_type', default: 'Buffalo' })
  milkType: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'milkman_id' })
  milkman: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;
}

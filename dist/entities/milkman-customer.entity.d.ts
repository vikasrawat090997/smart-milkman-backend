import { User } from './user.entity';
export declare class MilkmanCustomer {
    id: string;
    milkmanId: string;
    customerId: string;
    customName: string;
    relationshipRole: string;
    milkType: string;
    isActive: boolean;
    deactivatedAt?: Date | null;
    milkman: User;
    customer: User;
}

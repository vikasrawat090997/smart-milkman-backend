import { User } from './user.entity';
export declare class MilkmanCustomer {
    id: string;
    milkmanId: string;
    customerId: string;
    customName: string;
    relationshipRole: string;
    milkman: User;
    customer: User;
}

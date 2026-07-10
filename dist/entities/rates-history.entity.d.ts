import { User } from './user.entity';
export declare class RatesHistory {
    id: string;
    userId: string;
    milkmanId: string;
    ratePerLiter: number;
    startDate: Date;
    user: User;
    milkman: User;
}

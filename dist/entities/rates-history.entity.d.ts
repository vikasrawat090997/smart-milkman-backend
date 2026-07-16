import { User } from './user.entity';
import { LedgerType } from './daily-ledger.entity';
export declare class RatesHistory {
    id: string;
    userId: string;
    milkmanId: string;
    ratePerLiter: number;
    startDate: Date;
    rateType: LedgerType;
    milkType: string;
    user: User;
    milkman: User;
}

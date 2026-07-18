import { User } from './user.entity';
import { DailyLedgerEditHistory } from './daily-ledger-edit-history.entity';
export declare enum Slot {
    MORNING = "morning",
    EVENING = "evening"
}
export declare enum LedgerType {
    BUY = "buy",
    SELL_REGULAR = "sell_regular",
    SELL_WALKIN = "sell_walkin"
}
export declare class DailyLedger {
    id: string;
    userId: string;
    milkmanId: string;
    date: Date;
    slot: Slot;
    milkType: string;
    quantityLiters: number;
    type: LedgerType;
    rateApplied: number;
    totalPrice: number;
    user: User;
    milkman: User;
    editHistory: DailyLedgerEditHistory[];
}

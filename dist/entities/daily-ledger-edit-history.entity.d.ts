import { DailyLedger } from './daily-ledger.entity';
export declare class DailyLedgerEditHistory {
    id: string;
    ledgerId: string;
    oldQuantity: number;
    newQuantity: number;
    oldRate: number;
    newRate: number;
    editedBy: string;
    editedAt: Date;
    ledger: DailyLedger;
}

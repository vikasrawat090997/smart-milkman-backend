import { Slot, LedgerType } from '../../entities/daily-ledger.entity';
export declare class BulkEntryItem {
    userId: string;
    quantityLiters?: number;
}
export declare class BulkSaveDto {
    date: string;
    slot: Slot;
    entries: BulkEntryItem[];
    type?: LedgerType;
}

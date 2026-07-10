import { LedgerType } from '../entities/daily-ledger.entity';
import { LedgerService } from './ledger.service';
import { BulkSaveDto } from './dto/bulk-save.dto';
import { Slot } from '../entities/daily-ledger.entity';
export declare class LedgerController {
    private ledgerService;
    constructor(ledgerService: LedgerService);
    bulkSave(req: any, dto: BulkSaveDto): Promise<{
        message: string;
        count: number;
    }>;
    getSlotEntries(req: any, date: string, slot: Slot, type?: LedgerType): Promise<import("../entities/daily-ledger.entity").DailyLedger[]>;
}

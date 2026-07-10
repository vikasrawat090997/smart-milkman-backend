import { Repository, DataSource } from 'typeorm';
import { DailyLedger, Slot } from '../entities/daily-ledger.entity';
import { RatesHistory } from '../entities/rates-history.entity';
import { User } from '../entities/user.entity';
import { BulkSaveDto } from './dto/bulk-save.dto';
export declare class LedgerService {
    private dailyLedgerRepository;
    private ratesHistoryRepository;
    private userRepository;
    private dataSource;
    constructor(dailyLedgerRepository: Repository<DailyLedger>, ratesHistoryRepository: Repository<RatesHistory>, userRepository: Repository<User>, dataSource: DataSource);
    bulkSave(milkmanId: string, dto: BulkSaveDto): Promise<{
        message: string;
        count: number;
    }>;
    getSlotEntries(milkmanId: string, dateStr: string, slot: Slot): Promise<DailyLedger[]>;
}

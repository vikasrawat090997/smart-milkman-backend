import { LedgerType } from '../../entities/daily-ledger.entity';
export declare class UpdateRateDto {
    ratePerLiter: number;
    startDate: string;
    rateType?: LedgerType;
}

import { IsNotEmpty, IsString, IsEnum, IsArray, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { Slot, LedgerType } from '../../entities/daily-ledger.entity';

export class BulkEntryItem {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsOptional()
  quantityLiters?: number;

  @IsOptional()
  @IsString()
  milkType?: string;
}

export class BulkSaveDto {
  @IsNotEmpty()
  @IsString()
  date: string; // Format: YYYY-MM-DD

  @IsNotEmpty()
  @IsEnum(Slot)
  slot: Slot;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEntryItem)
  entries: BulkEntryItem[];

  @IsOptional()
  @IsEnum(LedgerType)
  type?: LedgerType;
}

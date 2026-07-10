import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, IsNull } from 'typeorm';
import { DailyLedger, Slot, LedgerType } from '../entities/daily-ledger.entity';
import { RatesHistory } from '../entities/rates-history.entity';
import { User } from '../entities/user.entity';
import { BulkSaveDto } from './dto/bulk-save.dto';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(DailyLedger)
    private dailyLedgerRepository: Repository<DailyLedger>,
    @InjectRepository(RatesHistory)
    private ratesHistoryRepository: Repository<RatesHistory>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async bulkSave(milkmanId: string, dto: BulkSaveDto) {
    // Run bulk entries in a single optimized database transaction
    return this.dataSource.transaction(async (manager) => {
      const results: DailyLedger[] = [];

      for (const entry of dto.entries) {
        const qty = entry.quantityLiters !== undefined && entry.quantityLiters !== null 
          ? Number(entry.quantityLiters) 
          : 0;

        // Fetch user details to determine role & check active status
        const user = await manager.findOne(User, {
          where: { id: entry.userId },
        });

        if (!user) {
          throw new BadRequestException(`User not found: ${entry.userId}`);
        }

        if (!user.isActive) {
          continue; // Skip inactive users
        }

        // Determine ledger type: use dto.type if provided, otherwise fall back to role-based
        const ledgerType: LedgerType = dto.type ?? (user.role === 'farmer' ? LedgerType.BUY : LedgerType.SELL_REGULAR);

        // Determine rateType to lookup (LedgerType.BUY for procurement, LedgerType.SELL_REGULAR for distribution)
        const targetRateType = ledgerType === LedgerType.BUY ? LedgerType.BUY : LedgerType.SELL_REGULAR;

        // Query the active rate from rates_history where start_date <= daily_ledger.date
        const ledgerDateObj = new Date(dto.date + 'T00:00:00Z');
        let rateRecords = await manager.find(RatesHistory, {
          where: [
            { userId: entry.userId, milkmanId, rateType: targetRateType, startDate: LessThanOrEqual(ledgerDateObj) },
            { userId: entry.userId, milkmanId: IsNull(), rateType: targetRateType, startDate: LessThanOrEqual(ledgerDateObj) }
          ],
          order: { startDate: 'DESC' },
        });

        // Fallback: If no type-specific rate is found, look for any rate
        if (rateRecords.length === 0) {
          rateRecords = await manager.find(RatesHistory, {
            where: [
              { userId: entry.userId, milkmanId, startDate: LessThanOrEqual(ledgerDateObj) },
              { userId: entry.userId, milkmanId: IsNull(), startDate: LessThanOrEqual(ledgerDateObj) }
            ],
            order: { startDate: 'DESC' },
          });
        }

        const rateRecord = rateRecords.length > 0 ? rateRecords[0] : null;
        const rateApplied = rateRecord ? Number(rateRecord.ratePerLiter) : 0.00;

        // Find existing ledger entry for the same user, milkman, date, slot, and type
        let ledgerItem = await manager.findOne(DailyLedger, {
          where: {
            userId: entry.userId,
            milkmanId,
            date: dto.date as any,
            slot: dto.slot,
            type: ledgerType,
          },
        });

        if (ledgerItem) {
          ledgerItem.quantityLiters = qty;
          ledgerItem.rateApplied = rateApplied;
          ledgerItem.totalPrice = qty * rateApplied;
          ledgerItem.type = ledgerType;
        } else {
          ledgerItem = manager.create(DailyLedger, {
            userId: entry.userId,
            milkmanId,
            date: dto.date as any,
            slot: dto.slot,
            quantityLiters: qty,
            rateApplied,
            type: ledgerType,
            totalPrice: qty * rateApplied,
          });
        }

        const saved = await manager.save(DailyLedger, ledgerItem);
        results.push(saved);
      }

      return {
        message: `Successfully saved ${results.length} daily ledger entries.`,
        count: results.length,
      };
    });
  }

  // Helper method to fetch slot entries for a specific date, slot, and optional type
  async getSlotEntries(milkmanId: string, dateStr: string, slot: Slot, type?: LedgerType) {
    return this.dailyLedgerRepository.find({
      where: {
        milkmanId,
        date: dateStr as any,
        slot,
        ...(type ? { type } : {}),
      },
    });
  }
}

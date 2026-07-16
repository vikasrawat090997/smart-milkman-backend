import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, IsNull, In } from 'typeorm';
import { DailyLedger, Slot, LedgerType } from '../entities/daily-ledger.entity';
import { RatesHistory } from '../entities/rates-history.entity';
import { User } from '../entities/user.entity';
import { MilkmanCustomer } from '../entities/milkman-customer.entity';
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
  ) { }

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

        // Find which milkman this customer is mapped to
        const mapping = await manager.findOne(MilkmanCustomer, {
          where: { customerId: entry.userId },
        });
        const targetMilkmanId = mapping ? mapping.milkmanId : milkmanId;

        // Determine ledger type: use dto.type if provided, otherwise fall back to role-based
        const ledgerType: LedgerType = dto.type ?? (user.role === 'farmer' ? LedgerType.BUY : LedgerType.SELL_REGULAR);

        // Determine rateType to lookup (LedgerType.BUY for procurement, LedgerType.SELL_REGULAR for distribution)
        const targetRateType = ledgerType === LedgerType.BUY ? LedgerType.BUY : LedgerType.SELL_REGULAR;

        // Query the active rate from rates_history where start_date <= daily_ledger.date
        const milkTypeVal = entry.milkType || 'Buffalo';
        const ledgerDateObj = new Date(dto.date + 'T00:00:00Z');
        let rateRecords = await manager.find(RatesHistory, {
          where: [
            { userId: entry.userId, milkmanId: targetMilkmanId, rateType: targetRateType, milkType: milkTypeVal, startDate: LessThanOrEqual(ledgerDateObj) },
            { userId: entry.userId, milkmanId: IsNull(), rateType: targetRateType, milkType: milkTypeVal, startDate: LessThanOrEqual(ledgerDateObj) }
          ],
          order: { startDate: 'DESC' },
        });

        // Fallback: If no type-specific rate is found, look for any rate
        if (rateRecords.length === 0) {
          rateRecords = await manager.find(RatesHistory, {
            where: [
              { userId: entry.userId, milkmanId: targetMilkmanId, milkType: milkTypeVal, startDate: LessThanOrEqual(ledgerDateObj) },
              { userId: entry.userId, milkmanId: IsNull(), milkType: milkTypeVal, startDate: LessThanOrEqual(ledgerDateObj) }
            ],
            order: { startDate: 'DESC' },
          });
        }

        const rateRecord = rateRecords.length > 0 ? rateRecords[0] : null;
        let rateApplied = rateRecord ? Number(rateRecord.ratePerLiter) : 0.00;

        if (rateApplied === 0) {
          const nonZeroRecords = await manager.find(RatesHistory, {
            where: [
              { userId: entry.userId, milkmanId: targetMilkmanId, milkType: milkTypeVal },
              { userId: entry.userId, milkmanId: IsNull(), milkType: milkTypeVal }
            ],
            order: { startDate: 'DESC' },
          });
          const nonZeroRecord = nonZeroRecords.find(r => Number(r.ratePerLiter) > 0);
          if (nonZeroRecord) {
            rateApplied = Number(nonZeroRecord.ratePerLiter);
          }
        }

        // Find existing ledger entry for the same user, milkman, date, slot, type, and milkType
        let ledgerItem = await manager.findOne(DailyLedger, {
          where: {
            userId: entry.userId,
            milkmanId: targetMilkmanId,
            date: dto.date as any,
            slot: dto.slot,
            type: ledgerType,
            milkType: milkTypeVal,
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
            milkmanId: targetMilkmanId,
            date: dto.date as any,
            slot: dto.slot,
            milkType: milkTypeVal,
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
    const user = await this.userRepository.findOne({ where: { id: milkmanId } });
    let milkmanIds = [milkmanId];
    if (user && user.role === 'milkman' && !user.parentMilkmanId) {
      const subMilkmen = await this.userRepository.find({
        where: { parentMilkmanId: milkmanId, role: 'milkman' as any, isActive: true },
      });
      milkmanIds = [milkmanId, ...subMilkmen.map((u) => u.id)];
    }

    return this.dailyLedgerRepository.find({
      where: {
        milkmanId: In(milkmanIds),
        date: dateStr as any,
        slot,
        ...(type ? { type } : {}),
      },
    });
  }
}

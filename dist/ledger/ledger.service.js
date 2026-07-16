"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const daily_ledger_entity_1 = require("../entities/daily-ledger.entity");
const rates_history_entity_1 = require("../entities/rates-history.entity");
const user_entity_1 = require("../entities/user.entity");
const milkman_customer_entity_1 = require("../entities/milkman-customer.entity");
let LedgerService = class LedgerService {
    dailyLedgerRepository;
    ratesHistoryRepository;
    userRepository;
    dataSource;
    constructor(dailyLedgerRepository, ratesHistoryRepository, userRepository, dataSource) {
        this.dailyLedgerRepository = dailyLedgerRepository;
        this.ratesHistoryRepository = ratesHistoryRepository;
        this.userRepository = userRepository;
        this.dataSource = dataSource;
    }
    async bulkSave(milkmanId, dto) {
        return this.dataSource.transaction(async (manager) => {
            const results = [];
            for (const entry of dto.entries) {
                const qty = entry.quantityLiters !== undefined && entry.quantityLiters !== null
                    ? Number(entry.quantityLiters)
                    : 0;
                const user = await manager.findOne(user_entity_1.User, {
                    where: { id: entry.userId },
                });
                if (!user) {
                    throw new common_1.BadRequestException(`User not found: ${entry.userId}`);
                }
                if (!user.isActive) {
                    continue;
                }
                const mapping = await manager.findOne(milkman_customer_entity_1.MilkmanCustomer, {
                    where: { customerId: entry.userId },
                });
                const targetMilkmanId = mapping ? mapping.milkmanId : milkmanId;
                const ledgerType = dto.type ?? (user.role === 'farmer' ? daily_ledger_entity_1.LedgerType.BUY : daily_ledger_entity_1.LedgerType.SELL_REGULAR);
                const targetRateType = ledgerType === daily_ledger_entity_1.LedgerType.BUY ? daily_ledger_entity_1.LedgerType.BUY : daily_ledger_entity_1.LedgerType.SELL_REGULAR;
                const milkTypeVal = entry.milkType || 'Buffalo';
                const ledgerDateObj = new Date(dto.date + 'T00:00:00Z');
                let rateRecords = await manager.find(rates_history_entity_1.RatesHistory, {
                    where: [
                        { userId: entry.userId, milkmanId: targetMilkmanId, rateType: targetRateType, milkType: milkTypeVal, startDate: (0, typeorm_2.LessThanOrEqual)(ledgerDateObj) },
                        { userId: entry.userId, milkmanId: (0, typeorm_2.IsNull)(), rateType: targetRateType, milkType: milkTypeVal, startDate: (0, typeorm_2.LessThanOrEqual)(ledgerDateObj) }
                    ],
                    order: { startDate: 'DESC' },
                });
                if (rateRecords.length === 0) {
                    rateRecords = await manager.find(rates_history_entity_1.RatesHistory, {
                        where: [
                            { userId: entry.userId, milkmanId: targetMilkmanId, milkType: milkTypeVal, startDate: (0, typeorm_2.LessThanOrEqual)(ledgerDateObj) },
                            { userId: entry.userId, milkmanId: (0, typeorm_2.IsNull)(), milkType: milkTypeVal, startDate: (0, typeorm_2.LessThanOrEqual)(ledgerDateObj) }
                        ],
                        order: { startDate: 'DESC' },
                    });
                }
                const rateRecord = rateRecords.length > 0 ? rateRecords[0] : null;
                let rateApplied = rateRecord ? Number(rateRecord.ratePerLiter) : 0.00;
                if (rateApplied === 0) {
                    const nonZeroRecords = await manager.find(rates_history_entity_1.RatesHistory, {
                        where: [
                            { userId: entry.userId, milkmanId: targetMilkmanId, milkType: milkTypeVal },
                            { userId: entry.userId, milkmanId: (0, typeorm_2.IsNull)(), milkType: milkTypeVal }
                        ],
                        order: { startDate: 'DESC' },
                    });
                    const nonZeroRecord = nonZeroRecords.find(r => Number(r.ratePerLiter) > 0);
                    if (nonZeroRecord) {
                        rateApplied = Number(nonZeroRecord.ratePerLiter);
                    }
                }
                let ledgerItem = await manager.findOne(daily_ledger_entity_1.DailyLedger, {
                    where: {
                        userId: entry.userId,
                        milkmanId: targetMilkmanId,
                        date: dto.date,
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
                }
                else {
                    ledgerItem = manager.create(daily_ledger_entity_1.DailyLedger, {
                        userId: entry.userId,
                        milkmanId: targetMilkmanId,
                        date: dto.date,
                        slot: dto.slot,
                        milkType: milkTypeVal,
                        quantityLiters: qty,
                        rateApplied,
                        type: ledgerType,
                        totalPrice: qty * rateApplied,
                    });
                }
                const saved = await manager.save(daily_ledger_entity_1.DailyLedger, ledgerItem);
                results.push(saved);
            }
            return {
                message: `Successfully saved ${results.length} daily ledger entries.`,
                count: results.length,
            };
        });
    }
    async getSlotEntries(milkmanId, dateStr, slot, type) {
        const user = await this.userRepository.findOne({ where: { id: milkmanId } });
        let milkmanIds = [milkmanId];
        if (user && user.role === 'milkman' && !user.parentMilkmanId) {
            const subMilkmen = await this.userRepository.find({
                where: { parentMilkmanId: milkmanId, role: 'milkman', isActive: true },
            });
            milkmanIds = [milkmanId, ...subMilkmen.map((u) => u.id)];
        }
        return this.dailyLedgerRepository.find({
            where: {
                milkmanId: (0, typeorm_2.In)(milkmanIds),
                date: dateStr,
                slot,
                ...(type ? { type } : {}),
            },
        });
    }
};
exports.LedgerService = LedgerService;
exports.LedgerService = LedgerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(daily_ledger_entity_1.DailyLedger)),
    __param(1, (0, typeorm_1.InjectRepository)(rates_history_entity_1.RatesHistory)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], LedgerService);
//# sourceMappingURL=ledger.service.js.map
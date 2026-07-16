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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyLedger = exports.LedgerType = exports.Slot = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
var Slot;
(function (Slot) {
    Slot["MORNING"] = "morning";
    Slot["EVENING"] = "evening";
})(Slot || (exports.Slot = Slot = {}));
var LedgerType;
(function (LedgerType) {
    LedgerType["BUY"] = "buy";
    LedgerType["SELL_REGULAR"] = "sell_regular";
    LedgerType["SELL_WALKIN"] = "sell_walkin";
})(LedgerType || (exports.LedgerType = LedgerType = {}));
let DailyLedger = class DailyLedger {
    id;
    userId;
    milkmanId;
    date;
    slot;
    milkType;
    quantityLiters;
    type;
    rateApplied;
    totalPrice;
    user;
    milkman;
};
exports.DailyLedger = DailyLedger;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DailyLedger.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, name: 'user_id' }),
    __metadata("design:type", String)
], DailyLedger.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, name: 'milkman_id', nullable: true }),
    __metadata("design:type", String)
], DailyLedger.prototype, "milkmanId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], DailyLedger.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: Slot }),
    __metadata("design:type", String)
], DailyLedger.prototype, "slot", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, name: 'milk_type', default: 'Buffalo' }),
    __metadata("design:type", String)
], DailyLedger.prototype, "milkType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0.00, name: 'quantity_liters' }),
    __metadata("design:type", Number)
], DailyLedger.prototype, "quantityLiters", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: LedgerType }),
    __metadata("design:type", String)
], DailyLedger.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'rate_applied' }),
    __metadata("design:type", Number)
], DailyLedger.prototype, "rateApplied", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2,
        name: 'total_price',
        default: 0.00,
    }),
    __metadata("design:type", Number)
], DailyLedger.prototype, "totalPrice", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.dailyLedger, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], DailyLedger.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'milkman_id' }),
    __metadata("design:type", user_entity_1.User)
], DailyLedger.prototype, "milkman", void 0);
exports.DailyLedger = DailyLedger = __decorate([
    (0, typeorm_1.Entity)({ name: 'daily_ledger' }),
    (0, typeorm_1.Unique)('unique_user_milkman_date_slot_type_milk', ['userId', 'milkmanId', 'date', 'slot', 'type', 'milkType'])
], DailyLedger);
//# sourceMappingURL=daily-ledger.entity.js.map
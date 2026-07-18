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
exports.DailyLedgerEditHistory = void 0;
const typeorm_1 = require("typeorm");
const daily_ledger_entity_1 = require("./daily-ledger.entity");
let DailyLedgerEditHistory = class DailyLedgerEditHistory {
    id;
    ledgerId;
    oldQuantity;
    newQuantity;
    oldRate;
    newRate;
    editedBy;
    editedAt;
    ledger;
};
exports.DailyLedgerEditHistory = DailyLedgerEditHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DailyLedgerEditHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, name: 'ledger_id' }),
    __metadata("design:type", String)
], DailyLedgerEditHistory.prototype, "ledgerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'old_quantity' }),
    __metadata("design:type", Number)
], DailyLedgerEditHistory.prototype, "oldQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'new_quantity' }),
    __metadata("design:type", Number)
], DailyLedgerEditHistory.prototype, "newQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'old_rate' }),
    __metadata("design:type", Number)
], DailyLedgerEditHistory.prototype, "oldRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'new_rate' }),
    __metadata("design:type", Number)
], DailyLedgerEditHistory.prototype, "newRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, name: 'edited_by' }),
    __metadata("design:type", String)
], DailyLedgerEditHistory.prototype, "editedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'edited_at' }),
    __metadata("design:type", Date)
], DailyLedgerEditHistory.prototype, "editedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => daily_ledger_entity_1.DailyLedger, (ledger) => ledger.editHistory, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'ledger_id' }),
    __metadata("design:type", daily_ledger_entity_1.DailyLedger)
], DailyLedgerEditHistory.prototype, "ledger", void 0);
exports.DailyLedgerEditHistory = DailyLedgerEditHistory = __decorate([
    (0, typeorm_1.Entity)({ name: 'daily_ledger_edit_history' })
], DailyLedgerEditHistory);
//# sourceMappingURL=daily-ledger-edit-history.entity.js.map
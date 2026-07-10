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
exports.PaymentEditHistory = void 0;
const typeorm_1 = require("typeorm");
const payments_ledger_entity_1 = require("./payments-ledger.entity");
let PaymentEditHistory = class PaymentEditHistory {
    id;
    paymentId;
    oldAmount;
    newAmount;
    oldDate;
    newDate;
    oldPaymentMode;
    newPaymentMode;
    editedAt;
    payment;
};
exports.PaymentEditHistory = PaymentEditHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentEditHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, name: 'payment_id' }),
    __metadata("design:type", String)
], PaymentEditHistory.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'old_amount' }),
    __metadata("design:type", Number)
], PaymentEditHistory.prototype, "oldAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'new_amount' }),
    __metadata("design:type", Number)
], PaymentEditHistory.prototype, "newAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'old_date' }),
    __metadata("design:type", Date)
], PaymentEditHistory.prototype, "oldDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'new_date' }),
    __metadata("design:type", Date)
], PaymentEditHistory.prototype, "newDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, name: 'old_payment_mode' }),
    __metadata("design:type", String)
], PaymentEditHistory.prototype, "oldPaymentMode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, name: 'new_payment_mode' }),
    __metadata("design:type", String)
], PaymentEditHistory.prototype, "newPaymentMode", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'edited_at' }),
    __metadata("design:type", Date)
], PaymentEditHistory.prototype, "editedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payments_ledger_entity_1.PaymentsLedger, (payment) => payment.editHistory, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'payment_id' }),
    __metadata("design:type", payments_ledger_entity_1.PaymentsLedger)
], PaymentEditHistory.prototype, "payment", void 0);
exports.PaymentEditHistory = PaymentEditHistory = __decorate([
    (0, typeorm_1.Entity)({ name: 'payment_edit_history' })
], PaymentEditHistory);
//# sourceMappingURL=payment-edit-history.entity.js.map
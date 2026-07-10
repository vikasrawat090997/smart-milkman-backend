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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payments_ledger_entity_1 = require("../entities/payments-ledger.entity");
const user_entity_1 = require("../entities/user.entity");
const payment_edit_history_entity_1 = require("../entities/payment-edit-history.entity");
let PaymentsService = class PaymentsService {
    paymentsLedgerRepository;
    userRepository;
    paymentEditHistoryRepository;
    constructor(paymentsLedgerRepository, userRepository, paymentEditHistoryRepository) {
        this.paymentsLedgerRepository = paymentsLedgerRepository;
        this.userRepository = userRepository;
        this.paymentEditHistoryRepository = paymentEditHistoryRepository;
    }
    async createPayment(recordedByUserId, dto) {
        const user = await this.userRepository.findOne({
            where: { id: dto.userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('Target user not found');
        }
        const payment = this.paymentsLedgerRepository.create({
            userId: dto.userId,
            date: new Date(dto.date + 'T00:00:00Z'),
            amountPaid: dto.amountPaid,
            paymentMode: dto.paymentMode,
            targetRole: dto.targetRole || user.role,
            recordedBy: recordedByUserId,
        });
        return this.paymentsLedgerRepository.save(payment);
    }
    async updatePayment(id, dto) {
        const payment = await this.paymentsLedgerRepository.findOne({ where: { id } });
        if (!payment) {
            throw new common_1.NotFoundException('Payment record not found');
        }
        const oldAmount = Number(payment.amountPaid);
        const oldDate = new Date(payment.date);
        const oldPaymentMode = payment.paymentMode;
        let changed = false;
        let newAmount = oldAmount;
        let newDate = oldDate;
        let newPaymentMode = oldPaymentMode;
        if (dto.amountPaid !== undefined && Number(dto.amountPaid) !== oldAmount) {
            newAmount = Number(dto.amountPaid);
            payment.amountPaid = newAmount;
            changed = true;
        }
        if (dto.date !== undefined) {
            const newD = new Date(dto.date + 'T00:00:00Z');
            if (newD.toISOString().split('T')[0] !== oldDate.toISOString().split('T')[0]) {
                newDate = newD;
                payment.date = newDate;
                changed = true;
            }
        }
        if (dto.paymentMode !== undefined && dto.paymentMode !== oldPaymentMode) {
            newPaymentMode = dto.paymentMode;
            payment.paymentMode = newPaymentMode;
            changed = true;
        }
        if (changed) {
            const history = this.paymentEditHistoryRepository.create({
                paymentId: id,
                oldAmount,
                newAmount,
                oldDate,
                newDate,
                oldPaymentMode,
                newPaymentMode,
            });
            await this.paymentEditHistoryRepository.save(history);
        }
        return this.paymentsLedgerRepository.save(payment);
    }
    async getPaymentsForUser(userId) {
        return this.paymentsLedgerRepository.find({
            where: { userId },
            order: { date: 'DESC' },
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payments_ledger_entity_1.PaymentsLedger)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(payment_edit_history_entity_1.PaymentEditHistory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map
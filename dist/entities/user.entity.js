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
exports.User = exports.Role = void 0;
const typeorm_1 = require("typeorm");
const rates_history_entity_1 = require("./rates-history.entity");
const daily_ledger_entity_1 = require("./daily-ledger.entity");
const payments_ledger_entity_1 = require("./payments-ledger.entity");
var Role;
(function (Role) {
    Role["MILKMAN"] = "milkman";
    Role["FARMER"] = "farmer";
    Role["CONSUMER"] = "consumer";
    Role["BOTH"] = "both";
})(Role || (exports.Role = Role = {}));
let User = class User {
    id;
    name;
    mobileNumber;
    passwordPin;
    role;
    isActive;
    address;
    createdAt;
    ratesHistory;
    dailyLedger;
    payments;
    recordedPayments;
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Index)('idx_mobile'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 15, unique: true, name: 'mobile_number' }),
    __metadata("design:type", String)
], User.prototype, "mobileNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, name: 'password_pin' }),
    __metadata("design:type", String)
], User.prototype, "passwordPin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: Role }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => rates_history_entity_1.RatesHistory, (rate) => rate.user, { cascade: true }),
    __metadata("design:type", Array)
], User.prototype, "ratesHistory", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => daily_ledger_entity_1.DailyLedger, (ledger) => ledger.user, { cascade: true }),
    __metadata("design:type", Array)
], User.prototype, "dailyLedger", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payments_ledger_entity_1.PaymentsLedger, (payment) => payment.user, { cascade: true }),
    __metadata("design:type", Array)
], User.prototype, "payments", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payments_ledger_entity_1.PaymentsLedger, (payment) => payment.recorder),
    __metadata("design:type", Array)
], User.prototype, "recordedPayments", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)({ name: 'users' })
], User);
//# sourceMappingURL=user.entity.js.map
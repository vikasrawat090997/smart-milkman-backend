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
exports.MilkmanCustomer = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
let MilkmanCustomer = class MilkmanCustomer {
    id;
    milkmanId;
    customerId;
    customName;
    relationshipRole;
    milkman;
    customer;
};
exports.MilkmanCustomer = MilkmanCustomer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MilkmanCustomer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, name: 'milkman_id' }),
    __metadata("design:type", String)
], MilkmanCustomer.prototype, "milkmanId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, name: 'customer_id' }),
    __metadata("design:type", String)
], MilkmanCustomer.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'custom_name', nullable: true }),
    __metadata("design:type", String)
], MilkmanCustomer.prototype, "customName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, name: 'relationship_role', default: 'both' }),
    __metadata("design:type", String)
], MilkmanCustomer.prototype, "relationshipRole", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'milkman_id' }),
    __metadata("design:type", user_entity_1.User)
], MilkmanCustomer.prototype, "milkman", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", user_entity_1.User)
], MilkmanCustomer.prototype, "customer", void 0);
exports.MilkmanCustomer = MilkmanCustomer = __decorate([
    (0, typeorm_1.Entity)({ name: 'milkman_customers' }),
    (0, typeorm_1.Unique)('unique_milkman_customer', ['milkmanId', 'customerId'])
], MilkmanCustomer);
//# sourceMappingURL=milkman-customer.entity.js.map
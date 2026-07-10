"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bill_service_1 = require("./bill.service");
const bill_controller_1 = require("./bill.controller");
const bill_lock_entity_1 = require("../entities/bill-lock.entity");
const user_entity_1 = require("../entities/user.entity");
const daily_ledger_entity_1 = require("../entities/daily-ledger.entity");
const payments_ledger_entity_1 = require("../entities/payments-ledger.entity");
const milkman_customer_entity_1 = require("../entities/milkman-customer.entity");
let BillModule = class BillModule {
};
exports.BillModule = BillModule;
exports.BillModule = BillModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([bill_lock_entity_1.BillLock, user_entity_1.User, daily_ledger_entity_1.DailyLedger, payments_ledger_entity_1.PaymentsLedger, milkman_customer_entity_1.MilkmanCustomer])],
        providers: [bill_service_1.BillService],
        controllers: [bill_controller_1.BillController],
        exports: [bill_service_1.BillService],
    })
], BillModule);
//# sourceMappingURL=bill.module.js.map
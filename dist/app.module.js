"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const ledger_module_1 = require("./ledger/ledger.module");
const payments_module_1 = require("./payments/payments.module");
const bill_module_1 = require("./bill/bill.module");
const reports_module_1 = require("./reports/reports.module");
const user_entity_1 = require("./entities/user.entity");
const rates_history_entity_1 = require("./entities/rates-history.entity");
const daily_ledger_entity_1 = require("./entities/daily-ledger.entity");
const payments_ledger_entity_1 = require("./entities/payments-ledger.entity");
const bill_lock_entity_1 = require("./entities/bill-lock.entity");
const payment_edit_history_entity_1 = require("./entities/payment-edit-history.entity");
const milkman_customer_entity_1 = require("./entities/milkman-customer.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'mysql',
                url: process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://')
                    ? process.env.DATABASE_URL
                    : undefined,
                host: process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('mysql://')
                    ? process.env.DATABASE_URL
                    : (process.env.DB_HOST || 'localhost'),
                port: parseInt(process.env.DB_PORT || '3306', 10),
                username: process.env.DB_USERNAME || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_DATABASE || 'smart_dhudhiya',
                entities: [user_entity_1.User, rates_history_entity_1.RatesHistory, daily_ledger_entity_1.DailyLedger, payments_ledger_entity_1.PaymentsLedger, bill_lock_entity_1.BillLock, payment_edit_history_entity_1.PaymentEditHistory, milkman_customer_entity_1.MilkmanCustomer],
                synchronize: false,
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            ledger_module_1.LedgerModule,
            payments_module_1.PaymentsModule,
            bill_module_1.BillModule,
            reports_module_1.ReportsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
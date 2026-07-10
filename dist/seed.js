"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const rates_history_entity_1 = require("./entities/rates-history.entity");
const daily_ledger_entity_1 = require("./entities/daily-ledger.entity");
const payments_ledger_entity_1 = require("./entities/payments-ledger.entity");
const milkman_customer_entity_1 = require("./entities/milkman-customer.entity");
const bcrypt = __importStar(require("bcrypt"));
const mysql = __importStar(require("mysql2/promise"));
async function bootstrap() {
    console.log('Ensuring database exists...');
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
        });
        await connection.query('CREATE DATABASE IF NOT EXISTS smart_dhudhiya');
        await connection.end();
        console.log('Database smart_dhudhiya ensured successfully.');
    }
    catch (err) {
        console.error('Error creating database:', err);
    }
    console.log('Starting database seeding...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const dataSource = app.get(typeorm_1.DataSource);
    console.log('Cleaning existing tables...');
    await dataSource.query('DELETE FROM payments_ledger');
    await dataSource.query('DELETE FROM daily_ledger');
    await dataSource.query('DELETE FROM rates_history');
    await dataSource.query('DELETE FROM milkman_customers');
    await dataSource.query('DELETE FROM users');
    console.log('Creating users...');
    const hashedPinMilkman = await bcrypt.hash('1234', 10);
    const milkman = dataSource.getRepository(user_entity_1.User).create({
        name: 'Milkman Admin',
        mobileNumber: '9876543210',
        passwordPin: hashedPinMilkman,
        role: user_entity_1.Role.MILKMAN,
        isActive: true,
        address: 'Smart Dhudhiya Office, City Center',
    });
    const savedMilkman = await dataSource.getRepository(user_entity_1.User).save(milkman);
    console.log(`Created Milkman: ${savedMilkman.name}`);
    const hashedPinMilkman2 = await bcrypt.hash('1234', 10);
    const milkman2 = dataSource.getRepository(user_entity_1.User).create({
        name: 'Milkman Agent B',
        mobileNumber: '9876543211',
        passwordPin: hashedPinMilkman2,
        role: user_entity_1.Role.MILKMAN,
        isActive: true,
        address: 'Smart Dhudhiya Branch Office, High Street',
    });
    const savedMilkman2 = await dataSource.getRepository(user_entity_1.User).save(milkman2);
    console.log(`Created Milkman 2: ${savedMilkman2.name}`);
    const hashedPinRamesh = await bcrypt.hash('1111', 10);
    const farmer1 = dataSource.getRepository(user_entity_1.User).create({
        name: 'Ramesh Kumar (Farmer/Consumer)',
        mobileNumber: '9999999901',
        passwordPin: hashedPinRamesh,
        role: user_entity_1.Role.BOTH,
        isActive: true,
        address: 'Green Farms, Rampur Village',
    });
    const savedFarmer1 = await dataSource.getRepository(user_entity_1.User).save(farmer1);
    console.log(`Created Farmer 1: ${savedFarmer1.name}`);
    const hashedPinSuresh = await bcrypt.hash('2222', 10);
    const farmer2 = dataSource.getRepository(user_entity_1.User).create({
        name: 'Suresh Singh (Farmer)',
        mobileNumber: '9999999902',
        passwordPin: hashedPinSuresh,
        role: user_entity_1.Role.FARMER,
        isActive: true,
        address: 'Golden Dairy Farms, Rampur Village',
    });
    const savedFarmer2 = await dataSource.getRepository(user_entity_1.User).save(farmer2);
    console.log(`Created Farmer 2: ${savedFarmer2.name}`);
    const hashedPinAmit = await bcrypt.hash('3333', 10);
    const consumer1 = dataSource.getRepository(user_entity_1.User).create({
        name: 'Amit Verma (Consumer)',
        mobileNumber: '8888888801',
        passwordPin: hashedPinAmit,
        role: user_entity_1.Role.CONSUMER,
        isActive: true,
        address: 'House No 102, Sector 4, City Sector',
    });
    const savedConsumer1 = await dataSource.getRepository(user_entity_1.User).save(consumer1);
    console.log(`Created Consumer 1: ${savedConsumer1.name}`);
    const hashedPinNeha = await bcrypt.hash('4444', 10);
    const consumer2 = dataSource.getRepository(user_entity_1.User).create({
        name: 'Neha Sharma (Consumer)',
        mobileNumber: '8888888802',
        passwordPin: hashedPinNeha,
        role: user_entity_1.Role.CONSUMER,
        isActive: true,
        address: 'Flat 4B, Sunrise Apartments, Bypass Road',
    });
    const savedConsumer2 = await dataSource.getRepository(user_entity_1.User).save(consumer2);
    console.log(`Created Consumer 2: ${savedConsumer2.name}`);
    console.log('Seeding initial rates...');
    const baseDate = new Date('2026-06-01T00:00:00Z');
    const midMonthDate = new Date('2026-06-12T00:00:00Z');
    const rates = [
        { userId: savedFarmer1.id, ratePerLiter: 45.00, startDate: baseDate, rateType: daily_ledger_entity_1.LedgerType.BUY },
        { userId: savedFarmer1.id, ratePerLiter: 46.50, startDate: midMonthDate, rateType: daily_ledger_entity_1.LedgerType.BUY },
        { userId: savedFarmer1.id, ratePerLiter: 55.00, startDate: baseDate, rateType: daily_ledger_entity_1.LedgerType.SELL_REGULAR },
        { userId: savedFarmer1.id, ratePerLiter: 57.50, startDate: midMonthDate, rateType: daily_ledger_entity_1.LedgerType.SELL_REGULAR },
        { userId: savedFarmer1.id, milkmanId: savedMilkman2.id, ratePerLiter: 47.00, startDate: baseDate, rateType: daily_ledger_entity_1.LedgerType.BUY },
        { userId: savedFarmer1.id, milkmanId: savedMilkman2.id, ratePerLiter: 58.00, startDate: baseDate, rateType: daily_ledger_entity_1.LedgerType.SELL_REGULAR },
        { userId: savedFarmer2.id, ratePerLiter: 48.00, startDate: baseDate, rateType: daily_ledger_entity_1.LedgerType.BUY },
        { userId: savedConsumer1.id, ratePerLiter: 60.00, startDate: baseDate, rateType: daily_ledger_entity_1.LedgerType.SELL_REGULAR },
        { userId: savedConsumer1.id, ratePerLiter: 62.00, startDate: midMonthDate, rateType: daily_ledger_entity_1.LedgerType.SELL_REGULAR },
        { userId: savedConsumer2.id, ratePerLiter: 65.00, startDate: baseDate, rateType: daily_ledger_entity_1.LedgerType.SELL_REGULAR },
    ];
    for (const r of rates) {
        const rateEntity = dataSource.getRepository(rates_history_entity_1.RatesHistory).create(r);
        await dataSource.getRepository(rates_history_entity_1.RatesHistory).save(rateEntity);
    }
    console.log('Seeded rates history.');
    console.log('Seeding daily ledger entries...');
    const dailyLogs = [];
    for (let day = 1; day <= 15; day++) {
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const date = new Date(`2026-06-${dayStr}T00:00:00Z`);
        const rameshRate = day >= 12 ? 46.50 : 45.00;
        dailyLogs.push(dataSource.getRepository(daily_ledger_entity_1.DailyLedger).create({
            userId: savedFarmer1.id,
            date,
            slot: daily_ledger_entity_1.Slot.MORNING,
            quantityLiters: 10.00,
            rateApplied: rameshRate,
            type: daily_ledger_entity_1.LedgerType.BUY,
            totalPrice: 10.00 * rameshRate,
        }), dataSource.getRepository(daily_ledger_entity_1.DailyLedger).create({
            userId: savedFarmer1.id,
            date,
            slot: daily_ledger_entity_1.Slot.EVENING,
            quantityLiters: 8.00,
            rateApplied: rameshRate,
            type: daily_ledger_entity_1.LedgerType.BUY,
            totalPrice: 8.00 * rameshRate,
        }));
        const amitRate = day >= 12 ? 62.00 : 60.00;
        const isCancelled = day === 7;
        const qtyM = isCancelled ? 0.00 : 2.00;
        const qtyE = isCancelled ? 0.00 : 2.00;
        dailyLogs.push(dataSource.getRepository(daily_ledger_entity_1.DailyLedger).create({
            userId: savedConsumer1.id,
            date,
            slot: daily_ledger_entity_1.Slot.MORNING,
            quantityLiters: qtyM,
            rateApplied: amitRate,
            type: daily_ledger_entity_1.LedgerType.SELL_REGULAR,
            totalPrice: qtyM * amitRate,
        }), dataSource.getRepository(daily_ledger_entity_1.DailyLedger).create({
            userId: savedConsumer1.id,
            date,
            slot: daily_ledger_entity_1.Slot.EVENING,
            quantityLiters: qtyE,
            rateApplied: amitRate,
            type: daily_ledger_entity_1.LedgerType.SELL_REGULAR,
            totalPrice: qtyE * amitRate,
        }));
        const nehaQty = day === 10 ? 5.00 : 3.00;
        dailyLogs.push(dataSource.getRepository(daily_ledger_entity_1.DailyLedger).create({
            userId: savedConsumer2.id,
            date,
            slot: daily_ledger_entity_1.Slot.MORNING,
            quantityLiters: nehaQty,
            rateApplied: 65.00,
            type: daily_ledger_entity_1.LedgerType.SELL_REGULAR,
            totalPrice: nehaQty * 65.00,
        }));
    }
    await dataSource.getRepository(daily_ledger_entity_1.DailyLedger).save(dailyLogs);
    console.log(`Seeded ${dailyLogs.length} daily ledger logs.`);
    console.log('Seeding payment records...');
    const payments = [
        dataSource.getRepository(payments_ledger_entity_1.PaymentsLedger).create({
            userId: savedFarmer1.id,
            date: new Date('2026-06-10T00:00:00Z'),
            amountPaid: 5000.00,
            paymentMode: payments_ledger_entity_1.PaymentMode.CASH,
            recordedBy: savedMilkman.id,
        }),
        dataSource.getRepository(payments_ledger_entity_1.PaymentsLedger).create({
            userId: savedConsumer1.id,
            date: new Date('2026-06-08T00:00:00Z'),
            amountPaid: 1000.00,
            paymentMode: payments_ledger_entity_1.PaymentMode.MANUAL_UPI,
            recordedBy: savedMilkman.id,
        }),
    ];
    await dataSource.getRepository(payments_ledger_entity_1.PaymentsLedger).save(payments);
    console.log('Seeded payment records.');
    console.log('Seeding customer mappings...');
    const mappings = [
        { milkmanId: savedMilkman.id, customerId: farmer1.id, relationshipRole: 'both' },
        { milkmanId: savedMilkman2.id, customerId: farmer1.id, relationshipRole: 'both' },
        { milkmanId: savedMilkman.id, customerId: savedFarmer2.id, relationshipRole: 'farmer' },
        { milkmanId: savedMilkman.id, customerId: savedConsumer1.id, relationshipRole: 'consumer' },
        { milkmanId: savedMilkman.id, customerId: savedConsumer2.id, relationshipRole: 'consumer' },
    ];
    for (const m of mappings) {
        const mappingEntity = dataSource.getRepository(milkman_customer_entity_1.MilkmanCustomer).create(m);
        await dataSource.getRepository(milkman_customer_entity_1.MilkmanCustomer).save(mappingEntity);
    }
    console.log('Seeded customer mappings.');
    console.log('Database seeding finished successfully!');
    await app.close();
}
bootstrap().catch((err) => {
    console.error('Error seeding database:', err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map
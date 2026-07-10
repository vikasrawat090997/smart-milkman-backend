import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { User, Role } from './entities/user.entity';
import { RatesHistory } from './entities/rates-history.entity';
import { DailyLedger, Slot, LedgerType } from './entities/daily-ledger.entity';
import { PaymentsLedger, PaymentMode } from './entities/payments-ledger.entity';
import { MilkmanCustomer } from './entities/milkman-customer.entity';
import * as bcrypt from 'bcrypt';
import * as mysql from 'mysql2/promise';

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
  } catch (err) {
    console.error('Error creating database:', err);
  }

  console.log('Starting database seeding...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  // Clear existing tables in order due to foreign keys
  console.log('Cleaning existing tables...');
  await dataSource.query('DELETE FROM payments_ledger');
  await dataSource.query('DELETE FROM daily_ledger');
  await dataSource.query('DELETE FROM rates_history');
  await dataSource.query('DELETE FROM milkman_customers');
  await dataSource.query('DELETE FROM users');

  console.log('Creating users...');

  // 1. Milkman Admin
  const hashedPinMilkman = await bcrypt.hash('1234', 10);
  const milkman = dataSource.getRepository(User).create({
    name: 'Milkman Admin',
    mobileNumber: '9876543210',
    passwordPin: hashedPinMilkman,
    role: Role.MILKMAN,
    isActive: true,
    address: 'Smart Dhudhiya Office, City Center',
  });
  const savedMilkman = await dataSource.getRepository(User).save(milkman);
  console.log(`Created Milkman: ${savedMilkman.name}`);

  // 1b. Milkman 2
  const hashedPinMilkman2 = await bcrypt.hash('1234', 10);
  const milkman2 = dataSource.getRepository(User).create({
    name: 'Milkman Agent B',
    mobileNumber: '9876543211',
    passwordPin: hashedPinMilkman2,
    role: Role.MILKMAN,
    isActive: true,
    address: 'Smart Dhudhiya Branch Office, High Street',
  });
  const savedMilkman2 = await dataSource.getRepository(User).save(milkman2);
  console.log(`Created Milkman 2: ${savedMilkman2.name}`);

  // 2. Farmer 1 (Ramesh)
  const hashedPinRamesh = await bcrypt.hash('1111', 10);
  const farmer1 = dataSource.getRepository(User).create({
    name: 'Ramesh Kumar (Farmer/Consumer)',
    mobileNumber: '9999999901',
    passwordPin: hashedPinRamesh,
    role: Role.BOTH,
    isActive: true,
    address: 'Green Farms, Rampur Village',
  });
  const savedFarmer1 = await dataSource.getRepository(User).save(farmer1);
  console.log(`Created Farmer 1: ${savedFarmer1.name}`);

  // 3. Farmer 2 (Suresh)
  const hashedPinSuresh = await bcrypt.hash('2222', 10);
  const farmer2 = dataSource.getRepository(User).create({
    name: 'Suresh Singh (Farmer)',
    mobileNumber: '9999999902',
    passwordPin: hashedPinSuresh,
    role: Role.FARMER,
    isActive: true,
    address: 'Golden Dairy Farms, Rampur Village',
  });
  const savedFarmer2 = await dataSource.getRepository(User).save(farmer2);
  console.log(`Created Farmer 2: ${savedFarmer2.name}`);

  // 4. Consumer 1 (Amit)
  const hashedPinAmit = await bcrypt.hash('3333', 10);
  const consumer1 = dataSource.getRepository(User).create({
    name: 'Amit Verma (Consumer)',
    mobileNumber: '8888888801',
    passwordPin: hashedPinAmit,
    role: Role.CONSUMER,
    isActive: true,
    address: 'House No 102, Sector 4, City Sector',
  });
  const savedConsumer1 = await dataSource.getRepository(User).save(consumer1);
  console.log(`Created Consumer 1: ${savedConsumer1.name}`);

  // 5. Consumer 2 (Neha)
  const hashedPinNeha = await bcrypt.hash('4444', 10);
  const consumer2 = dataSource.getRepository(User).create({
    name: 'Neha Sharma (Consumer)',
    mobileNumber: '8888888802',
    passwordPin: hashedPinNeha,
    role: Role.CONSUMER,
    isActive: true,
    address: 'Flat 4B, Sunrise Apartments, Bypass Road',
  });
  const savedConsumer2 = await dataSource.getRepository(User).save(consumer2);
  console.log(`Created Consumer 2: ${savedConsumer2.name}`);

  console.log('Seeding initial rates...');
  const baseDate = new Date('2026-06-01T00:00:00Z');
  const midMonthDate = new Date('2026-06-12T00:00:00Z');

  // Seed rates
  const rates = [
    // Ramesh (Farmer 1 / Role: BOTH): buying rate (procurement) is 45.00/46.50, selling rate is 55.00/57.50
    { userId: savedFarmer1.id, ratePerLiter: 45.00, startDate: baseDate, rateType: LedgerType.BUY },
    { userId: savedFarmer1.id, ratePerLiter: 46.50, startDate: midMonthDate, rateType: LedgerType.BUY },
    { userId: savedFarmer1.id, ratePerLiter: 55.00, startDate: baseDate, rateType: LedgerType.SELL_REGULAR },
    { userId: savedFarmer1.id, ratePerLiter: 57.50, startDate: midMonthDate, rateType: LedgerType.SELL_REGULAR },

    // Ramesh rates under Milkman 2
    { userId: savedFarmer1.id, milkmanId: savedMilkman2.id, ratePerLiter: 47.00, startDate: baseDate, rateType: LedgerType.BUY },
    { userId: savedFarmer1.id, milkmanId: savedMilkman2.id, ratePerLiter: 58.00, startDate: baseDate, rateType: LedgerType.SELL_REGULAR },

    // Suresh (Farmer 2 / Role: FARMER): buying rate is 48.00
    { userId: savedFarmer2.id, ratePerLiter: 48.00, startDate: baseDate, rateType: LedgerType.BUY },

    // Amit (Consumer 1 / Role: CONSUMER): selling rate is 60.00/62.00
    { userId: savedConsumer1.id, ratePerLiter: 60.00, startDate: baseDate, rateType: LedgerType.SELL_REGULAR },
    { userId: savedConsumer1.id, ratePerLiter: 62.00, startDate: midMonthDate, rateType: LedgerType.SELL_REGULAR },

    // Neha (Consumer 2 / Role: CONSUMER): selling rate is 65.00
    { userId: savedConsumer2.id, ratePerLiter: 65.00, startDate: baseDate, rateType: LedgerType.SELL_REGULAR },
  ];

  for (const r of rates) {
    const rateEntity = dataSource.getRepository(RatesHistory).create(r);
    await dataSource.getRepository(RatesHistory).save(rateEntity);
  }
  console.log('Seeded rates history.');

  console.log('Seeding daily ledger entries...');
  // Let's seed daily logs for June 1 to June 15
  // Ramesh delivers 10.0L morning, 8.0L evening every day
  // Amit consumes 2.0L morning, 2.0L evening every day
  // Neha consumes 3.0L morning, 0.0L evening every day
  const dailyLogs: DailyLedger[] = [];
  for (let day = 1; day <= 15; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const date = new Date(`2026-06-${dayStr}T00:00:00Z`);

    // Ramesh (Farmer 1) - buy
    const rameshRate = day >= 12 ? 46.50 : 45.00;
    dailyLogs.push(
      dataSource.getRepository(DailyLedger).create({
        userId: savedFarmer1.id,
        date,
        slot: Slot.MORNING,
        quantityLiters: 10.00,
        rateApplied: rameshRate,
        type: LedgerType.BUY,
        totalPrice: 10.00 * rameshRate,
      }),
      dataSource.getRepository(DailyLedger).create({
        userId: savedFarmer1.id,
        date,
        slot: Slot.EVENING,
        quantityLiters: 8.00,
        rateApplied: rameshRate,
        type: LedgerType.BUY,
        totalPrice: 8.00 * rameshRate,
      })
    );

    // Amit (Consumer 1) - sell_regular
    const amitRate = day >= 12 ? 62.00 : 60.00;
    // Let's simulate a cancelled delivery on June 7 (Sundays or random)
    const isCancelled = day === 7;
    const qtyM = isCancelled ? 0.00 : 2.00;
    const qtyE = isCancelled ? 0.00 : 2.00;

    dailyLogs.push(
      dataSource.getRepository(DailyLedger).create({
        userId: savedConsumer1.id,
        date,
        slot: Slot.MORNING,
        quantityLiters: qtyM,
        rateApplied: amitRate,
        type: LedgerType.SELL_REGULAR,
        totalPrice: qtyM * amitRate,
      }),
      dataSource.getRepository(DailyLedger).create({
        userId: savedConsumer1.id,
        date,
        slot: Slot.EVENING,
        quantityLiters: qtyE,
        rateApplied: amitRate,
        type: LedgerType.SELL_REGULAR,
        totalPrice: qtyE * amitRate,
      })
    );

    // Neha (Consumer 2) - sell_regular
    // Simulated altered volume (e.g. 5.0L on June 10, instead of regular 3.0L)
    const nehaQty = day === 10 ? 5.00 : 3.00;
    dailyLogs.push(
      dataSource.getRepository(DailyLedger).create({
        userId: savedConsumer2.id,
        date,
        slot: Slot.MORNING,
        quantityLiters: nehaQty,
        rateApplied: 65.00,
        type: LedgerType.SELL_REGULAR,
        totalPrice: nehaQty * 65.00,
      })
    );
  }

  await dataSource.getRepository(DailyLedger).save(dailyLogs);
  console.log(`Seeded ${dailyLogs.length} daily ledger logs.`);

  console.log('Seeding payment records...');
  const payments = [
    // Ramesh (Farmer 1) payout: Paid by milkman Rs 5,000 on June 10
    dataSource.getRepository(PaymentsLedger).create({
      userId: savedFarmer1.id,
      date: new Date('2026-06-10T00:00:00Z'),
      amountPaid: 5000.00,
      paymentMode: PaymentMode.CASH,
      recordedBy: savedMilkman.id,
    }),
    // Amit (Consumer 1) paid Rs 1,000 on June 8 via UPI
    dataSource.getRepository(PaymentsLedger).create({
      userId: savedConsumer1.id,
      date: new Date('2026-06-08T00:00:00Z'),
      amountPaid: 1000.00,
      paymentMode: PaymentMode.MANUAL_UPI,
      recordedBy: savedMilkman.id,
    }),
  ];

  await dataSource.getRepository(PaymentsLedger).save(payments);
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
    const mappingEntity = dataSource.getRepository(MilkmanCustomer).create(m);
    await dataSource.getRepository(MilkmanCustomer).save(mappingEntity);
  }
  console.log('Seeded customer mappings.');

  console.log('Database seeding finished successfully!');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Error seeding database:', err);
  process.exit(1);
});

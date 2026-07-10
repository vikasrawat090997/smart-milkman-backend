import { Repository, DataSource } from 'typeorm';
import { User, Role } from '../entities/user.entity';
import { RatesHistory } from '../entities/rates-history.entity';
import { MilkmanCustomer } from '../entities/milkman-customer.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BulkUpdateRateDto } from './dto/bulk-update-rate.dto';
export declare class UsersService {
    private userRepository;
    private ratesHistoryRepository;
    private milkmanCustomerRepository;
    private dataSource;
    constructor(userRepository: Repository<User>, ratesHistoryRepository: Repository<RatesHistory>, milkmanCustomerRepository: Repository<MilkmanCustomer>, dataSource: DataSource);
    createUser(milkmanId: string, dto: CreateUserDto): Promise<User | {
        name: string;
        id: string;
        mobileNumber: string;
        role: Role;
        isActive: boolean;
        address: string;
        createdAt: Date;
        ratesHistory: RatesHistory[];
        dailyLedger: import("../entities/daily-ledger.entity").DailyLedger[];
        payments: import("../entities/payments-ledger.entity").PaymentsLedger[];
        recordedPayments: import("../entities/payments-ledger.entity").PaymentsLedger[];
    }>;
    findAllActive(milkmanId: string, role?: Role): Promise<User[]>;
    findAll(milkmanId: string, role?: Role): Promise<User[]>;
    findOne(id: string, milkmanId?: string): Promise<{
        id: string;
        name: string;
        mobileNumber: string;
        role: Role;
        isActive: boolean;
        address: string;
        createdAt: Date;
        ratesHistory: RatesHistory[];
        dailyLedger: import("../entities/daily-ledger.entity").DailyLedger[];
        payments: import("../entities/payments-ledger.entity").PaymentsLedger[];
        recordedPayments: import("../entities/payments-ledger.entity").PaymentsLedger[];
    }>;
    updateRate(milkmanId: string, userId: string, dto: UpdateRateDto): Promise<RatesHistory>;
    bulkUpdateRate(milkmanId: string, dto: BulkUpdateRateDto): Promise<{
        message: string;
        count: number;
    }>;
    updateUser(milkmanId: string, userId: string, dto: UpdateUserDto): Promise<{
        name: string;
        id: string;
        mobileNumber: string;
        role: Role;
        isActive: boolean;
        address: string;
        createdAt: Date;
        ratesHistory: RatesHistory[];
        dailyLedger: import("../entities/daily-ledger.entity").DailyLedger[];
        payments: import("../entities/payments-ledger.entity").PaymentsLedger[];
        recordedPayments: import("../entities/payments-ledger.entity").PaymentsLedger[];
    }>;
    getMyMilkmen(customerId: string): Promise<{
        id: string;
        name: string;
        mobileNumber: string;
        role: Role;
        isActive: boolean;
        address: string;
        createdAt: Date;
        ratesHistory: RatesHistory[];
        dailyLedger: import("../entities/daily-ledger.entity").DailyLedger[];
        payments: import("../entities/payments-ledger.entity").PaymentsLedger[];
        recordedPayments: import("../entities/payments-ledger.entity").PaymentsLedger[];
    }[]>;
}

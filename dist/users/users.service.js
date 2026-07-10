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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
const rates_history_entity_1 = require("../entities/rates-history.entity");
const milkman_customer_entity_1 = require("../entities/milkman-customer.entity");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    userRepository;
    ratesHistoryRepository;
    milkmanCustomerRepository;
    dataSource;
    constructor(userRepository, ratesHistoryRepository, milkmanCustomerRepository, dataSource) {
        this.userRepository = userRepository;
        this.ratesHistoryRepository = ratesHistoryRepository;
        this.milkmanCustomerRepository = milkmanCustomerRepository;
        this.dataSource = dataSource;
    }
    async createUser(milkmanId, dto) {
        const existing = await this.userRepository.findOne({
            where: { mobileNumber: dto.mobileNumber },
        });
        if (existing) {
            if (existing.role !== dto.role) {
                throw new common_1.ConflictException('Mobile number is already registered with a different user role');
            }
            const existingMapping = await this.milkmanCustomerRepository.findOne({
                where: { milkmanId, customerId: existing.id },
            });
            if (existingMapping) {
                throw new common_1.ConflictException('This customer is already added to your directory');
            }
            await this.dataSource.transaction(async (manager) => {
                const mapping = manager.create(milkman_customer_entity_1.MilkmanCustomer, {
                    milkmanId,
                    customerId: existing.id,
                    customName: dto.name,
                });
                await manager.save(milkman_customer_entity_1.MilkmanCustomer, mapping);
                const rate = manager.create(rates_history_entity_1.RatesHistory, {
                    userId: existing.id,
                    milkmanId,
                    ratePerLiter: dto.ratePerLiter,
                    startDate: new Date(),
                });
                await manager.save(rates_history_entity_1.RatesHistory, rate);
            });
            const { passwordPin, ...result } = existing;
            return { ...result, name: dto.name };
        }
        const hashedPin = await bcrypt.hash(dto.passwordPin, 10);
        return this.dataSource.transaction(async (manager) => {
            const user = manager.create(user_entity_1.User, {
                name: dto.name,
                mobileNumber: dto.mobileNumber,
                passwordPin: hashedPin,
                role: dto.role,
                address: dto.address,
            });
            const savedUser = await manager.save(user_entity_1.User, user);
            const mapping = manager.create(milkman_customer_entity_1.MilkmanCustomer, {
                milkmanId,
                customerId: savedUser.id,
                customName: dto.name,
            });
            await manager.save(milkman_customer_entity_1.MilkmanCustomer, mapping);
            const rate = manager.create(rates_history_entity_1.RatesHistory, {
                userId: savedUser.id,
                milkmanId,
                ratePerLiter: dto.ratePerLiter,
                startDate: new Date(),
            });
            await manager.save(rates_history_entity_1.RatesHistory, rate);
            return savedUser;
        });
    }
    async findAllActive(milkmanId, role) {
        const mappings = await this.milkmanCustomerRepository.find({
            where: { milkmanId },
        });
        const customerIds = mappings.map((m) => m.customerId);
        if (customerIds.length === 0)
            return [];
        const users = await this.userRepository.find({
            where: {
                id: (0, typeorm_2.In)(customerIds),
                isActive: true,
                role: role ? (0, typeorm_2.In)([role, user_entity_1.Role.BOTH]) : (0, typeorm_2.In)([user_entity_1.Role.FARMER, user_entity_1.Role.CONSUMER, user_entity_1.Role.BOTH]),
            },
            relations: {
                ratesHistory: true,
            },
            order: { name: 'ASC' },
        });
        const mappingMap = new Map();
        mappings.forEach((m) => {
            if (m.customName) {
                mappingMap.set(m.customerId, m.customName);
            }
        });
        users.forEach((user) => {
            if (mappingMap.has(user.id)) {
                user.name = mappingMap.get(user.id);
            }
            if (user.ratesHistory) {
                user.ratesHistory = user.ratesHistory.filter((r) => r.milkmanId === milkmanId || r.milkmanId === null);
                user.ratesHistory.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            }
        });
        return users;
    }
    async findAll(milkmanId, role) {
        const mappings = await this.milkmanCustomerRepository.find({
            where: { milkmanId },
        });
        const customerIds = mappings.map((m) => m.customerId);
        if (customerIds.length === 0)
            return [];
        const users = await this.userRepository.find({
            where: {
                id: (0, typeorm_2.In)(customerIds),
                role: role ? (0, typeorm_2.In)([role, user_entity_1.Role.BOTH]) : (0, typeorm_2.In)([user_entity_1.Role.FARMER, user_entity_1.Role.CONSUMER, user_entity_1.Role.BOTH]),
            },
            relations: {
                ratesHistory: true,
            },
            order: { name: 'ASC' },
        });
        const mappingMap = new Map();
        mappings.forEach((m) => {
            if (m.customName) {
                mappingMap.set(m.customerId, m.customName);
            }
        });
        users.forEach((user) => {
            if (mappingMap.has(user.id)) {
                user.name = mappingMap.get(user.id);
            }
            if (user.ratesHistory) {
                user.ratesHistory = user.ratesHistory.filter((r) => r.milkmanId === milkmanId || r.milkmanId === null);
                user.ratesHistory.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            }
        });
        return users;
    }
    async findOne(id, milkmanId) {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: {
                ratesHistory: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.ratesHistory) {
            if (milkmanId) {
                user.ratesHistory = user.ratesHistory.filter((r) => r.milkmanId === milkmanId || r.milkmanId === null);
            }
            user.ratesHistory.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        }
        if (milkmanId) {
            const mapping = await this.milkmanCustomerRepository.findOne({
                where: { milkmanId, customerId: id },
            });
            if (mapping && mapping.customName) {
                user.name = mapping.customName;
            }
        }
        const { passwordPin, ...result } = user;
        return result;
    }
    async updateRate(milkmanId, userId, dto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const rate = this.ratesHistoryRepository.create({
            userId,
            milkmanId,
            ratePerLiter: dto.ratePerLiter,
            startDate: new Date(dto.startDate + 'T00:00:00Z'),
        });
        return this.ratesHistoryRepository.save(rate);
    }
    async bulkUpdateRate(milkmanId, dto) {
        const mappings = await this.milkmanCustomerRepository.find({
            where: { milkmanId },
        });
        const customerIds = mappings.map((m) => m.customerId);
        if (customerIds.length === 0) {
            return { message: `No active users found for role: ${dto.role}`, count: 0 };
        }
        const users = await this.userRepository.find({
            where: { id: (0, typeorm_2.In)(customerIds), role: dto.role, isActive: true },
        });
        if (users.length === 0) {
            return { message: `No active users found for role: ${dto.role}`, count: 0 };
        }
        const rateEntries = users.map((user) => {
            return this.ratesHistoryRepository.create({
                userId: user.id,
                milkmanId,
                ratePerLiter: dto.ratePerLiter,
                startDate: new Date(dto.startDate + 'T00:00:00Z'),
            });
        });
        await this.ratesHistoryRepository.save(rateEntries);
        return {
            message: `Updated rate to Rs. ${dto.ratePerLiter} for all ${users.length} active ${dto.role}s.`,
            count: users.length,
        };
    }
    async updateUser(milkmanId, userId, dto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (dto.name !== undefined) {
            const mapping = await this.milkmanCustomerRepository.findOne({
                where: { milkmanId, customerId: userId },
            });
            if (mapping) {
                mapping.customName = dto.name;
                await this.milkmanCustomerRepository.save(mapping);
            }
        }
        if (dto.mobileNumber !== undefined) {
            const existing = await this.userRepository.findOne({
                where: { mobileNumber: dto.mobileNumber },
            });
            if (existing && existing.id !== userId) {
                throw new common_1.ConflictException('Mobile number is already registered by another user');
            }
            user.mobileNumber = dto.mobileNumber;
        }
        if (dto.passwordPin !== undefined && dto.passwordPin !== '') {
            user.passwordPin = await bcrypt.hash(dto.passwordPin, 10);
        }
        if (dto.isActive !== undefined)
            user.isActive = dto.isActive;
        if (dto.address !== undefined)
            user.address = dto.address;
        if (dto.role !== undefined)
            user.role = dto.role;
        const savedUser = await this.userRepository.save(user);
        const { passwordPin, ...result } = savedUser;
        return { ...result, name: dto.name || user.name };
    }
    async getMyMilkmen(customerId) {
        const mappings = await this.milkmanCustomerRepository.find({
            where: { customerId },
            relations: { milkman: true },
        });
        return mappings.map((m) => {
            const { passwordPin, ...result } = m.milkman;
            return result;
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(rates_history_entity_1.RatesHistory)),
    __param(2, (0, typeorm_1.InjectRepository)(milkman_customer_entity_1.MilkmanCustomer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], UsersService);
//# sourceMappingURL=users.service.js.map
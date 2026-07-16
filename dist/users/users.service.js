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
const daily_ledger_entity_1 = require("../entities/daily-ledger.entity");
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
    async findSubMilkmen(parentMilkmanId) {
        return this.userRepository.find({
            where: { parentMilkmanId, role: user_entity_1.Role.MILKMAN, isActive: true },
            order: { name: 'ASC' },
        });
    }
    async getTargetMilkmanIds(milkmanId) {
        const user = await this.userRepository.findOne({ where: { id: milkmanId } });
        if (user && user.role === user_entity_1.Role.MILKMAN && !user.parentMilkmanId) {
            const subMilkmen = await this.userRepository.find({
                where: { parentMilkmanId: milkmanId, role: user_entity_1.Role.MILKMAN, isActive: true },
            });
            return [milkmanId, ...subMilkmen.map((u) => u.id)];
        }
        return [milkmanId];
    }
    getRateTypesForRole(role) {
        if (role === user_entity_1.Role.FARMER)
            return [daily_ledger_entity_1.LedgerType.BUY];
        if (role === user_entity_1.Role.CONSUMER)
            return [daily_ledger_entity_1.LedgerType.SELL_REGULAR];
        return [daily_ledger_entity_1.LedgerType.BUY, daily_ledger_entity_1.LedgerType.SELL_REGULAR];
    }
    async createRates(manager, userId, milkmanId, ratePerLiter, sellRatePerLiter, role, milkType = 'Buffalo') {
        const types = this.getRateTypesForRole(role);
        for (const rateType of types) {
            const rateVal = rateType === daily_ledger_entity_1.LedgerType.BUY ? ratePerLiter : (sellRatePerLiter ?? ratePerLiter);
            const rate = manager.create(rates_history_entity_1.RatesHistory, {
                userId,
                milkmanId,
                ratePerLiter: rateVal,
                startDate: new Date(),
                rateType,
                milkType,
            });
            await manager.save(rates_history_entity_1.RatesHistory, rate);
        }
    }
    async createUser(milkmanId, dto) {
        if (dto.role === user_entity_1.Role.MILKMAN) {
            const existingMilkman = await this.userRepository.findOne({
                where: { mobileNumber: dto.mobileNumber, role: user_entity_1.Role.MILKMAN },
            });
            if (existingMilkman) {
                throw new common_1.ConflictException('A milkman with this mobile number already exists');
            }
            const hashedPin = await bcrypt.hash(dto.passwordPin, 10);
            const user = this.userRepository.create({
                name: dto.name,
                mobileNumber: dto.mobileNumber,
                passwordPin: hashedPin,
                role: user_entity_1.Role.MILKMAN,
                parentMilkmanId: milkmanId,
                address: dto.address,
            });
            const saved = await this.userRepository.save(user);
            const { passwordPin, ...result } = saved;
            return result;
        }
        const targetRole = dto.role || user_entity_1.Role.BOTH;
        const targetMilkmanId = dto.assignedMilkmanId || milkmanId;
        if (dto.assignedMilkmanId && dto.assignedMilkmanId !== milkmanId) {
            const isSub = await this.userRepository.findOne({
                where: { id: dto.assignedMilkmanId, parentMilkmanId: milkmanId },
            });
            if (!isSub) {
                throw new common_1.BadRequestException('Assigned milkman is not associated with your account');
            }
        }
        const existing = await this.userRepository.findOne({
            where: { mobileNumber: dto.mobileNumber, role: (0, typeorm_2.Not)(user_entity_1.Role.MILKMAN) },
        });
        if (existing) {
            const existingMapping = await this.milkmanCustomerRepository.findOne({
                where: { milkmanId: targetMilkmanId, customerId: existing.id },
            });
            if (existingMapping) {
                throw new common_1.ConflictException('This customer is already added to your directory');
            }
            let milkTypeList = dto.milkType || 'Buffalo';
            if (dto.rates && dto.rates.length > 0) {
                milkTypeList = dto.rates.map((r) => r.milkType).join(',');
            }
            await this.dataSource.transaction(async (manager) => {
                const mapping = manager.create(milkman_customer_entity_1.MilkmanCustomer, {
                    milkmanId: targetMilkmanId,
                    customerId: existing.id,
                    customName: dto.name,
                    relationshipRole: targetRole,
                    milkType: milkTypeList,
                });
                await manager.save(milkman_customer_entity_1.MilkmanCustomer, mapping);
                if (dto.rates && dto.rates.length > 0) {
                    for (const r of dto.rates) {
                        await this.createRates(manager, existing.id, targetMilkmanId, r.ratePerLiter, r.sellRatePerLiter, targetRole, r.milkType);
                    }
                }
                else {
                    await this.createRates(manager, existing.id, targetMilkmanId, dto.ratePerLiter || 0, dto.sellRatePerLiter, targetRole, dto.milkType || 'Buffalo');
                }
            });
            await this.syncUserGlobalRole(existing.id);
            const updatedUser = await this.userRepository.findOne({ where: { id: existing.id } });
            const { passwordPin, ...result } = updatedUser || existing;
            return { ...result, name: dto.name };
        }
        const hashedPin = await bcrypt.hash(dto.passwordPin, 10);
        const savedUser = await this.dataSource.transaction(async (manager) => {
            const user = manager.create(user_entity_1.User, {
                name: dto.name,
                mobileNumber: dto.mobileNumber,
                passwordPin: hashedPin,
                role: targetRole,
                address: dto.address,
            });
            const saved = await manager.save(user_entity_1.User, user);
            let milkTypeList = dto.milkType || 'Buffalo';
            if (dto.rates && dto.rates.length > 0) {
                milkTypeList = dto.rates.map((r) => r.milkType).join(',');
            }
            const mapping = manager.create(milkman_customer_entity_1.MilkmanCustomer, {
                milkmanId: targetMilkmanId,
                customerId: saved.id,
                customName: dto.name,
                relationshipRole: targetRole,
                milkType: milkTypeList,
            });
            await manager.save(milkman_customer_entity_1.MilkmanCustomer, mapping);
            if (dto.rates && dto.rates.length > 0) {
                for (const r of dto.rates) {
                    await this.createRates(manager, saved.id, targetMilkmanId, r.ratePerLiter, r.sellRatePerLiter, targetRole, r.milkType);
                }
            }
            else {
                await this.createRates(manager, saved.id, targetMilkmanId, dto.ratePerLiter || 0, dto.sellRatePerLiter, targetRole, dto.milkType || 'Buffalo');
            }
            return saved;
        });
        await this.syncUserGlobalRole(savedUser.id);
        return savedUser;
    }
    async findAllActive(milkmanId, role) {
        const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
        const whereClause = { milkmanId: (0, typeorm_2.In)(milkmanIds), isActive: true };
        if (role) {
            whereClause.relationshipRole = (0, typeorm_2.In)([role, 'both']);
        }
        const mappings = await this.milkmanCustomerRepository.find({
            where: whereClause,
        });
        const customerIds = mappings.map((m) => m.customerId);
        if (customerIds.length === 0)
            return [];
        const users = await this.userRepository.find({
            where: {
                id: (0, typeorm_2.In)(customerIds),
            },
            relations: {
                ratesHistory: true,
            },
            order: { name: 'ASC' },
        });
        const mappingMap = new Map();
        const mappingRoleMap = new Map();
        const mappingMilkTypeMap = new Map();
        const mappingMilkmanIdMap = new Map();
        const mappingActiveMap = new Map();
        mappings.forEach((m) => {
            if (m.customName) {
                mappingMap.set(m.customerId, m.customName);
            }
            mappingRoleMap.set(m.customerId, m.relationshipRole);
            mappingMilkTypeMap.set(m.customerId, m.milkType);
            mappingMilkmanIdMap.set(m.customerId, m.milkmanId);
            mappingActiveMap.set(m.customerId, m.isActive);
        });
        users.forEach((user) => {
            if (mappingMap.has(user.id)) {
                user.name = mappingMap.get(user.id);
            }
            if (mappingRoleMap.has(user.id)) {
                user.role = mappingRoleMap.get(user.id);
            }
            if (mappingActiveMap.has(user.id)) {
                user.isActive = mappingActiveMap.get(user.id);
            }
            user.milkType = mappingMilkTypeMap.get(user.id) || 'Buffalo';
            user.assignedMilkmanId = mappingMilkmanIdMap.get(user.id);
            if (user.ratesHistory) {
                user.ratesHistory = user.ratesHistory.filter((r) => milkmanIds.includes(r.milkmanId) || r.milkmanId === null);
                user.ratesHistory.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            }
        });
        let subMilkmen = [];
        if (!role || role === user_entity_1.Role.MILKMAN) {
            subMilkmen = await this.userRepository.find({
                where: { parentMilkmanId: milkmanId, role: user_entity_1.Role.MILKMAN, isActive: true },
                relations: { ratesHistory: true },
                order: { name: 'ASC' }
            });
            subMilkmen.forEach((sm) => {
                sm.assignedMilkmanId = milkmanId;
                sm.milkType = sm.milkTypes || 'Buffalo';
                if (sm.ratesHistory) {
                    sm.ratesHistory = sm.ratesHistory.filter((r) => r.milkmanId === milkmanId || r.milkmanId === sm.id || r.milkmanId === null);
                    sm.ratesHistory.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
                }
            });
        }
        return [...users, ...subMilkmen];
    }
    async findAll(milkmanId, role) {
        const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
        const whereClause = { milkmanId: (0, typeorm_2.In)(milkmanIds) };
        if (role) {
            whereClause.relationshipRole = (0, typeorm_2.In)([role, 'both']);
        }
        const mappings = await this.milkmanCustomerRepository.find({
            where: whereClause,
        });
        const customerIds = mappings.map((m) => m.customerId);
        let users = [];
        if (customerIds.length > 0) {
            users = await this.userRepository.find({
                where: {
                    id: (0, typeorm_2.In)(customerIds),
                },
                relations: {
                    ratesHistory: true,
                },
                order: { name: 'ASC' },
            });
            const mappingMap = new Map();
            const mappingRoleMap = new Map();
            const mappingMilkTypeMap = new Map();
            const mappingMilkmanIdMap = new Map();
            const mappingActiveMap = new Map();
            mappings.forEach((m) => {
                if (m.customName) {
                    mappingMap.set(m.customerId, m.customName);
                }
                mappingRoleMap.set(m.customerId, m.relationshipRole);
                mappingMilkTypeMap.set(m.customerId, m.milkType);
                mappingMilkmanIdMap.set(m.customerId, m.milkmanId);
                mappingActiveMap.set(m.customerId, m.isActive);
            });
            users.forEach((user) => {
                if (mappingMap.has(user.id)) {
                    user.name = mappingMap.get(user.id);
                }
                if (mappingRoleMap.has(user.id)) {
                    user.role = mappingRoleMap.get(user.id);
                }
                if (mappingActiveMap.has(user.id)) {
                    user.isActive = mappingActiveMap.get(user.id);
                }
                user.milkType = mappingMilkTypeMap.get(user.id) || 'Buffalo';
                user.assignedMilkmanId = mappingMilkmanIdMap.get(user.id);
                if (user.ratesHistory) {
                    user.ratesHistory = user.ratesHistory.filter((r) => milkmanIds.includes(r.milkmanId) || r.milkmanId === null);
                    user.ratesHistory.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
                }
            });
        }
        let subMilkmen = [];
        if (!role || role === user_entity_1.Role.MILKMAN) {
            subMilkmen = await this.userRepository.find({
                where: { parentMilkmanId: milkmanId, role: user_entity_1.Role.MILKMAN },
                relations: { ratesHistory: true },
                order: { name: 'ASC' }
            });
            subMilkmen.forEach((sm) => {
                sm.assignedMilkmanId = milkmanId;
                sm.milkType = sm.milkTypes || 'Buffalo';
                if (sm.ratesHistory) {
                    sm.ratesHistory = sm.ratesHistory.filter((r) => r.milkmanId === milkmanId || r.milkmanId === sm.id || r.milkmanId === null);
                    sm.ratesHistory.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
                }
            });
        }
        return [...users, ...subMilkmen];
    }
    async findByMobile(mobileNumber) {
        const user = await this.userRepository.findOne({
            where: { mobileNumber, role: (0, typeorm_2.Not)(user_entity_1.Role.MILKMAN) },
        });
        if (!user)
            return null;
        const { passwordPin, ...result } = user;
        return result;
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
        let mappingMilkType = 'Buffalo';
        if (milkmanId) {
            const mapping = await this.milkmanCustomerRepository.findOne({
                where: { milkmanId, customerId: id },
            });
            if (mapping) {
                if (mapping.customName) {
                    user.name = mapping.customName;
                }
                mappingMilkType = mapping.milkType || 'Buffalo';
            }
        }
        const { passwordPin, ...result } = user;
        return { ...result, milkType: mappingMilkType };
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
            rateType: dto.rateType ?? undefined,
            milkType: dto.milkType || 'Buffalo',
        });
        return this.ratesHistoryRepository.save(rate);
    }
    async bulkUpdateRate(milkmanId, dto) {
        const mappings = await this.milkmanCustomerRepository.find({
            where: { milkmanId },
        });
        const customerIds = mappings.map((m) => m.customerId);
        if (customerIds.length === 0) {
            return { message: `No active users found`, count: 0 };
        }
        const targetRoles = dto.role === user_entity_1.Role.FARMER
            ? [user_entity_1.Role.FARMER, user_entity_1.Role.BOTH]
            : [user_entity_1.Role.CONSUMER, user_entity_1.Role.BOTH];
        const users = await this.userRepository.find({
            where: { id: (0, typeorm_2.In)(customerIds), role: (0, typeorm_2.In)(targetRoles), isActive: true },
        });
        if (users.length === 0) {
            return { message: `No active users found for role: ${dto.role}`, count: 0 };
        }
        const rateType = dto.role === user_entity_1.Role.FARMER ? daily_ledger_entity_1.LedgerType.BUY : daily_ledger_entity_1.LedgerType.SELL_REGULAR;
        const rateEntries = users.map((user) => this.ratesHistoryRepository.create({
            userId: user.id,
            milkmanId,
            ratePerLiter: dto.ratePerLiter,
            startDate: new Date(dto.startDate + 'T00:00:00Z'),
            rateType,
            milkType: dto.milkType || 'Buffalo',
        }));
        await this.ratesHistoryRepository.save(rateEntries);
        return {
            message: `Updated rate to Rs. ${dto.ratePerLiter} for all ${users.length} active ${dto.role === user_entity_1.Role.FARMER ? 'Seller' : 'Buyer'}s.`,
            count: users.length,
        };
    }
    async syncUserGlobalRole(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user && user.role === user_entity_1.Role.MILKMAN) {
            return;
        }
        const mappings = await this.milkmanCustomerRepository.find({
            where: { customerId: userId },
        });
        let hasFarmer = false;
        let hasConsumer = false;
        mappings.forEach((m) => {
            if (m.relationshipRole === 'farmer' || m.relationshipRole === 'both') {
                hasFarmer = true;
            }
            if (m.relationshipRole === 'consumer' || m.relationshipRole === 'both') {
                hasConsumer = true;
            }
        });
        let globalRole = user_entity_1.Role.BOTH;
        if (hasFarmer && !hasConsumer) {
            globalRole = user_entity_1.Role.FARMER;
        }
        else if (!hasFarmer && hasConsumer) {
            globalRole = user_entity_1.Role.CONSUMER;
        }
        else if (!hasFarmer && !hasConsumer) {
            globalRole = user_entity_1.Role.CONSUMER;
        }
        await this.userRepository.update(userId, { role: globalRole });
    }
    async updateUser(milkmanId, userId, dto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
        const mapping = await this.milkmanCustomerRepository.findOne({
            where: { customerId: userId, milkmanId: (0, typeorm_2.In)(milkmanIds) },
        });
        if (dto.assignedMilkmanId && mapping) {
            if (dto.assignedMilkmanId !== milkmanId) {
                const isSub = await this.userRepository.findOne({
                    where: { id: dto.assignedMilkmanId, parentMilkmanId: milkmanId },
                });
                if (!isSub) {
                    throw new common_1.BadRequestException('Assigned milkman is not associated with your account');
                }
            }
            mapping.milkmanId = dto.assignedMilkmanId;
            await this.milkmanCustomerRepository.save(mapping);
        }
        if (dto.name !== undefined && mapping) {
            mapping.customName = dto.name;
            await this.milkmanCustomerRepository.save(mapping);
        }
        if (dto.rates && dto.rates.length > 0 && mapping) {
            const milkTypeList = dto.rates.map((r) => r.milkType).join(',');
            mapping.milkType = milkTypeList;
            await this.milkmanCustomerRepository.save(mapping);
            const todayDateStr = new Date().toISOString().split('T')[0];
            for (const r of dto.rates) {
                if (user.role === user_entity_1.Role.FARMER || user.role === user_entity_1.Role.BOTH) {
                    await this.updateRate(mapping.milkmanId, userId, {
                        ratePerLiter: r.ratePerLiter,
                        startDate: todayDateStr,
                        rateType: daily_ledger_entity_1.LedgerType.BUY,
                        milkType: r.milkType,
                    });
                }
                if (user.role === user_entity_1.Role.CONSUMER || user.role === user_entity_1.Role.BOTH) {
                    const sellRateVal = user.role === user_entity_1.Role.BOTH ? (r.sellRatePerLiter ?? r.ratePerLiter) : (r.sellRatePerLiter || r.ratePerLiter);
                    await this.updateRate(mapping.milkmanId, userId, {
                        ratePerLiter: sellRateVal,
                        startDate: todayDateStr,
                        rateType: daily_ledger_entity_1.LedgerType.SELL_REGULAR,
                        milkType: r.milkType,
                    });
                }
            }
        }
        else if (dto.milkType !== undefined && mapping) {
            mapping.milkType = dto.milkType;
            await this.milkmanCustomerRepository.save(mapping);
        }
        if (dto.mobileNumber !== undefined) {
            const targetRole = dto.role || user.role;
            const existing = await this.userRepository.findOne({
                where: { mobileNumber: dto.mobileNumber, role: targetRole },
            });
            if (existing && existing.id !== userId) {
                throw new common_1.ConflictException('Mobile number is already registered by another user');
            }
            user.mobileNumber = dto.mobileNumber;
        }
        if (dto.passwordPin !== undefined && dto.passwordPin !== '') {
            user.passwordPin = await bcrypt.hash(dto.passwordPin, 10);
        }
        if (dto.isActive !== undefined && mapping) {
            mapping.isActive = dto.isActive;
            if (!dto.isActive) {
                mapping.deactivatedAt = new Date();
            }
            else {
                mapping.deactivatedAt = null;
            }
            await this.milkmanCustomerRepository.save(mapping);
        }
        if (dto.address !== undefined)
            user.address = dto.address;
        if (dto.role !== undefined && mapping) {
            const oldMappingRole = mapping.relationshipRole;
            mapping.relationshipRole = dto.role;
            await this.milkmanCustomerRepository.save(mapping);
            await this.syncUserGlobalRole(userId);
            const updatedUser = await this.userRepository.findOne({ where: { id: userId } });
            if (updatedUser) {
                user.role = updatedUser.role;
            }
            const newMappingRole = dto.role;
            if (newMappingRole === user_entity_1.Role.BOTH && oldMappingRole !== user_entity_1.Role.BOTH) {
                const existingRates = await this.ratesHistoryRepository.find({
                    where: { userId: user.id, milkmanId: mapping.milkmanId },
                });
                const existingTypes = new Set(existingRates.map((r) => r.rateType));
                const requiredTypes = this.getRateTypesForRole(user_entity_1.Role.BOTH);
                const missingTypes = requiredTypes.filter((t) => !existingTypes.has(t));
                for (const rateType of missingTypes) {
                    const latestExisting = await this.ratesHistoryRepository.findOne({
                        where: { userId: user.id, milkmanId: mapping.milkmanId },
                        order: { startDate: 'DESC' },
                    });
                    const defaultRate = latestExisting ? Number(latestExisting.ratePerLiter) : 0;
                    const newRate = this.ratesHistoryRepository.create({
                        userId: user.id,
                        milkmanId: mapping.milkmanId,
                        ratePerLiter: defaultRate,
                        startDate: new Date(),
                        rateType,
                    });
                    await this.ratesHistoryRepository.save(newRate);
                }
            }
        }
        const savedUser = await this.userRepository.save(user);
        const { passwordPin, ...result } = savedUser;
        return { ...result, name: dto.name || user.name };
    }
    async getMyMilkmen(customerId, role) {
        const mappings = await this.milkmanCustomerRepository.find({
            where: { customerId },
            relations: { milkman: true },
        });
        let milkmenList = mappings.map((m) => {
            const { passwordPin, ...result } = m.milkman;
            return {
                ...result,
                relationshipRole: m.relationshipRole,
            };
        });
        if (role) {
            const targetRateType = role === 'farmer' ? daily_ledger_entity_1.LedgerType.BUY : daily_ledger_entity_1.LedgerType.SELL_REGULAR;
            const validMilkmanIds = new Set();
            const rates = await this.ratesHistoryRepository.find({
                where: { userId: customerId, rateType: targetRateType },
            });
            rates.forEach((r) => {
                if (r.milkmanId)
                    validMilkmanIds.add(r.milkmanId);
            });
            milkmenList = milkmenList.filter((m) => validMilkmanIds.has(m.id));
        }
        return milkmenList;
    }
    async getMilkTypes(milkmanId) {
        const user = await this.userRepository.findOne({ where: { id: milkmanId } });
        if (!user)
            throw new common_1.NotFoundException('Milkman not found');
        const types = user.milkTypes || 'Buffalo,Cow';
        return types.split(',').map((t) => t.trim()).filter(Boolean);
    }
    async updateMilkTypes(milkmanId, milkTypes) {
        const user = await this.userRepository.findOne({ where: { id: milkmanId } });
        if (!user)
            throw new common_1.NotFoundException('Milkman not found');
        user.milkTypes = milkTypes.map((t) => t.trim()).filter(Boolean).join(',');
        await this.userRepository.save(user);
        return milkTypes;
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
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not } from 'typeorm';
import { User, Role } from '../entities/user.entity';
import { RatesHistory } from '../entities/rates-history.entity';
import { MilkmanCustomer } from '../entities/milkman-customer.entity';
import { LedgerType } from '../entities/daily-ledger.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BulkUpdateRateDto } from './dto/bulk-update-rate.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RatesHistory)
    private ratesHistoryRepository: Repository<RatesHistory>,
    @InjectRepository(MilkmanCustomer)
    private milkmanCustomerRepository: Repository<MilkmanCustomer>,
    private dataSource: DataSource,
  ) { }

  async findSubMilkmen(parentMilkmanId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { parentMilkmanId, role: Role.MILKMAN, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getTargetMilkmanIds(milkmanId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({ where: { id: milkmanId } });
    if (user && user.role === Role.MILKMAN && !user.parentMilkmanId) {
      const subMilkmen = await this.userRepository.find({
        where: { parentMilkmanId: milkmanId, role: Role.MILKMAN, isActive: true },
      });
      return [milkmanId, ...subMilkmen.map((u) => u.id)];
    }
    return [milkmanId];
  }

  private getRateTypesForRole(role: Role): LedgerType[] {
    if (role === Role.FARMER) return [LedgerType.BUY];
    if (role === Role.CONSUMER) return [LedgerType.SELL_REGULAR];
    return [LedgerType.BUY, LedgerType.SELL_REGULAR]; // both
  }

  private async createRates(
    manager: any,
    userId: string,
    milkmanId: string,
    ratePerLiter: number,
    sellRatePerLiter: number | undefined,
    role: Role,
    milkType: string = 'Buffalo',
  ) {
    const types = this.getRateTypesForRole(role);
    for (const rateType of types) {
      const rateVal = rateType === LedgerType.BUY ? ratePerLiter : (sellRatePerLiter ?? ratePerLiter);
      const rate = manager.create(RatesHistory, {
        userId,
        milkmanId,
        ratePerLiter: rateVal,
        startDate: new Date(),
        rateType,
        milkType,
      });
      await manager.save(RatesHistory, rate);
    }
  }

  async createUser(milkmanId: string, dto: CreateUserDto) {
    if (dto.role === Role.MILKMAN) {
      const existingMilkman = await this.userRepository.findOne({
        where: { mobileNumber: dto.mobileNumber, role: Role.MILKMAN },
      });
      if (existingMilkman) {
        throw new ConflictException('A milkman with this mobile number already exists');
      }
      const hashedPin = await bcrypt.hash(dto.passwordPin, 10);
      const user = this.userRepository.create({
        name: dto.name,
        mobileNumber: dto.mobileNumber,
        passwordPin: hashedPin,
        role: Role.MILKMAN,
        parentMilkmanId: milkmanId,
        address: dto.address,
      });
      const saved = await this.userRepository.save(user);
      const { passwordPin, ...result } = saved;
      return result;
    }

    const targetRole = dto.role || Role.BOTH;
    const targetMilkmanId = dto.assignedMilkmanId || milkmanId;

    if (dto.assignedMilkmanId && dto.assignedMilkmanId !== milkmanId) {
      const isSub = await this.userRepository.findOne({
        where: { id: dto.assignedMilkmanId, parentMilkmanId: milkmanId },
      });
      if (!isSub) {
        throw new BadRequestException('Assigned milkman is not associated with your account');
      }
    }

    const existing = await this.userRepository.findOne({
      where: { mobileNumber: dto.mobileNumber, role: Not(Role.MILKMAN) },
    });

    if (existing) {
      // Check if already associated with this milkman
      const existingMapping = await this.milkmanCustomerRepository.findOne({
        where: { milkmanId: targetMilkmanId, customerId: existing.id },
      });

      if (existingMapping) {
        throw new ConflictException('This customer is already added to your directory');
      }

      let milkTypeList = dto.milkType || 'Buffalo';
      if (dto.rates && dto.rates.length > 0) {
        milkTypeList = dto.rates.map((r) => r.milkType).join(',');
      }

      // Associate existing user with this milkman
      await this.dataSource.transaction(async (manager) => {
        const mapping = manager.create(MilkmanCustomer, {
          milkmanId: targetMilkmanId,
          customerId: existing.id,
          customName: dto.name,
          relationshipRole: targetRole,
          milkType: milkTypeList,
        });
        await manager.save(MilkmanCustomer, mapping);

        // Set rate(s) for this milkman
        if (dto.rates && dto.rates.length > 0) {
          for (const r of dto.rates) {
            await this.createRates(manager, existing.id, targetMilkmanId, r.ratePerLiter, r.sellRatePerLiter, targetRole, r.milkType);
          }
        } else {
          await this.createRates(manager, existing.id, targetMilkmanId, dto.ratePerLiter || 0, dto.sellRatePerLiter, targetRole, dto.milkType || 'Buffalo');
        }
      });

      // Synchronize global role
      await this.syncUserGlobalRole(existing.id);

      const updatedUser = await this.userRepository.findOne({ where: { id: existing.id } });
      const { passwordPin, ...result } = updatedUser || existing;
      return { ...result, name: dto.name };
    }

    const hashedPin = await bcrypt.hash(dto.passwordPin, 10);

    const savedUser = await this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        name: dto.name,
        mobileNumber: dto.mobileNumber,
        passwordPin: hashedPin,
        role: targetRole,
        address: dto.address,
      });
      const saved = await manager.save(User, user);

      let milkTypeList = dto.milkType || 'Buffalo';
      if (dto.rates && dto.rates.length > 0) {
        milkTypeList = dto.rates.map((r) => r.milkType).join(',');
      }

      // Create mapping
      const mapping = manager.create(MilkmanCustomer, {
        milkmanId: targetMilkmanId,
        customerId: saved.id,
        customName: dto.name,
        relationshipRole: targetRole,
        milkType: milkTypeList,
      });
      await manager.save(MilkmanCustomer, mapping);

      // Initialize rate(s) specific to this milkman
      if (dto.rates && dto.rates.length > 0) {
        for (const r of dto.rates) {
          await this.createRates(manager, saved.id, targetMilkmanId, r.ratePerLiter, r.sellRatePerLiter, targetRole, r.milkType);
        }
      } else {
        await this.createRates(manager, saved.id, targetMilkmanId, dto.ratePerLiter || 0, dto.sellRatePerLiter, targetRole, dto.milkType || 'Buffalo');
      }

      return saved;
    });

    await this.syncUserGlobalRole(savedUser.id);
    return savedUser;
  }

  async findAllActive(milkmanId: string, role?: Role) {
    const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
    const whereClause: any = { milkmanId: In(milkmanIds), isActive: true };
    if (role) {
      whereClause.relationshipRole = In([role, 'both']);
    }
    const mappings = await this.milkmanCustomerRepository.find({
      where: whereClause,
    });
    const customerIds = mappings.map((m) => m.customerId);
    if (customerIds.length === 0) return [];

    const users = await this.userRepository.find({
      where: {
        id: In(customerIds),
      },
      relations: {
        ratesHistory: true,
      },
      order: { name: 'ASC' },
    });

    const mappingMap = new Map<string, string>();
    const mappingRoleMap = new Map<string, string>();
    const mappingMilkTypeMap = new Map<string, string>();
    const mappingMilkmanIdMap = new Map<string, string>();
    const mappingActiveMap = new Map<string, boolean>();
    mappings.forEach((m) => {
      if (m.customName) {
        mappingMap.set(m.customerId, m.customName);
      }
      mappingRoleMap.set(m.customerId, m.relationshipRole);
      mappingMilkTypeMap.set(m.customerId, m.milkType);
      mappingMilkmanIdMap.set(m.customerId, m.milkmanId);
      mappingActiveMap.set(m.customerId, m.isActive);
    });

    // Filter rates specific to this milkman & apply custom name & override role & attach milkType & assignedMilkmanId
    users.forEach((user) => {
      if (mappingMap.has(user.id)) {
        user.name = mappingMap.get(user.id) as string;
      }
      if (mappingRoleMap.has(user.id)) {
        user.role = mappingRoleMap.get(user.id) as any;
      }
      if (mappingActiveMap.has(user.id)) {
        user.isActive = mappingActiveMap.get(user.id) as boolean;
      }
      (user as any).milkType = mappingMilkTypeMap.get(user.id) || 'Buffalo';
      (user as any).assignedMilkmanId = mappingMilkmanIdMap.get(user.id);
      if (user.ratesHistory) {
        user.ratesHistory = user.ratesHistory.filter(
          (r) => milkmanIds.includes(r.milkmanId) || r.milkmanId === null
        );
        user.ratesHistory.sort(
          (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
      }
    });

    let subMilkmen: User[] = [];
    if (!role || role === Role.MILKMAN) {
      subMilkmen = await this.userRepository.find({
        where: { parentMilkmanId: milkmanId, role: Role.MILKMAN, isActive: true },
        relations: { ratesHistory: true },
        order: { name: 'ASC' }
      });
      subMilkmen.forEach((sm) => {
        (sm as any).assignedMilkmanId = milkmanId;
        (sm as any).milkType = sm.milkTypes || 'Buffalo';
        if (sm.ratesHistory) {
          sm.ratesHistory = sm.ratesHistory.filter(
            (r) => r.milkmanId === milkmanId || r.milkmanId === sm.id || r.milkmanId === null
          );
          sm.ratesHistory.sort(
            (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
        }
      });
    }

    return [...users, ...subMilkmen];
  }

  async findAll(milkmanId: string, role?: Role) {
    const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
    const whereClause: any = { milkmanId: In(milkmanIds) };
    if (role) {
      whereClause.relationshipRole = In([role, 'both']);
    }
    const mappings = await this.milkmanCustomerRepository.find({
      where: whereClause,
    });
    const customerIds = mappings.map((m) => m.customerId);
    
    let users: User[] = [];
    if (customerIds.length > 0) {
      users = await this.userRepository.find({
        where: {
          id: In(customerIds),
        },
        relations: {
          ratesHistory: true,
        },
        order: { name: 'ASC' },
      });

      const mappingMap = new Map<string, string>();
      const mappingRoleMap = new Map<string, string>();
      const mappingMilkTypeMap = new Map<string, string>();
      const mappingMilkmanIdMap = new Map<string, string>();
      const mappingActiveMap = new Map<string, boolean>();
      mappings.forEach((m) => {
        if (m.customName) {
          mappingMap.set(m.customerId, m.customName);
        }
        mappingRoleMap.set(m.customerId, m.relationshipRole);
        mappingMilkTypeMap.set(m.customerId, m.milkType);
        mappingMilkmanIdMap.set(m.customerId, m.milkmanId);
        mappingActiveMap.set(m.customerId, m.isActive);
      });

      // Filter rates specific to this milkman & apply custom name & override role & attach milkType & assignedMilkmanId
      users.forEach((user) => {
        if (mappingMap.has(user.id)) {
          user.name = mappingMap.get(user.id) as string;
        }
        if (mappingRoleMap.has(user.id)) {
          user.role = mappingRoleMap.get(user.id) as any;
        }
        if (mappingActiveMap.has(user.id)) {
          user.isActive = mappingActiveMap.get(user.id) as boolean;
        }
        (user as any).milkType = mappingMilkTypeMap.get(user.id) || 'Buffalo';
        (user as any).assignedMilkmanId = mappingMilkmanIdMap.get(user.id);
        if (user.ratesHistory) {
          user.ratesHistory = user.ratesHistory.filter(
            (r) => milkmanIds.includes(r.milkmanId) || r.milkmanId === null
          );
          user.ratesHistory.sort(
            (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
        }
      });
    }

    let subMilkmen: User[] = [];
    if (!role || role === Role.MILKMAN) {
      subMilkmen = await this.userRepository.find({
        where: { parentMilkmanId: milkmanId, role: Role.MILKMAN },
        relations: { ratesHistory: true },
        order: { name: 'ASC' }
      });
      subMilkmen.forEach((sm) => {
        (sm as any).assignedMilkmanId = milkmanId;
        (sm as any).milkType = sm.milkTypes || 'Buffalo';
        if (sm.ratesHistory) {
          sm.ratesHistory = sm.ratesHistory.filter(
            (r) => r.milkmanId === milkmanId || r.milkmanId === sm.id || r.milkmanId === null
          );
          sm.ratesHistory.sort(
            (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
        }
      });
    }

    return [...users, ...subMilkmen];
  }

  async findByMobile(mobileNumber: string) {
    const user = await this.userRepository.findOne({
      where: { mobileNumber, role: Not(Role.MILKMAN) },
    });
    if (!user) return null;
    const { passwordPin, ...result } = user;
    return result;
  }

  async findOne(id: string, milkmanId?: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: {
        ratesHistory: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.ratesHistory) {
      if (milkmanId) {
        user.ratesHistory = user.ratesHistory.filter(
          (r) => r.milkmanId === milkmanId || r.milkmanId === null
        );
      }
      user.ratesHistory.sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
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

  async updateRate(milkmanId: string, userId: string, dto: UpdateRateDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
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

  async bulkUpdateRate(milkmanId: string, dto: BulkUpdateRateDto) {
    const mappings = await this.milkmanCustomerRepository.find({
      where: { milkmanId },
    });
    const customerIds = mappings.map((m) => m.customerId);
    if (customerIds.length === 0) {
      return { message: `No active users found`, count: 0 };
    }

    const targetRoles = dto.role === Role.FARMER 
      ? [Role.FARMER, Role.BOTH] 
      : [Role.CONSUMER, Role.BOTH];

    const users = await this.userRepository.find({
      where: { id: In(customerIds), role: In(targetRoles), isActive: true },
    });

    if (users.length === 0) {
      return { message: `No active users found for role: ${dto.role}`, count: 0 };
    }

    const rateType = dto.role === Role.FARMER ? LedgerType.BUY : LedgerType.SELL_REGULAR;

    const rateEntries = users.map((user) =>
      this.ratesHistoryRepository.create({
        userId: user.id,
        milkmanId,
        ratePerLiter: dto.ratePerLiter,
        startDate: new Date(dto.startDate + 'T00:00:00Z'),
        rateType,
        milkType: dto.milkType || 'Buffalo',
      }),
    );

    await this.ratesHistoryRepository.save(rateEntries);
    return {
      message: `Updated rate to Rs. ${dto.ratePerLiter} for all ${users.length} active ${dto.role === Role.FARMER ? 'Seller' : 'Buyer'}s.`,
      count: users.length,
    };
  }

  async syncUserGlobalRole(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user && user.role === Role.MILKMAN) {
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

    let globalRole = Role.BOTH;
    if (hasFarmer && !hasConsumer) {
      globalRole = Role.FARMER;
    } else if (!hasFarmer && hasConsumer) {
      globalRole = Role.CONSUMER;
    } else if (!hasFarmer && !hasConsumer) {
      globalRole = Role.CONSUMER;
    }

    await this.userRepository.update(userId, { role: globalRole });
  }

  async updateUser(milkmanId: string, userId: string, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const milkmanIds = await this.getTargetMilkmanIds(milkmanId);
    const mapping = await this.milkmanCustomerRepository.findOne({
      where: { customerId: userId, milkmanId: In(milkmanIds) },
    });

    if (dto.assignedMilkmanId && mapping) {
      if (dto.assignedMilkmanId !== milkmanId) {
        const isSub = await this.userRepository.findOne({
          where: { id: dto.assignedMilkmanId, parentMilkmanId: milkmanId },
        });
        if (!isSub) {
          throw new BadRequestException('Assigned milkman is not associated with your account');
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
        if (user.role === Role.FARMER || user.role === Role.BOTH) {
          await this.updateRate(mapping.milkmanId, userId, {
            ratePerLiter: r.ratePerLiter,
            startDate: todayDateStr,
            rateType: LedgerType.BUY,
            milkType: r.milkType,
          });
        }
        if (user.role === Role.CONSUMER || user.role === Role.BOTH) {
          const sellRateVal = user.role === Role.BOTH ? (r.sellRatePerLiter ?? r.ratePerLiter) : (r.sellRatePerLiter || r.ratePerLiter);
          await this.updateRate(mapping.milkmanId, userId, {
            ratePerLiter: sellRateVal,
            startDate: todayDateStr,
            rateType: LedgerType.SELL_REGULAR,
            milkType: r.milkType,
          });
        }
      }
    } else if (dto.milkType !== undefined && mapping) {
      mapping.milkType = dto.milkType;
      await this.milkmanCustomerRepository.save(mapping);
    }

    if (dto.mobileNumber !== undefined) {
      const targetRole = dto.role || user.role;
      const existing = await this.userRepository.findOne({
        where: { mobileNumber: dto.mobileNumber, role: targetRole as any },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Mobile number is already registered by another user');
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
      } else {
        mapping.deactivatedAt = null;
      }
      await this.milkmanCustomerRepository.save(mapping);
    }
    if (dto.address !== undefined) user.address = dto.address;
    if (dto.role !== undefined && mapping) {
      const oldMappingRole = mapping.relationshipRole as Role;
      mapping.relationshipRole = dto.role;
      await this.milkmanCustomerRepository.save(mapping);

      // Synchronize global role
      await this.syncUserGlobalRole(userId);

      // Reload from DB to have the calculated global user role
      const updatedUser = await this.userRepository.findOne({ where: { id: userId } });
      if (updatedUser) {
        user.role = updatedUser.role;
      }

      // Initialize missing rates for this milkman if mapping role upgraded to BOTH
      const newMappingRole = dto.role as Role;
      if (newMappingRole === Role.BOTH && oldMappingRole !== Role.BOTH) {
        const existingRates = await this.ratesHistoryRepository.find({
          where: { userId: user.id, milkmanId: mapping.milkmanId },
        });
        const existingTypes = new Set(existingRates.map((r) => r.rateType));
        const requiredTypes = this.getRateTypesForRole(Role.BOTH);
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

  async getMyMilkmen(customerId: string, role?: string) {
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
      // Filter milkmen where the customer has rates of the corresponding type
      const targetRateType = role === 'farmer' ? LedgerType.BUY : LedgerType.SELL_REGULAR;
      const validMilkmanIds = new Set<string>();

      const rates = await this.ratesHistoryRepository.find({
        where: { userId: customerId, rateType: targetRateType },
      });
      rates.forEach((r) => {
        if (r.milkmanId) validMilkmanIds.add(r.milkmanId);
      });

      milkmenList = milkmenList.filter((m) => validMilkmanIds.has(m.id));
    }

    return milkmenList;
  }

  async getMilkTypes(milkmanId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({ where: { id: milkmanId } });
    if (!user) throw new NotFoundException('Milkman not found');
    const types = user.milkTypes || 'Buffalo,Cow';
    return types.split(',').map((t) => t.trim()).filter(Boolean);
  }

  async updateMilkTypes(milkmanId: string, milkTypes: string[]): Promise<string[]> {
    const user = await this.userRepository.findOne({ where: { id: milkmanId } });
    if (!user) throw new NotFoundException('Milkman not found');
    user.milkTypes = milkTypes.map((t) => t.trim()).filter(Boolean).join(',');
    await this.userRepository.save(user);
    return milkTypes;
  }
}

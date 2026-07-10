import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
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
      });
      await manager.save(RatesHistory, rate);
    }
  }

  async createUser(milkmanId: string, dto: CreateUserDto) {
    const existing = await this.userRepository.findOne({
      where: { mobileNumber: dto.mobileNumber },
    });

    if (existing) {
      // Check if already associated with this milkman
      const existingMapping = await this.milkmanCustomerRepository.findOne({
        where: { milkmanId, customerId: existing.id },
      });

      if (existingMapping) {
        throw new ConflictException('This customer is already added to your directory');
      }

      // Associate existing user with this milkman
      await this.dataSource.transaction(async (manager) => {
        const mapping = manager.create(MilkmanCustomer, {
          milkmanId,
          customerId: existing.id,
          customName: dto.name,
          relationshipRole: dto.role,
        });
        await manager.save(MilkmanCustomer, mapping);

        // Set rate(s) for this milkman
        await this.createRates(manager, existing.id, milkmanId, dto.ratePerLiter, dto.sellRatePerLiter, dto.role as Role);
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
        role: dto.role as Role,
        address: dto.address,
      });
      const saved = await manager.save(User, user);

      // Create mapping
      const mapping = manager.create(MilkmanCustomer, {
        milkmanId,
        customerId: saved.id,
        customName: dto.name,
        relationshipRole: dto.role,
      });
      await manager.save(MilkmanCustomer, mapping);

      // Initialize rate(s) specific to this milkman
      await this.createRates(manager, saved.id, milkmanId, dto.ratePerLiter, dto.sellRatePerLiter, dto.role as Role);

      return saved;
    });

    await this.syncUserGlobalRole(savedUser.id);
    return savedUser;
  }

  async findAllActive(milkmanId: string, role?: Role) {
    const whereClause: any = { milkmanId };
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
        isActive: true,
      },
      relations: {
        ratesHistory: true,
      },
      order: { name: 'ASC' },
    });

    const mappingMap = new Map<string, string>();
    const mappingRoleMap = new Map<string, string>();
    mappings.forEach((m) => {
      if (m.customName) {
        mappingMap.set(m.customerId, m.customName);
      }
      mappingRoleMap.set(m.customerId, m.relationshipRole);
    });

    // Filter rates specific to this milkman & apply custom name & override role
    users.forEach((user) => {
      if (mappingMap.has(user.id)) {
        user.name = mappingMap.get(user.id) as string;
      }
      if (mappingRoleMap.has(user.id)) {
        user.role = mappingRoleMap.get(user.id) as any;
      }
      if (user.ratesHistory) {
        user.ratesHistory = user.ratesHistory.filter(
          (r) => r.milkmanId === milkmanId || r.milkmanId === null
        );
        user.ratesHistory.sort(
          (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
      }
    });

    return users;
  }

  async findAll(milkmanId: string, role?: Role) {
    const whereClause: any = { milkmanId };
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
    mappings.forEach((m) => {
      if (m.customName) {
        mappingMap.set(m.customerId, m.customName);
      }
      mappingRoleMap.set(m.customerId, m.relationshipRole);
    });

    // Filter rates specific to this milkman & apply custom name & override role
    users.forEach((user) => {
      if (mappingMap.has(user.id)) {
        user.name = mappingMap.get(user.id) as string;
      }
      if (mappingRoleMap.has(user.id)) {
        user.role = mappingRoleMap.get(user.id) as any;
      }
      if (user.ratesHistory) {
        user.ratesHistory = user.ratesHistory.filter(
          (r) => r.milkmanId === milkmanId || r.milkmanId === null
        );
        user.ratesHistory.sort(
          (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
      }
    });

    return users;
  }

  async findByMobile(mobileNumber: string) {
    const user = await this.userRepository.findOne({
      where: { mobileNumber },
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
    });
    return this.ratesHistoryRepository.save(rate);
  }

  async bulkUpdateRate(milkmanId: string, dto: BulkUpdateRateDto) {
    const mappings = await this.milkmanCustomerRepository.find({
      where: { milkmanId },
    });
    const customerIds = mappings.map((m) => m.customerId);
    if (customerIds.length === 0) {
      return { message: `No active users found for role: ${dto.role}`, count: 0 };
    }

    const users = await this.userRepository.find({
      where: { id: In(customerIds), role: dto.role, isActive: true },
    });

    if (users.length === 0) {
      return { message: `No active users found for role: ${dto.role}`, count: 0 };
    }

    const types = this.getRateTypesForRole(dto.role);
    const rateEntries = users.flatMap((user) =>
      types.map((rateType) =>
        this.ratesHistoryRepository.create({
          userId: user.id,
          milkmanId,
          ratePerLiter: dto.ratePerLiter,
          startDate: new Date(dto.startDate + 'T00:00:00Z'),
          rateType,
        }),
      ),
    );

    await this.ratesHistoryRepository.save(rateEntries);
    return {
      message: `Updated rate to Rs. ${dto.ratePerLiter} for all ${users.length} active ${dto.role}s.`,
      count: users.length,
    };
  }

  async syncUserGlobalRole(userId: string) {
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
        throw new ConflictException('Mobile number is already registered by another user');
      }
      user.mobileNumber = dto.mobileNumber;
    }
    if (dto.passwordPin !== undefined && dto.passwordPin !== '') {
      user.passwordPin = await bcrypt.hash(dto.passwordPin, 10);
    }
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.address !== undefined) user.address = dto.address;
    if (dto.role !== undefined) {
      const mapping = await this.milkmanCustomerRepository.findOne({
        where: { milkmanId, customerId: userId },
      });
      if (mapping) {
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
            where: { userId: user.id, milkmanId },
          });
          const existingTypes = new Set(existingRates.map((r) => r.rateType));
          const requiredTypes = this.getRateTypesForRole(Role.BOTH);
          const missingTypes = requiredTypes.filter((t) => !existingTypes.has(t));

          for (const rateType of missingTypes) {
            const latestExisting = await this.ratesHistoryRepository.findOne({
              where: { userId: user.id, milkmanId },
              order: { startDate: 'DESC' },
            });
            const defaultRate = latestExisting ? Number(latestExisting.ratePerLiter) : 0;
            const newRate = this.ratesHistoryRepository.create({
              userId: user.id,
              milkmanId,
              ratePerLiter: defaultRate,
              startDate: new Date(),
              rateType,
            });
            await this.ratesHistoryRepository.save(newRate);
          }
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
}

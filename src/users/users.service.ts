import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { User, Role } from '../entities/user.entity';
import { RatesHistory } from '../entities/rates-history.entity';
import { MilkmanCustomer } from '../entities/milkman-customer.entity';
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

  async createUser(milkmanId: string, dto: CreateUserDto) {
    const existing = await this.userRepository.findOne({
      where: { mobileNumber: dto.mobileNumber },
    });

    if (existing) {
      if (existing.role !== dto.role) {
        throw new ConflictException('Mobile number is already registered with a different user role');
      }

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
        });
        await manager.save(MilkmanCustomer, mapping);

        // Set rate for this milkman
        const rate = manager.create(RatesHistory, {
          userId: existing.id,
          milkmanId,
          ratePerLiter: dto.ratePerLiter,
          startDate: new Date(),
        });
        await manager.save(RatesHistory, rate);
      });

      const { passwordPin, ...result } = existing;
      return { ...result, name: dto.name };
    }

    const hashedPin = await bcrypt.hash(dto.passwordPin, 10);

    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        name: dto.name,
        mobileNumber: dto.mobileNumber,
        passwordPin: hashedPin,
        role: dto.role as Role,
        address: dto.address,
      });
      const savedUser = await manager.save(User, user);

      // Create mapping
      const mapping = manager.create(MilkmanCustomer, {
        milkmanId,
        customerId: savedUser.id,
        customName: dto.name,
      });
      await manager.save(MilkmanCustomer, mapping);

      // Initialize rate specific to this milkman
      const rate = manager.create(RatesHistory, {
        userId: savedUser.id,
        milkmanId,
        ratePerLiter: dto.ratePerLiter,
        startDate: new Date(),
      });
      await manager.save(RatesHistory, rate);

      return savedUser;
    });
  }

  async findAllActive(milkmanId: string, role?: Role) {
    const mappings = await this.milkmanCustomerRepository.find({
      where: { milkmanId },
    });
    const customerIds = mappings.map((m) => m.customerId);
    if (customerIds.length === 0) return [];

    const users = await this.userRepository.find({
      where: {
        id: In(customerIds),
        isActive: true,
        role: role ? In([role, Role.BOTH]) : In([Role.FARMER, Role.CONSUMER, Role.BOTH]),
      },
      relations: {
        ratesHistory: true,
      },
      order: { name: 'ASC' },
    });

    const mappingMap = new Map<string, string>();
    mappings.forEach((m) => {
      if (m.customName) {
        mappingMap.set(m.customerId, m.customName);
      }
    });

    // Filter rates specific to this milkman & apply custom name
    users.forEach((user) => {
      if (mappingMap.has(user.id)) {
        user.name = mappingMap.get(user.id) as string;
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
    const mappings = await this.milkmanCustomerRepository.find({
      where: { milkmanId },
    });
    const customerIds = mappings.map((m) => m.customerId);
    if (customerIds.length === 0) return [];

    const users = await this.userRepository.find({
      where: {
        id: In(customerIds),
        role: role ? In([role, Role.BOTH]) : In([Role.FARMER, Role.CONSUMER, Role.BOTH]),
      },
      relations: {
        ratesHistory: true,
      },
      order: { name: 'ASC' },
    });

    const mappingMap = new Map<string, string>();
    mappings.forEach((m) => {
      if (m.customName) {
        mappingMap.set(m.customerId, m.customName);
      }
    });

    // Filter rates specific to this milkman & apply custom name
    users.forEach((user) => {
      if (mappingMap.has(user.id)) {
        user.name = mappingMap.get(user.id) as string;
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
    if (dto.role !== undefined) user.role = dto.role as Role;

    const savedUser = await this.userRepository.save(user);
    const { passwordPin, ...result } = savedUser;
    return { ...result, name: dto.name || user.name };
  }

  async getMyMilkmen(customerId: string) {
    const mappings = await this.milkmanCustomerRepository.find({
      where: { customerId },
      relations: { milkman: true },
    });
    return mappings.map((m) => {
      const { passwordPin, ...result } = m.milkman;
      return result;
    });
  }
}

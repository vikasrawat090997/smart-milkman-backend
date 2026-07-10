import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BulkUpdateRateDto } from './dto/bulk-update-rate.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/users')
export class UsersController {
  constructor(private usersService: UsersService) { }

  @Post()
  @Roles(Role.MILKMAN)
  async createUser(@Request() req, @Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(req.user.id, createUserDto);
  }

  @Get('my-milkmen')
  async getMyMilkmen(@Request() req, @Query('role') role?: string) {
    return this.usersService.getMyMilkmen(req.user.id, role);
  }

  @Get('active')
  async getActive(@Request() req, @Query('role') role?: Role) {
    return this.usersService.findAllActive(req.user.id, role);
  }

  @Get()
  @Roles(Role.MILKMAN)
  async getAll(@Request() req, @Query('role') role?: Role) {
    return this.usersService.findAll(req.user.id, role);
  }

  @Post('bulk-rate')
  @Roles(Role.MILKMAN)
  async bulkUpdateRate(@Request() req, @Body() bulkUpdateRateDto: BulkUpdateRateDto) {
    return this.usersService.bulkUpdateRate(req.user.id, bulkUpdateRateDto);
  }

  @Get('by-mobile/:mobile')
  async findByMobile(@Request() req, @Param('mobile') mobile: string) {
    const user = await this.usersService.findByMobile(mobile);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const milkmanId = req.user.role === Role.MILKMAN ? req.user.id : undefined;
    return this.usersService.findOne(id, milkmanId);
  }

  @Post(':id/rate')
  @Roles(Role.MILKMAN)
  async updateRate(@Request() req, @Param('id') userId: string, @Body() updateRateDto: UpdateRateDto) {
    return this.usersService.updateRate(req.user.id, userId, updateRateDto);
  }

  @Patch(':id')
  @Roles(Role.MILKMAN)
  async updateUser(@Request() req, @Param('id') userId: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(req.user.id, userId, updateUserDto);
  }
}

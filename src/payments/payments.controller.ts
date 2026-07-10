import { Controller, Post, Put, Get, Body, Param, Request, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @Roles(Role.MILKMAN)
  async createPayment(@Request() req, @Body() dto: CreatePaymentDto) {
    // req.user contains the authenticated Milkman info from JwtStrategy
    return this.paymentsService.createPayment(req.user.id, dto);
  }

  @Put(':id')
  @Roles(Role.MILKMAN)
  async updatePayment(@Param('id') id: string, @Body() dto: { amountPaid?: number; date?: string; paymentMode?: string }) {
    return this.paymentsService.updatePayment(id, dto);
  }

  @Get('user/:userId')
  async getPaymentsForUser(@Param('userId') userId: string) {
    return this.paymentsService.getPaymentsForUser(userId);
  }
}

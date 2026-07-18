import { Controller, Post, Get, Body, Param, Query, Request, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import * as express from 'express';
import { BillService } from './bill.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/bill')
export class BillController {
  constructor(private billService: BillService) { }

  @Post('lock')
  @Roles(Role.MILKMAN)
  async lockDateRange(
    @Request() req,
    @Body() body: { startDate: string; endDate: string; isLocked: boolean; userId?: string }
  ) {
    return this.billService.lockDateRange(req.user.id, body.startDate, body.endDate, body.isLocked, body.userId);
  }

  @Get('locks')
  async getLocks(@Request() req, @Query('milkmanId') queryMilkmanId?: string) {
    const milkmanId = req.user.role === Role.MILKMAN ? req.user.id : queryMilkmanId;
    if (!milkmanId) {
      throw new ForbiddenException('milkmanId is required to query billing locks');
    }
    return this.billService.getLocks(milkmanId, req.user.id, req.user.role);
  }

  @Get('download-all')
  async downloadAllBills(
    @Request() req,
    @Res() res: express.Response,
    @Query('month') month?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('role') targetRole?: string,
  ) {
    if (req.user.role !== Role.MILKMAN) {
      throw new ForbiddenException('Only milkmen can download all bills');
    }

    if (!month && (!startDate || !endDate)) {
      throw new ForbiddenException('Either query parameter "month" or both "startDate" and "endDate" are required');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=all_customer_bills.pdf`);

    await this.billService.generateAllBillsPdf(res, req.user.id, { month, startDate, endDate }, targetRole);
  }

  @Get('download/:userId')
  async downloadBill(
    @Request() req,
    @Param('userId') userId: string,
    @Res() res: express.Response,
    @Query('month') month?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('milkmanId') queryMilkmanId?: string,
    @Query('role') targetRole?: string,
  ) {
    // 1. Authorize: Users can only download their own bills. Milkman can download anyone's.
    if (req.user.role !== Role.MILKMAN && req.user.id !== userId) {
      throw new ForbiddenException('Unauthorized to view this billing statement');
    }

    if (!month && (!startDate || !endDate)) {
      throw new ForbiddenException('Either query parameter "month" or both "startDate" and "endDate" are required');
    }

    const milkmanId = req.user.role === Role.MILKMAN ? req.user.id : queryMilkmanId;
    if (!milkmanId) {
      throw new ForbiddenException('Query parameter "milkmanId" is required');
    }

    // 2. Set response headers for PDF streaming
    res.setHeader('Content-Type', 'application/pdf');
    const label = month || `${startDate}_to_${endDate}`;
    res.setHeader('Content-Disposition', `attachment; filename=bill_${userId}_${label}.pdf`);

    // 3. Generate and stream
    await this.billService.generateBillPdf(res, userId, milkmanId, { month, startDate, endDate }, req.user.role, targetRole);
  }

  @Get('data/:userId')
  async getBillData(
    @Request() req,
    @Param('userId') userId: string,
    @Query('month') month?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('milkmanId') queryMilkmanId?: string,
    @Query('role') targetRole?: string,
  ) {
    if (req.user.role !== Role.MILKMAN && req.user.id !== userId) {
      throw new ForbiddenException('Unauthorized to view this billing statement');
    }

    if (!month && (!startDate || !endDate)) {
      throw new ForbiddenException('Either query parameter "month" or both "startDate" and "endDate" are required');
    }

    const milkmanId = req.user.role === Role.MILKMAN ? req.user.id : queryMilkmanId;
    if (!milkmanId) {
      throw new ForbiddenException('Query parameter "milkmanId" is required');
    }

    return await this.billService.getBillData(userId, milkmanId, { month, startDate, endDate }, req.user.role, targetRole);
  }
}

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
  constructor(private billService: BillService) {}

  @Post('lock')
  @Roles(Role.MILKMAN)
  async lockMonth(@Request() req, @Body() body: { monthYear: string; isLocked: boolean }) {
    return this.billService.lockMonth(req.user.id, body.monthYear, body.isLocked);
  }

  @Get('locks')
  async getLocks(@Request() req, @Query('milkmanId') queryMilkmanId?: string) {
    const milkmanId = req.user.role === Role.MILKMAN ? req.user.id : queryMilkmanId;
    if (!milkmanId) {
      throw new ForbiddenException('milkmanId is required to query billing locks');
    }
    return this.billService.getLocks(milkmanId);
  }

  @Get('download/:userId')
  async downloadBill(
    @Request() req,
    @Param('userId') userId: string,
    @Res() res: express.Response,
    @Query('month') month: string, // format MM-YYYY
    @Query('milkmanId') queryMilkmanId?: string,
    @Query('role') targetRole?: string,
  ) {
    // 1. Authorize: Users can only download their own bills. Milkman can download anyone's.
    if (req.user.role !== Role.MILKMAN && req.user.id !== userId) {
      throw new ForbiddenException('Unauthorized to view this billing statement');
    }

    if (!month) {
      throw new ForbiddenException('Query parameter "month" is required (Format: MM-YYYY)');
    }

    const milkmanId = req.user.role === Role.MILKMAN ? req.user.id : queryMilkmanId;
    if (!milkmanId) {
      throw new ForbiddenException('Query parameter "milkmanId" is required');
    }

    // 2. Set response headers for PDF streaming
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bill_${userId}_${month}.pdf`);

    // 3. Generate and stream
    await this.billService.generateBillPdf(res, userId, milkmanId, month, req.user.role, targetRole);
  }
}

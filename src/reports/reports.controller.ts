import { Controller, Get, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('bill-summary/:userId')
  async getBillSummary(
    @Request() req,
    @Param('userId') userId: string,
    @Query('milkmanId') queryMilkmanId?: string,
  ) {
    const milkmanId = req.user.role === 'milkman' ? req.user.id : queryMilkmanId;
    if (!milkmanId) {
      throw new ForbiddenException('milkmanId query parameter is required');
    }
    return this.reportsService.getBillSummary(userId, milkmanId);
  }

  @Get('dashboard-summary')
  async getDashboardSummary(@Request() req, @Query('date') date: string) {
    return this.reportsService.getDashboardSummary(req.user.id, date);
  }

  @Get('monthly-report')
  async getMonthlyReport(@Request() req, @Query('month') month: string) {
    return this.reportsService.getMonthlyReport(req.user.id, month);
  }
}

import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { LedgerType } from '../entities/daily-ledger.entity';
import { LedgerService } from './ledger.service';
import { BulkSaveDto } from './dto/bulk-save.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../entities/user.entity';
import { Slot } from '../entities/daily-ledger.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/ledger')
export class LedgerController {
  constructor(private ledgerService: LedgerService) {}

  @Post('bulk-save')
  @Roles(Role.MILKMAN)
  async bulkSave(@Request() req, @Body() dto: BulkSaveDto) {
    return this.ledgerService.bulkSave(req.user.id, dto);
  }

  @Get('slot-entries')
  @Roles(Role.MILKMAN)
  async getSlotEntries(
    @Request() req,
    @Query('date') date: string,
    @Query('slot') slot: Slot,
    @Query('type') type?: LedgerType,
  ) {
    return this.ledgerService.getSlotEntries(req.user.id, date, slot, type);
  }
}

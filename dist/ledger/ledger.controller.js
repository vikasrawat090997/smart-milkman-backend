"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerController = void 0;
const common_1 = require("@nestjs/common");
const ledger_service_1 = require("./ledger.service");
const bulk_save_dto_1 = require("./dto/bulk-save.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const user_entity_1 = require("../entities/user.entity");
const daily_ledger_entity_1 = require("../entities/daily-ledger.entity");
let LedgerController = class LedgerController {
    ledgerService;
    constructor(ledgerService) {
        this.ledgerService = ledgerService;
    }
    async bulkSave(req, dto) {
        return this.ledgerService.bulkSave(req.user.id, dto);
    }
    async getSlotEntries(req, date, slot) {
        return this.ledgerService.getSlotEntries(req.user.id, date, slot);
    }
};
exports.LedgerController = LedgerController;
__decorate([
    (0, common_1.Post)('bulk-save'),
    (0, roles_decorator_1.Roles)(user_entity_1.Role.MILKMAN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, bulk_save_dto_1.BulkSaveDto]),
    __metadata("design:returntype", Promise)
], LedgerController.prototype, "bulkSave", null);
__decorate([
    (0, common_1.Get)('slot-entries'),
    (0, roles_decorator_1.Roles)(user_entity_1.Role.MILKMAN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, common_1.Query)('slot')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LedgerController.prototype, "getSlotEntries", null);
exports.LedgerController = LedgerController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('api/ledger'),
    __metadata("design:paramtypes", [ledger_service_1.LedgerService])
], LedgerController);
//# sourceMappingURL=ledger.controller.js.map
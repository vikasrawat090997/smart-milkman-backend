"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillController = void 0;
const common_1 = require("@nestjs/common");
const express = __importStar(require("express"));
const bill_service_1 = require("./bill.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const user_entity_1 = require("../entities/user.entity");
let BillController = class BillController {
    billService;
    constructor(billService) {
        this.billService = billService;
    }
    async lockMonth(req, body) {
        return this.billService.lockMonth(req.user.id, body.monthYear, body.isLocked);
    }
    async getLocks(req, queryMilkmanId) {
        const milkmanId = req.user.role === user_entity_1.Role.MILKMAN ? req.user.id : queryMilkmanId;
        if (!milkmanId) {
            throw new common_1.ForbiddenException('milkmanId is required to query billing locks');
        }
        return this.billService.getLocks(milkmanId);
    }
    async downloadBill(req, userId, res, month, queryMilkmanId, targetRole) {
        if (req.user.role !== user_entity_1.Role.MILKMAN && req.user.id !== userId) {
            throw new common_1.ForbiddenException('Unauthorized to view this billing statement');
        }
        if (!month) {
            throw new common_1.ForbiddenException('Query parameter "month" is required (Format: MM-YYYY)');
        }
        const milkmanId = req.user.role === user_entity_1.Role.MILKMAN ? req.user.id : queryMilkmanId;
        if (!milkmanId) {
            throw new common_1.ForbiddenException('Query parameter "milkmanId" is required');
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=bill_${userId}_${month}.pdf`);
        await this.billService.generateBillPdf(res, userId, milkmanId, month, req.user.role, targetRole);
    }
};
exports.BillController = BillController;
__decorate([
    (0, common_1.Post)('lock'),
    (0, roles_decorator_1.Roles)(user_entity_1.Role.MILKMAN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillController.prototype, "lockMonth", null);
__decorate([
    (0, common_1.Get)('locks'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('milkmanId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillController.prototype, "getLocks", null);
__decorate([
    (0, common_1.Get)('download/:userId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Query)('month')),
    __param(4, (0, common_1.Query)('milkmanId')),
    __param(5, (0, common_1.Query)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], BillController.prototype, "downloadBill", null);
exports.BillController = BillController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('api/bill'),
    __metadata("design:paramtypes", [bill_service_1.BillService])
], BillController);
//# sourceMappingURL=bill.controller.js.map
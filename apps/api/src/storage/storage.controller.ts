import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { StorageService } from './storage.service';
import { PresignedUploadDto, PresignedDownloadDto } from './dto';

/**
 * Section 6.1 — Storage Controller
 *
 * Provides presigned URL generation endpoints. No actual file bytes
 * pass through the API — clients upload/download directly to/from S3.
 *
 * RC-903: TenantGuard added to prevent cross-tenant file access.
 * tenantId is derived from the authenticated user's JWT, not the DTO.
 */
@ApiTags('Storage')
@Controller({ path: 'storage', version: '1' })
@UseGuards(JwtAuthGuard, TenantGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * POST /storage/presigned-upload — Get a presigned upload URL.
   * tenantId is derived from the authenticated user's JWT.
   */
  @Post('presigned-upload')
  @ApiOperation({ summary: 'Get a presigned upload URL for client-side file upload' })
  @ApiResponse({ status: 201, description: 'Presigned URL and file key returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPresignedUpload(
    @Body() dto: PresignedUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.storageService.getUploadUrl({
      tenantId: user.tenantId!, // From JWT, not DTO — prevents IDOR
      entityType: dto.entityType,
      entityId: dto.entityId,
      filename: dto.filename,
      contentType: dto.contentType,
    });
  }

  /**
   * POST /storage/presigned-download — Get a presigned download URL.
   * Validates that the file key belongs to the requesting user's tenant.
   */
  @Post('presigned-download')
  @ApiOperation({ summary: 'Get a presigned download URL for a stored file' })
  @ApiResponse({ status: 201, description: 'Presigned download URL returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPresignedDownload(
    @Body() dto: PresignedDownloadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const downloadUrl = await this.storageService.getDownloadUrl(
      dto.fileKey,
      user.tenantId!,
    );
    return { downloadUrl, fileKey: dto.fileKey };
  }

  /**
   * DELETE /storage/:fileKey — Delete a file (admin only).
   */
  @Delete(':fileKey')
  @UseGuards(RolesGuard)
  @Roles('operator_admin', 'super_admin', 'regulator')
  @ApiOperation({ summary: 'Delete a file from storage (admin only)' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  async deleteFile(
    @Param('fileKey') fileKey: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.storageService.deleteFile(
      decodeURIComponent(fileKey),
      user.tenantId!,
    );
    return { success: true };
  }
}

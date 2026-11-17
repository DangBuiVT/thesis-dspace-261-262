import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import type { JwtPayload } from "../auth/jwt.strategy";
import { ArchiveConfigService } from "./archive-config.service";
import { CreateFacultyDto } from "./dto/create-faculty.dto";
import { CreateSemesterDto } from "./dto/create-semester.dto";
import { CreateSubmissionPeriodDto } from "./dto/create-submission-period.dto";
import { PublishToDspaceDto } from "./dto/publish-to-dspace.dto";
import { UpdateFacultyDto } from "./dto/update-faculty.dto";
import { UpdateSemesterDto } from "./dto/update-semester.dto";
import { UpdateSubmissionPeriodDto } from "./dto/update-submission-period.dto";
import { DspacePublishService } from "./dspace-publish.service";
import { DspaceProvisionerService } from "./dspace-provisioner.service";
import { DspaceSyncService } from "./dspace-sync.service";
import { CreateSemesterForAllResponseDto, SemesterDetailResponseDto, SemesterResponseDto } from "./dto/semester-response.dto";

@ApiTags("Archive configuration")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Thiếu JWT hoặc token không hợp lệ/hết hạn" })
@ApiForbiddenResponse({ description: "Tài khoản không có quyền thực hiện thao tác" })
@Controller("archive-config")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ArchiveConfigController {
  constructor(
    private readonly archiveConfigService: ArchiveConfigService,
    private readonly dspaceSyncService: DspaceSyncService,
    private readonly dspacePublishService: DspacePublishService,
    private readonly dspaceProvisioner: DspaceProvisionerService
  ) {}

  @Get("faculties")
  @ApiOperation({ summary: "Danh sách khoa (lấy facultyId để tạo học kỳ)" })
  @RequirePermissions("library_intake", "configure_system", "director_approval", "view_all_submissions")
  listFaculties() {
    return this.archiveConfigService.listFaculties();
  }

  @Post("faculties")
  @RequirePermissions("library_intake", "configure_system")
  createFaculty(@Req() req: { user: JwtPayload }, @Body() body: CreateFacultyDto) {
    return this.archiveConfigService.createFaculty(req.user, body);
  }

  @Get("faculties/:facultyId")
  @RequirePermissions("library_intake", "configure_system", "director_approval", "view_all_submissions")
  getFaculty(@Param("facultyId") facultyId: string) {
    return this.archiveConfigService.getFacultyDetail(facultyId);
  }

  @Patch("faculties/:facultyId")
  @RequirePermissions("library_intake", "configure_system")
  updateFaculty(@Param("facultyId") facultyId: string, @Body() body: UpdateFacultyDto) {
    return this.archiveConfigService.updateFaculty(facultyId, body);
  }

  @Delete("faculties/:facultyId")
  @RequirePermissions("library_intake", "configure_system")
  deleteFaculty(@Param("facultyId") facultyId: string) {
    return this.archiveConfigService.deleteFaculty(facultyId);
  }

  @Post("faculties/:facultyId/provision-dspace")
  @RequirePermissions("library_intake", "configure_system")
  provisionFaculty(@Param("facultyId") facultyId: string) {
    return this.archiveConfigService.provisionFacultyDspace(facultyId);
  }

  @Post("dspace/sync-from-root")
  @RequirePermissions("library_intake", "configure_system")
  syncFromRoot() {
    return this.dspaceSyncService.syncFromRootCommunity();
  }

  @Get("dspace/diagnose")
  @RequirePermissions("library_intake", "configure_system")
  diagnoseDspace() {
    return this.dspaceProvisioner.diagnoseConnection();
  }

  @Get("dspace/sync-nodes")
  @RequirePermissions("library_intake", "configure_system", "director_approval", "view_all_submissions")
  listSyncedDspaceNodes() {
    return this.dspaceSyncService.listSyncedNodes();
  }

  @Get("dspace/publish-queue")
  @RequirePermissions("library_intake", "configure_system")
  listPublishQueue(
    @Query("facultyId") facultyId?: string,
    @Query("semesterId") semesterId?: string,
    @Query("periodId") periodId?: string,
    @Query("dspaceStatus") dspaceStatus?: string
  ) {
    return this.dspacePublishService.listPublishQueue({ facultyId, semesterId, periodId, dspaceStatus });
  }

  @Post("dspace/publish")
  @RequirePermissions("library_intake", "configure_system")
  publishToDspace(@Body() body: PublishToDspaceDto) {
    return this.dspacePublishService.publishSubmissionsToCollection({
      submissionIds: body.submissionIds,
      collectionId: body.collectionId
    });
  }

  @Get("faculties/:facultyId/semesters")
  @ApiOperation({ summary: "Danh sách học kỳ của một khoa" })
  @ApiParam({ name: "facultyId", format: "uuid" })
  @ApiOkResponse({ type: [SemesterResponseDto] })
  @ApiBadRequestResponse({ description: "facultyId không phải UUID hợp lệ" })
  @ApiNotFoundResponse({ description: "Không tìm thấy khoa" })
  @RequirePermissions("library_intake", "configure_system", "director_approval", "view_all_submissions")
  listSemesters(@Param("facultyId", ParseUUIDPipe) facultyId: string) {
    return this.archiveConfigService.listSemesters(facultyId);
  }

  @Post("faculties/:facultyId/semesters")
  @ApiOperation({ summary: "Thêm học kỳ cho một khoa", description: "Yêu cầu quyền library_intake hoặc configure_system. Khoa phải đang hoạt động; tên học kỳ không được trùng trong cùng khoa (không phân biệt hoa/thường)." })
  @ApiParam({ name: "facultyId", format: "uuid" })
  @ApiCreatedResponse({ type: SemesterResponseDto })
  @ApiBadRequestResponse({ description: "Tên học kỳ hoặc facultyId không hợp lệ, hoặc khoa đã ngừng hoạt động" })
  @ApiNotFoundResponse({ description: "Không tìm thấy khoa" })
  @ApiConflictResponse({ description: "Tên học kỳ đã tồn tại trong khoa" })
  @RequirePermissions("library_intake", "configure_system")
  createSemester(
    @Req() req: { user: JwtPayload },
    @Param("facultyId", ParseUUIDPipe) facultyId: string,
    @Body() body: CreateSemesterDto
  ) {
    return this.archiveConfigService.createSemester(req.user, facultyId, body);
  }

  @Post("semesters/for-all-faculties")
  @ApiOperation({ summary: "Thêm học kỳ cho tất cả khoa đang hoạt động", description: "Yêu cầu quyền library_intake hoặc configure_system. Bỏ qua khoa đã có học kỳ cùng tên (không phân biệt hoa/thường). Không có khoa đang hoạt động thì trả về createdCount = 0 và skippedCount = 0." })
  @ApiCreatedResponse({ type: CreateSemesterForAllResponseDto })
  @ApiBadRequestResponse({ description: "Tên học kỳ không hợp lệ" })
  @RequirePermissions("library_intake", "configure_system")
  createSemesterForAllFaculties(@Req() req: { user: JwtPayload }, @Body() body: CreateSemesterDto) {
    return this.archiveConfigService.createSemesterForAllFaculties(req.user, body);
  }

  @Get("semesters/:semesterId")
  @ApiOperation({ summary: "Chi tiết học kỳ" })
  @ApiParam({ name: "semesterId", format: "uuid" })
  @ApiOkResponse({ type: SemesterDetailResponseDto })
  @ApiBadRequestResponse({ description: "semesterId không phải UUID hợp lệ" })
  @ApiNotFoundResponse({ description: "Không tìm thấy học kỳ" })
  @RequirePermissions("library_intake", "configure_system", "director_approval", "view_all_submissions")
  getSemester(@Param("semesterId", ParseUUIDPipe) semesterId: string) {
    return this.archiveConfigService.getSemesterDetail(semesterId);
  }

  @Patch("semesters/:semesterId")
  @ApiOperation({ summary: "Cập nhật tên hoặc trạng thái học kỳ" })
  @ApiParam({ name: "semesterId", format: "uuid" })
  @ApiOkResponse({ type: SemesterDetailResponseDto })
  @ApiBadRequestResponse({ description: "Dữ liệu cập nhật hoặc semesterId không hợp lệ" })
  @ApiNotFoundResponse({ description: "Không tìm thấy học kỳ" })
  @RequirePermissions("library_intake", "configure_system")
  updateSemester(@Param("semesterId", ParseUUIDPipe) semesterId: string, @Body() body: UpdateSemesterDto) {
    return this.archiveConfigService.updateSemester(semesterId, body);
  }

  @Delete("semesters/:semesterId")
  @ApiOperation({ summary: "Xóa học kỳ và các đợt nộp thuộc học kỳ" })
  @ApiParam({ name: "semesterId", format: "uuid" })
  @ApiOkResponse({ schema: { type: "object", required: ["deleted", "id"], properties: { deleted: { type: "boolean", example: true }, id: { type: "string", format: "uuid" } } } })
  @ApiBadRequestResponse({ description: "semesterId không phải UUID hợp lệ" })
  @ApiNotFoundResponse({ description: "Không tìm thấy học kỳ" })
  @RequirePermissions("library_intake", "configure_system")
  deleteSemester(@Param("semesterId", ParseUUIDPipe) semesterId: string) {
    return this.archiveConfigService.deleteSemester(semesterId);
  }

  @Get("faculties/:facultyId/submission-periods")
  @RequirePermissions("library_intake", "configure_system", "director_approval", "view_all_submissions")
  listSubmissionPeriods(@Param("facultyId") facultyId: string) {
    return this.archiveConfigService.listSubmissionPeriods(facultyId);
  }

  @Post("faculties/:facultyId/submission-periods")
  @RequirePermissions("library_intake", "configure_system")
  createSubmissionPeriod(
    @Req() req: { user: JwtPayload },
    @Param("facultyId") facultyId: string,
    @Body() body: CreateSubmissionPeriodDto
  ) {
    return this.archiveConfigService.createSubmissionPeriod(req.user, facultyId, body);
  }

  @Get("submission-periods/:periodId")
  @RequirePermissions("library_intake", "configure_system", "director_approval", "view_all_submissions")
  getPeriod(@Param("periodId") periodId: string) {
    return this.archiveConfigService.getPeriodDetail(periodId);
  }

  @Patch("submission-periods/:periodId")
  @RequirePermissions("library_intake", "configure_system")
  updatePeriod(@Param("periodId") periodId: string, @Body() body: UpdateSubmissionPeriodDto) {
    return this.archiveConfigService.updateSubmissionPeriod(periodId, body);
  }

  @Delete("submission-periods/:periodId")
  @RequirePermissions("library_intake", "configure_system")
  deletePeriod(@Param("periodId") periodId: string) {
    return this.archiveConfigService.deleteSubmissionPeriod(periodId);
  }

  @Post("submission-periods/:periodId/open")
  @RequirePermissions("library_intake", "configure_system")
  openPeriod(@Param("periodId") periodId: string) {
    return this.archiveConfigService.openSubmissionPeriod(periodId);
  }

  @Post("submission-periods/:periodId/close")
  @RequirePermissions("library_intake", "configure_system")
  closePeriod(@Param("periodId") periodId: string) {
    return this.archiveConfigService.closeSubmissionPeriod(periodId);
  }
}

import { ApiBearerAuth } from "@nestjs/swagger";
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { SubmissionPeriodsService } from "./submission-periods.service";

@ApiBearerAuth()
@Controller("archive")
export class ArchiveController {
  constructor(private readonly submissionPeriodsService: SubmissionPeriodsService) {}

  @Get("faculties")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("submit_thesis", "configure_system")
  listFaculties() {
    return this.submissionPeriodsService.listFacultiesWithOpenPeriods();
  }

  @Get("faculties/:facultyId/semesters")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("submit_thesis", "configure_system")
  listSemesters(@Param("facultyId") facultyId: string) {
    return this.submissionPeriodsService.listSemestersWithOpenPeriods(facultyId);
  }

  @Get("submission-periods")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("submit_thesis", "configure_system")
  listOpenPeriods(@Query("facultyId") facultyId: string, @Query("semesterId") semesterId: string) {
    if (!facultyId || !semesterId) {
      return [];
    }
    return this.submissionPeriodsService.listOpenPeriods(facultyId, semesterId);
  }

  // ── Admin: mọi khoa/học kỳ/đợt, kể cả đợt đã đóng hoặc ẩn (để nộp thay sinh viên) ──

  @Get("admin/faculties")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  listAllFaculties() {
    return this.submissionPeriodsService.listAllFacultiesForAdmin();
  }

  @Get("admin/faculties/:facultyId/semesters")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  listAllSemesters(@Param("facultyId", ParseUUIDPipe) facultyId: string) {
    return this.submissionPeriodsService.listAllSemestersForAdmin(facultyId);
  }

  @Get("admin/submission-periods")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  listAllPeriods(@Query("facultyId") facultyId: string, @Query("semesterId") semesterId: string) {
    if (!facultyId || !semesterId) {
      return [];
    }
    return this.submissionPeriodsService.listAllPeriodsForAdmin(facultyId, semesterId);
  }
}

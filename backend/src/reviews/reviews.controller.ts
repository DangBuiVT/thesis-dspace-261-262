import { ApiBearerAuth } from "@nestjs/swagger";
import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import type { JwtPayload } from "../auth/jwt.strategy";
import { ReviewActionDto } from "./dto/review-action.dto";
import { ReviewsService } from "./reviews.service";

@ApiBearerAuth()
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("my-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("review_academic")
  myQueue(@Req() req: { user: JwtPayload }) {
    return this.reviewsService.getMyQueue(req.user);
  }

  @Post("action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("review_academic")
  act(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    return this.reviewsService.act(req.user, body);
  }

  @Get("library-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("library_intake")
  libraryQueue(@Req() req: { user: JwtPayload }) {
    return this.reviewsService.getLibraryQueue(req.user);
  }

  @Post("library-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("library_intake")
  libraryAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    return this.reviewsService.libraryAct(req.user, body);
  }

  @Get("director-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("director_approval")
  directorQueue(@Req() req: { user: JwtPayload }) {
    return this.reviewsService.getDirectorQueue(req.user);
  }

  @Post("director-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("director_approval")
  directorAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    return this.reviewsService.directorAct(req.user, body);
  }

  @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    return this.reviewsService.getAdminIntakeQueue(req.user);
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    return this.reviewsService.adminIntakeAct(req.user, body);
  }

  @Get("legacy-batch-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  legacyBatchQueue(@Req() req: { user: JwtPayload }) {
    return this.reviewsService.getLegacyBatchSubmissions(req.user);
  }

  @Post("batch-sign-legacy")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  batchSignLegacy(
    @Req() req: { user: JwtPayload },
    @Body() body: { submissionIds: string[]; signatureStyle?: any; watermarkPages?: string }
  ) {
    return this.reviewsService.batchSignLegacy(req.user, body);
  }
}

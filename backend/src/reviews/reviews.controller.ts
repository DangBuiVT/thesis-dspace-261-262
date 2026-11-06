import { Body, Controller, Get, Post, Req, UseGuards   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
 from "@nestjs/common";
import { JwtAuthGuard   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
 from "../auth/jwt-auth.guard";
import { PermissionsGuard   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
 from "../auth/permissions.guard";
import { RequirePermissions   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
 from "../auth/permissions.decorator";
import type { JwtPayload   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
 from "../auth/jwt.strategy";
import { ReviewActionDto   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
 from "./dto/review-action.dto";
import { ReviewsService   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
 from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {  @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }


  @Get("my-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("review_academic")
  myQueue(@Req() req: { user: JwtPayload   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
) {
    return this.reviewsService.getMyQueue(req.user);
    @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }


  @Post("action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("review_academic")
  act(@Req() req: { user: JwtPayload   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
, @Body() body: ReviewActionDto) {
    return this.reviewsService.act(req.user, body);
    @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }


  @Get("library-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("library_intake")
  libraryQueue(@Req() req: { user: JwtPayload   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
) {
    return this.reviewsService.getLibraryQueue(req.user);
    @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }


  @Post("library-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("library_intake")
  libraryAct(@Req() req: { user: JwtPayload   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
, @Body() body: ReviewActionDto) {
    return this.reviewsService.libraryAct(req.user, body);
    @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }


  @Get("director-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("director_approval")
  directorQueue(@Req() req: { user: JwtPayload   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
) {
    return this.reviewsService.getDirectorQueue(req.user);
    @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }


  @Post("director-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("director_approval")
  directorAct(@Req() req: { user: JwtPayload   @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }
, @Body() body: ReviewActionDto) {
    return this.reviewsService.directorAct(req.user, body);
    @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }

  @Get("admin-intake-queue")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeQueue(@Req() req: { user: JwtPayload }) {
    // Return combined queues for reviewer, library, and director approvals
    return this.reviewsService.getAdminIntakeQueue();
  }

  @Post("admin-intake-action")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("configure_system")
  adminIntakeAct(@Req() req: { user: JwtPayload }, @Body() body: ReviewActionDto) {
    // Admin can act on any stage; the service determines the appropriate role flow
    return this.reviewsService.adminIntakeAct(req.user, body);
  }


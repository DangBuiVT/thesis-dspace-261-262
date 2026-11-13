import { Module } from "@nestjs/common";
import { ArchiveModule } from "../archive/archive.module";
import { AuthModule } from "../auth/auth.module";
import { PermissionsGuard } from "../auth/permissions.guard";
import { MailModule } from "../mail/mail.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";
import { PdfStampingService } from "./pdf-stamping.service";

@Module({
  imports: [AuthModule, ArchiveModule, MailModule, WorkflowModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, PdfStampingService, PermissionsGuard]
})
export class ReviewsModule {}

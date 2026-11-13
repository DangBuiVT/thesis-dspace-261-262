import { Global, Module } from "@nestjs/common";
import { PdfStampingService } from "../reviews/pdf-stamping.service";
import { ArchiveSigningService } from "./archive-signing.service";
import { PadesSigner } from "./pades-signer.service";
import { PkiService } from "./pki.service";
import { TsaClient } from "./tsa.client";

@Global()
@Module({
  providers: [PkiService, TsaClient, PadesSigner, PdfStampingService, ArchiveSigningService],
  exports: [ArchiveSigningService, PadesSigner, PdfStampingService],
})
export class SigningModule {}

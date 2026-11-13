import { Global, Module } from "@nestjs/common";
import { PdfStampingService } from "../reviews/pdf-stamping.service";
import { ArchiveSigningService } from "./archive-signing.service";
import { PadesSigner } from "./pades-signer.service";
import { PkiService } from "./pki.service";
import { SignatureVerifierService } from "./signature-verifier.service";
import { SignaturesController } from "./signatures.controller";
import { TsaClient } from "./tsa.client";

@Global()
@Module({
  controllers: [SignaturesController],
  providers: [PkiService, TsaClient, PadesSigner, PdfStampingService, ArchiveSigningService, SignatureVerifierService],
  exports: [ArchiveSigningService, PadesSigner, PdfStampingService, SignatureVerifierService],
})
export class SigningModule {}

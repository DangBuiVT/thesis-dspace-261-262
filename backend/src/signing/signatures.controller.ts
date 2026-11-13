import {
  BadRequestException,
  Controller,
  Get,
  Header,
  NotFoundException,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { PkiService, pemToDer } from "./pki.service";
import { SignatureVerifierService } from "./signature-verifier.service";

const VERIFY_MAX_BYTES = 200 * 1024 * 1024;

/**
 * API công khai (không cần đăng nhập) để bất kỳ ai cũng kiểm tra được chữ ký số
 * trên PDF lưu chiểu, và tải chứng thư Root CA của hệ thống.
 */
@ApiTags("signatures")
@Controller("signatures")
export class SignaturesController {
  constructor(
    private readonly verifier: SignatureVerifierService,
    private readonly pki: PkiService
  ) {}

  @Post("verify")
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: VERIFY_MAX_BYTES, files: 1 },
    })
  )
  async verify(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException("Chưa chọn file PDF");
    if (file.buffer.subarray(0, 1024).indexOf("%PDF-") < 0) {
      throw new BadRequestException("File không phải PDF");
    }
    const name = Buffer.from(file.originalname, "latin1").toString("utf8");
    return this.verifier.verify(new Uint8Array(file.buffer), name);
  }

  /** Root CA của hệ thống (PEM) — để cài vào Windows / Adobe / Stirling nếu muốn kiểm tra ngoài hệ thống. */
  @Get("trust-anchor.pem")
  @Header("Content-Type", "application/x-pem-file")
  @Header("Content-Disposition", 'attachment; filename="ca-cert.pem"')
  trustAnchorPem() {
    const pem = this.pki.trustAnchorPem();
    if (!pem) throw new NotFoundException("Chưa cấu hình Root CA");
    return pem;
  }

  /** Root CA dạng DER (.crt) — nhấp đúp để cài trên Windows. */
  @Get("trust-anchor.crt")
  @Header("Content-Type", "application/pkix-cert")
  @Header("Content-Disposition", 'attachment; filename="ca-cert.crt"')
  trustAnchorDer() {
    const pem = this.pki.trustAnchorPem();
    if (!pem) throw new NotFoundException("Chưa cấu hình Root CA");
    return new StreamableFile(Buffer.from(pemToDer(pem, "CERTIFICATE")));
  }
}

import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("Thesis Portal API")
    .setDescription(
      "Đăng nhập tại POST /auth/login, sao chép access_token và nhập vào Authorize để thử API. " +
      "Tạo học kỳ yêu cầu quyền library_intake hoặc configure_system."
    )
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs-json",
    swaggerOptions: { tagsSorter: "alpha" }
  });
  return document;
}

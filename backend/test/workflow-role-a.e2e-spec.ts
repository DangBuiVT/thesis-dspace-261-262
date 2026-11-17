import {
  ADMIN,
  DIRECTOR1,
  LIBRARY1,
  REVIEWER1,
  closeApi,
  createUser,
  deleteSubmission,
  ensureOpenPeriod,
  http,
  initApi,
  login,
  submitThesis,
  type TestUser,
} from "./helpers";

describe("Workflow Role A Extensions: Metadata Editing, Return to Editor & Scoped RBAC", () => {
  let periodId = "";
  let adminToken = "";
  let libraryToken = "";
  let directorToken = "";
  let reviewerToken = "";
  const createdIds: string[] = [];

  beforeAll(async () => {
    await initApi();
    periodId = (await ensureOpenPeriod()).periodId;
    adminToken = (await login(ADMIN.username, ADMIN.password)).token;
    libraryToken = (await login(LIBRARY1.username, LIBRARY1.password)).token;
    directorToken = (await login(DIRECTOR1.username, DIRECTOR1.password)).token;
    reviewerToken = (await login(REVIEWER1.username, REVIEWER1.password)).token;
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await deleteSubmission(libraryToken, id);
    }
    await closeApi();
  });

  async function freshSubmission(reviewerIds = [REVIEWER1.id]) {
    const student = await createUser("student");
    const response = await submitThesis(student.token, periodId, student.id, reviewerIds);
    expect(response.status).toBe(201);
    createdIds.push(response.body.id);
    return { student, id: response.body.id as string };
  }

  describe("1. Metadata Editing Permissions (PATCH /submissions/:id/metadata)", () => {
    it("TC-META-001: Denies Reviewer from editing Dublin Core metadata (403 Forbidden)", async () => {
      const { id } = await freshSubmission();
      const res = await http()
        .patch(`/submissions/${id}/metadata`)
        .set("Authorization", `Bearer ${reviewerToken}`)
        .send({
          titleVi: "Tên luận văn mới",
          keywords: "AI, Blockchain",
        });

      expect(res.status).toBe(403);
    });

    it("TC-META-002: Allows Library Staff (Editor) to update metadata and logs audit event", async () => {
      const { id } = await freshSubmission();
      const updatePayload = {
        titleVi: "Tên Luận Văn Tiếng Việt Chuẩn Hóa",
        titleEn: "Standardized English Thesis Title",
        abstract: "Tóm tắt luận văn đã được biên tập bởi Cán bộ thư viện.",
        keywords: "NestJS, DSpace, Dublin Core",
        major: "Khoa học Máy tính",
        thesisYear: "2026",
      };

      const res = await http()
        .patch(`/submissions/${id}/metadata`)
        .set("Authorization", `Bearer ${libraryToken}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // Verify Audit Trail History
      const historyRes = await http()
        .get(`/submissions/${id}/history`)
        .set("Authorization", `Bearer ${libraryToken}`);

      expect(historyRes.status).toBe(200);
      const metadataEvent = historyRes.body.find(
        (ev: { eventType: string }) => ev.eventType === "metadata_updated"
      );
      expect(metadataEvent).toBeDefined();
      expect(metadataEvent.role).toBe("library_staff");
      expect(metadataEvent.payload.updatedFields.titleVi).toBe(updatePayload.titleVi);
    });

    it("TC-META-003: Allows Director (Final Editor) to edit metadata prior to archiving", async () => {
      const { id } = await freshSubmission();

      // Reviewer approves -> moves to library queue
      await http()
        .post("/reviews/action")
        .set("Authorization", `Bearer ${reviewerToken}`)
        .send({ submissionId: id, action: "approve" });

      // Library staff approves -> moves to director queue
      await http()
        .post("/reviews/library-action")
        .set("Authorization", `Bearer ${libraryToken}`)
        .send({ submissionId: id, action: "approve" });

      // Director edits metadata
      const res = await http()
        .patch(`/submissions/${id}/metadata`)
        .set("Authorization", `Bearer ${directorToken}`)
        .send({
          titleVi: "Tên Luận Văn Đã Được Giám Đốc Hiệu Đính",
          keywords: "Final, Approved, HCMUT",
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe("2. Return to Editor Flow (Director Bước 3 -> Bước 2)", () => {
    it("TC-RET-001: Requires comment when Director returns submission to Library Editor", async () => {
      const { id } = await freshSubmission();

      // Reviewer approves
      await http()
        .post("/reviews/action")
        .set("Authorization", `Bearer ${reviewerToken}`)
        .send({ submissionId: id, action: "approve" });

      // Library staff approves
      await http()
        .post("/reviews/library-action")
        .set("Authorization", `Bearer ${libraryToken}`)
        .send({ submissionId: id, action: "approve" });

      // Director attempts return_to_editor without comment
      const res = await http()
        .post("/reviews/director-action")
        .set("Authorization", `Bearer ${directorToken}`)
        .send({ submissionId: id, action: "return_to_editor", comment: "" });

      expect(res.status).toBe(400);
    });

    it("TC-RET-002: Successfully returns submission to Library Queue with audit log and without rejecting to Student", async () => {
      const { id } = await freshSubmission();

      // Reviewer approves
      await http()
        .post("/reviews/action")
        .set("Authorization", `Bearer ${reviewerToken}`)
        .send({ submissionId: id, action: "approve" });

      // Library staff approves
      await http()
        .post("/reviews/library-action")
        .set("Authorization", `Bearer ${libraryToken}`)
        .send({ submissionId: id, action: "approve" });

      // Director returns to editor with detailed reason
      const returnComment = "Cần chỉnh sửa lại tóm tắt tiếng Anh và chuẩn hóa từ khóa";
      const res = await http()
        .post("/reviews/director-action")
        .set("Authorization", `Bearer ${directorToken}`)
        .send({
          submissionId: id,
          action: "return_to_editor",
          comment: returnComment,
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);

      // Verify submission is back in Library Queue
      const libQueue = await http()
        .get("/reviews/library-queue")
        .set("Authorization", `Bearer ${libraryToken}`);

      const foundInQueue = libQueue.body.some((item: { id: string }) => item.id === id);
      expect(foundInQueue).toBe(true);

      // Verify Audit Trail has director_returned event
      const historyRes = await http()
        .get(`/submissions/${id}/history`)
        .set("Authorization", `Bearer ${libraryToken}`);

      const returnEvent = historyRes.body.find(
        (ev: { eventType: string }) => ev.eventType === "director_returned"
      );
      expect(returnEvent).toBeDefined();
      expect(returnEvent.comment).toBe(returnComment);
    });
  });

  describe("3. Collection/Faculty Scoped RBAC Validation", () => {
    it("TC-SCOPE-001: Reviewer cannot access or act on submissions outside their faculty", async () => {
      const { id } = await freshSubmission();

      // Create a reviewer belonging to another faculty
      const foreignReviewer = await createUser("reviewer");

      // Attempt to access my-queue or act
      const actRes = await http()
        .post("/reviews/action")
        .set("Authorization", `Bearer ${foreignReviewer.token}`)
        .send({ submissionId: id, action: "approve" });

      // Should be forbidden or rejected due to assignment/faculty scope
      expect([400, 403, 404]).toContain(actRes.status);
    });
  });
});


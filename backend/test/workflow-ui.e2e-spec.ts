import {
  closeApi, createUser, deleteSubmission, ensureOpenPeriod, http, initApi, login,
  studentSubmissions, submitThesis, type TestUser
} from "./helpers";

describe("Editor workspace and return workflow", () => {
  let periodId: string;
  let library: string;
  let director: string;
  let reviewer: string;
  const ids: string[] = [];
  beforeAll(async () => {
    await initApi();
    periodId = (await ensureOpenPeriod()).periodId;
    library = (await login("library1", "library123")).token;
    director = (await login("director1", "director123")).token;
    reviewer = (await login("reviewer1", "review123")).token;
  });
  afterAll(async () => {
    for (const id of ids) await deleteSubmission(library, id);
    await closeApi();
  });
  async function fresh(atEditor = true) {
    const student = await createUser("student");
    const created = await submitThesis(student.token, periodId, student.id, ["reviewer1"]);
    expect(created.status).toBe(201);
    const id = created.body.id as string;
    ids.push(id);
    if (atEditor) expect((await action("action", reviewer, id, "approve")).status).toBe(201);
    return { id, student };
  }
  function action(endpoint: string, token: string, id: string, action: string, comment?: string) {
    return http().post(`/reviews/${endpoint}`).set("Authorization", `Bearer ${token}`)
      .send({ submissionId: id, action, comment });
  }
  function patch(id: string, body: object, token = library) {
    return http().patch(`/submissions/${id}/metadata`).set("Authorization", `Bearer ${token}`).send(body);
  }
  function history(id: string, token: string) {
    return http().get(`/submissions/${id}/history`).set("Authorization", `Bearer ${token}`);
  }
  async function row(student: TestUser, id: string) {
    return (await studentSubmissions(student.token, student.id)).body.find((item: { id: string }) => item.id === id);
  }

  it("persists partial metadata, synchronizes title, and preserves the separate description", async () => {
    const { id, student } = await fresh();
    const before = await row(student, id);
    const edited = await patch(id, { titleEn: "Corrected English title", abstract: "Corrected abstract", keywords: "archives, metadata", description: null });
    expect(edited.status).toBe(200);
    const after = await row(student, id);
    expect(after.title).toBe("Corrected English title");
    expect(after.title_en).toBe(after.title);
    expect(after.abstract).toBe("Corrected abstract");
    expect(after.keywords).toBe("archives, metadata");
    expect(after.description).toBe(before.description);
    expect(after.title_vi).toBe(before.title_vi);
    const events = await history(id, student.token);
    expect(events.status).toBe(200);
    const change = events.body.find((event: { eventType: string }) => event.eventType === "metadata_updated");
    expect(change.actorRole).toBe("library_staff");
    expect(change.actorName).toBeTruthy();
    expect(change.payload.changes).toContainEqual({ field: "abstract", before: before.abstract, after: "Corrected abstract" });
  });

  it("rejects editing before Editor and after forwarding to Final Editor", async () => {
    const { id } = await fresh(false);
    expect((await patch(id, { abstract: "Premature change" })).status).toBe(400);
    await action("action", reviewer, id, "approve");
    await action("library-action", library, id, "approve");
    expect((await patch(id, { abstract: "Late change" })).status).toBe(400);
  });

  it("rejects invalid metadata and preserves stored values", async () => {
    const { id, student } = await fresh();
    const before = await row(student, id);
    expect((await patch(id, { titleEn: " " })).status).toBe(400);
    expect((await patch(id, { thesisYear: "20xx" })).status).toBe(400);
    expect((await row(student, id)).title).toBe(before.title);
  });

  it("does not fabricate a metadata event for a no-op", async () => {
    const { id } = await fresh();
    expect((await patch(id, {})).body.changes).toEqual([]);
    expect((await history(id, library)).body.filter((event: { eventType: string }) => event.eventType === "metadata_updated")).toHaveLength(0);
  });

  it("denies metadata changes from students and reviewers", async () => {
    const { id, student } = await fresh();
    expect((await patch(id, { abstract: "Changed" }, student.token)).status).toBe(403);
    expect((await patch(id, { abstract: "Changed" }, reviewer)).status).toBe(403);
  });

  it("protects history from unrelated students and reviewers", async () => {
    const { id, student } = await fresh();
    const stranger = await createUser("student");
    const unrelated = await createUser("reviewer");
    expect((await history(id, stranger.token)).status).toBe(403);
    expect((await history(id, unrelated.token)).status).toBe(403);
    expect((await history(id, student.token)).status).toBe(200);
    expect((await history(id, reviewer)).status).toBe(200);
    expect((await http().get(`/submissions/${id}/history`)).status).toBe(401);
  });

  it("returns to Editor, preserves academic approval/files, then forwards and archives", async () => {
    const { id, student } = await fresh();
    await action("library-action", library, id, "approve");
    const before = await row(student, id);
    const returned = await action("director-action", director, id, "return_to_editor", "Please normalize the keywords");
    expect(returned.status).toBe(201);
    const after = await row(student, id);
    expect(after.status).toBe("reviewing");
    expect(after.current_step_role).toBe("library_staff");
    expect(after.reviews[0].decision).toBe("approved");
    expect(after.files).toEqual(before.files);
    const queue = await http().get("/reviews/library-queue").set("Authorization", `Bearer ${library}`);
    expect(queue.body.some((item: { id: string }) => item.id === id)).toBe(true);
    const directorQueue = await http().get("/reviews/director-queue").set("Authorization", `Bearer ${director}`);
    expect(directorQueue.body.some((item: { id: string }) => item.id === id)).toBe(false);
    const event = (await history(id, library)).body.find((item: { eventType: string }) => item.eventType === "director_returned");
    expect(event.payload.comment).toBe("Please normalize the keywords");
    expect((await patch(id, { keywords: "normalized" })).status).toBe(200);
    expect((await action("library-action", library, id, "approve")).status).toBe(201);
    const archived = await action("director-action", director, id, "archive");
    expect(archived.status).toBe(201);
    expect(archived.body.dspaceDeferred).toBe(true);
    expect((await row(student, id)).status).toBe("archived");
    expect((await patch(id, { abstract: "Locked" })).status).toBe(400);
  });

  it("requires a return reason and disallows director rejection", async () => {
    const { id, student } = await fresh();
    await action("library-action", library, id, "approve");
    expect((await action("director-action", director, id, "return_to_editor", "  ")).status).toBe(400);
    expect((await action("director-action", director, id, "reject", "Do not reject")).status).toBe(400);
    expect((await row(student, id)).status).toBe("approved");
  });

  it("blocks return actions at earlier stages and a stale duplicate return", async () => {
    const { id } = await fresh(false);
    expect((await action("action", reviewer, id, "return_to_editor", "Invalid")).status).toBe(400);
    await action("action", reviewer, id, "approve");
    expect((await action("library-action", library, id, "return_to_editor", "Invalid")).status).toBe(400);
    await action("library-action", library, id, "approve");
    const results = await Promise.all([
      action("director-action", director, id, "return_to_editor", "First"),
      action("director-action", director, id, "return_to_editor", "Second")
    ]);
    expect(results.map(result => result.status).sort()).toEqual([201, 400]);
    const events = (await history(id, library)).body.filter((event: { eventType: string }) => event.eventType === "director_returned");
    expect(events).toHaveLength(1);
  });
});

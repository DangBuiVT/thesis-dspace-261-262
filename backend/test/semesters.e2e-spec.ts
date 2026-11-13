import { randomUUID } from "crypto";
import { closeApi, http, initApi, login } from "./helpers";

describe("Semester API and Swagger", () => {
  let admin: string;
  let library: string;
  let student: string;
  let facultyId: string;
  let inactiveFacultyId: string;
  const semesterIds = new Set<string>();
  const semesterName = `Semester ${randomUUID()}`;
  const base = "/archive-config";
  const semestersPath = () => `${base}/faculties/${facultyId}/semesters`;

  beforeAll(async () => {
    await initApi();
    admin = (await login("admin1", "admin123")).token;
    library = (await login("library1", "library123")).token;
    student = (await login("student1", "student123")).token;
    for (const active of [true, false]) {
      const created = await http().post(`${base}/faculties`)
        .set("Authorization", `Bearer ${admin}`)
        .send({ name: `Semester test ${randomUUID()}` });
      expect(created.status).toBe(201);
      if (active) {
        facultyId = created.body.id;
      } else {
        inactiveFacultyId = created.body.id;
        const updated = await http().patch(`${base}/faculties/${inactiveFacultyId}`)
          .set("Authorization", `Bearer ${admin}`).send({ status: "inactive" });
        expect(updated.status).toBe(200);
      }
    }
  });

  afterAll(async () => {
    for (const id of semesterIds) {
      await http().delete(`${base}/semesters/${id}`).set("Authorization", `Bearer ${admin}`);
    }
    for (const id of [facultyId, inactiveFacultyId].filter(Boolean)) {
      await http().delete(`${base}/faculties/${id}`).set("Authorization", `Bearer ${admin}`);
    }
    await closeApi();
  });

  it("serves Swagger UI and documents authentication, request and response schemas", async () => {
    const ui = await http().get("/docs/");
    expect(ui.status).toBe(200);
    expect(ui.text).toContain("swagger-ui");
    expect((await http().get("/docs/swagger-ui-init.js")).status).toBe(200);
    const response = await http().get("/docs-json");
    expect(response.status).toBe(200);
    const { paths, components } = response.body;
    const create = paths[`${base}/faculties/{facultyId}/semesters`].post;
    expect(create.security).toContainEqual({ bearer: [] });
    expect(create.requestBody.content["application/json"].schema.$ref).toBe("#/components/schemas/CreateSemesterDto");
    expect(create.responses["201"].content["application/json"].schema.$ref).toBe("#/components/schemas/SemesterResponseDto");
    expect(Object.keys(create.responses)).toEqual(expect.arrayContaining(["400", "401", "403", "404", "409"]));
    expect(components.schemas.CreateSemesterDto.required).toContain("name");
    expect(components.schemas.CreateSemesterDto.properties.name.example).toBeTruthy();
    expect(components.schemas.LoginDto.required).toEqual(expect.arrayContaining(["username", "password"]));
    expect(components.securitySchemes.bearer).toMatchObject({ type: "http", scheme: "bearer" });
    expect(paths[`${base}/semesters/for-all-faculties`].post.responses["201"]).toBeDefined();
  });

  it("requires authentication and a semester management permission for both creation APIs", async () => {
    for (const path of [semestersPath(), `${base}/semesters/for-all-faculties`]) {
      expect((await http().post(path).send({ name: semesterName })).status).toBe(401);
      expect((await http().post(path).set("Authorization", `Bearer ${student}`)
        .send({ name: semesterName })).status).toBe(403);
    }
  });

  it("creates a semester with a trimmed name and persists it in the faculty list", async () => {
    const response = await http().post(semestersPath()).set("Authorization", `Bearer ${library}`)
      .send({ name: `  ${semesterName}  ` });
    expect(response.status).toBe(201);
    semesterIds.add(response.body.id);
    expect(response.body).toMatchObject({ facultyId, name: semesterName, status: "active", periodCount: 0 });
    const list = await http().get(semestersPath()).set("Authorization", `Bearer ${admin}`);
    expect(list.status).toBe(200);
    expect(list.body).toContainEqual(expect.objectContaining({ id: response.body.id, name: semesterName }));
  });

  it("rejects a duplicate semester regardless of letter case and surrounding spaces", async () => {
    const response = await http().post(semestersPath()).set("Authorization", `Bearer ${admin}`)
      .send({ name: ` ${semesterName.toUpperCase()} ` });
    expect(response.status).toBe(409);
  });

  it("rejects missing, blank, short, and non-string names on both creation APIs", async () => {
    for (const path of [semestersPath(), `${base}/semesters/for-all-faculties`]) {
      for (const body of [{}, { name: "   " }, { name: " a " }, { name: 261 }, { name: null }]) {
        const response = await http().post(path).set("Authorization", `Bearer ${admin}`).send(body);
        expect(response.status).toBe(400);
      }
    }
  });

  it("returns 400 for malformed faculty IDs, 404 for unknown faculties, and 400 for inactive faculties", async () => {
    for (const [id, status] of [["invalid-id", 400], [randomUUID(), 404], [inactiveFacultyId, 400]] as const) {
      const response = await http().post(`${base}/faculties/${id}/semesters`)
        .set("Authorization", `Bearer ${admin}`).send({ name: semesterName });
      expect(response.status).toBe(status);
    }
  });

  it("creates for active faculties, skips duplicates, and excludes inactive faculties", async () => {
    const response = await http().post(`${base}/semesters/for-all-faculties`)
      .set("Authorization", `Bearer ${admin}`).send({ name: semesterName });
    for (const item of response.body.created || []) semesterIds.add(item.semesterId);
    expect(response.status).toBe(201);
    expect(response.body.createdCount).toBeGreaterThan(0);
    expect(response.body.createdCount).toBe(response.body.created.length);
    expect(response.body.skippedCount).toBe(response.body.skipped.length);
    expect(response.body.skipped).toContainEqual(expect.objectContaining({ facultyId, reason: "already exists" }));
    expect([...response.body.created, ...response.body.skipped]).not.toContainEqual(
      expect.objectContaining({ facultyId: inactiveFacultyId })
    );
    const repeated = await http().post(`${base}/semesters/for-all-faculties`)
      .set("Authorization", `Bearer ${library}`).send({ name: semesterName });
    expect(repeated.status).toBe(201);
    expect(repeated.body.createdCount).toBe(0);
    expect(repeated.body.skippedCount).toBe(response.body.createdCount + response.body.skippedCount);
  });
});

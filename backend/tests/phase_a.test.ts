import * as http from "http";

// ── Test Infrastructure ──

const BASE = "http://127.0.0.1:3001";
let passed = 0;
let failed = 0;
const failures: string[] = [];
let authToken = "";  // JWT token for authenticated requests

async function request(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>,
  skipAuth = false
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const payload = body ? JSON.stringify(body) : undefined;

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload).toString() } : {}),
          ...(authToken && !skipAuth ? { "Authorization": `Bearer ${authToken}` } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          let data: unknown;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode ?? 0, data });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    const msg = `  ❌ ${name}${detail ? ` — ${detail}` : ""}`;
    failures.push(msg);
    console.log(msg);
  }
}

function getField(data: unknown, ...keys: string[]): unknown {
  let val: unknown = data;
  for (const key of keys) {
    if (typeof val !== "object" || val === null) return undefined;
    val = (val as Record<string, unknown>)[key];
  }
  return val;
}

// ── Test Suites ──

async function testHealth(): Promise<void> {
  console.log("\n🏥 Health Check");
  const res = await request("GET", "/health");
  assert("GET /health returns 200", res.status === 200);
  assert("Response has status:ok", getField(res.data, "status") === "ok");
}

async function testUserCreation(): Promise<string> {
  console.log("\n👤 User Creation");

  // Happy path
  const res = await request("POST", "/users", { email: "test@example.com" }, true);
  assert("POST /users returns 201", res.status === 201);
  assert("Response has user id", typeof getField(res.data, "data", "id") === "string");
  assert("Email matches", getField(res.data, "data", "email") === "test@example.com");
  assert("Intake fields are null", getField(res.data, "data", "experience_level") === null);

  const userId = getField(res.data, "data", "id") as string;

  // Get auth token for this user
  const ml = await request("POST", "/auth/magic-link", { email: "test@example.com" }, true);
  const devToken = getField(ml.data, "data", "_dev_token") as string;
  const verify = await request("POST", "/auth/verify", { token: devToken }, true);
  authToken = getField(verify.data, "data", "jwt") as string;

  // Duplicate email → 409
  const dup = await request("POST", "/users", { email: "test@example.com" }, true);
  assert("Duplicate email returns 409", dup.status === 409);
  assert("Error code is CONFLICT", getField(dup.data, "error", "code") === "CONFLICT");

  // Invalid email → 400
  const bad = await request("POST", "/users", { email: "not-an-email" }, true);
  assert("Invalid email returns 400", bad.status === 400);

  // Missing email → 400
  const missing = await request("POST", "/users", {}, true);
  assert("Missing email returns 400", missing.status === 400);

  return userId;
}

async function testGetUser(userId: string): Promise<void> {
  console.log("\n👤 Get User");

  const res = await request("GET", `/users/${userId}`);
  assert("GET /users/:id returns 200", res.status === 200);
  assert("Returns correct user", getField(res.data, "data", "id") === userId);

  // Non-existent user → 404
  const notFound = await request("GET", "/users/00000000-0000-0000-0000-000000000000");
  assert("Non-existent user returns 404", notFound.status === 404);
  assert("Error code is NOT_FOUND", getField(notFound.data, "error", "code") === "NOT_FOUND");
}

async function testIntake(userId: string): Promise<void> {
  console.log("\n📋 Intake Form");

  // Happy path
  const res = await request("PUT", `/users/${userId}/intake`, {
    experience_level: 3,
    business_type: "ONLINE",
    budget: 500,
    income_goal: 5000,
    weekly_hours: 20,
  });
  assert("PUT intake returns 200", res.status === 200);
  assert("Experience level saved", getField(res.data, "data", "experience_level") === 3);
  assert("Business type saved", getField(res.data, "data", "business_type") === "ONLINE");

  // Invalid experience level → 400
  const badExp = await request("PUT", `/users/${userId}/intake`, {
    experience_level: 15,
    business_type: "ONLINE",
    budget: 500,
    income_goal: 5000,
    weekly_hours: 20,
  });
  assert("Experience >10 returns 400", badExp.status === 400);

  // Invalid business type → 400
  const badType = await request("PUT", `/users/${userId}/intake`, {
    experience_level: 3,
    business_type: "SPACE",
    budget: 500,
    income_goal: 5000,
    weekly_hours: 20,
  });
  assert("Invalid business_type returns 400", badType.status === 400);

  // Non-existent user → 404
  const noUser = await request("PUT", "/users/00000000-0000-0000-0000-000000000000/intake", {
    experience_level: 3,
    business_type: "ONLINE",
    budget: 500,
    income_goal: 5000,
    weekly_hours: 20,
  });
  assert("Intake for non-existent user returns 404", noUser.status === 404);
}

async function testAuth(userId: string): Promise<void> {
  console.log("\n🔑 Magic Link Auth");

  // Send magic link
  const res = await request("POST", "/auth/magic-link", { email: "test@example.com" }, true);
  assert("POST /auth/magic-link returns 200", res.status === 200);
  assert("Response has sent:true", getField(res.data, "data", "sent") === true);

  const devToken = getField(res.data, "data", "_dev_token") as string;
  assert("Dev token present", typeof devToken === "string" && devToken.length > 0);

  // Verify token
  const verify = await request("POST", "/auth/verify", { token: devToken }, true);
  assert("POST /auth/verify returns 200", verify.status === 200);
  assert("Returns JWT", typeof getField(verify.data, "data", "jwt") === "string");
  assert("Returns user object", getField(verify.data, "data", "user", "id") === userId);

  // Token cannot be reused
  const reuse = await request("POST", "/auth/verify", { token: devToken }, true);
  assert("Reused token returns 401", reuse.status === 401);

  // Invalid token
  const badToken = await request("POST", "/auth/verify", { token: "deadbeef" }, true);
  assert("Invalid token returns 401", badToken.status === 401);

  // Magic link for non-existent email
  const noEmail = await request("POST", "/auth/magic-link", { email: "nobody@example.com" }, true);
  assert("Non-existent email returns 404", noEmail.status === 404);
}

async function testVenture(userId: string): Promise<string> {
  console.log("\n🚀 Venture CRUD");

  // Create venture — user_id comes from JWT (SEC-1 fix)
  const res = await request("POST", "/ventures", {});
  assert("POST /ventures returns 201", res.status === 201);
  const ventureId = getField(res.data, "data", "id") as string;
  assert("Venture has id", typeof ventureId === "string");
  assert("Entity type defaults to NONE", getField(res.data, "data", "entity_type") === "NONE");

  // Duplicate venture → now succeeds (V2: multi-venture, up to 3)
  const dup = await request("POST", "/ventures", {});
  assert("Second venture returns 201 (multi-venture V2)", dup.status === 201);
  const dup2 = await request("POST", "/ventures", {});
  assert("Third venture returns 201 (multi-venture V2)", dup2.status === 201);
  const dup3 = await request("POST", "/ventures", {});
  assert("Fourth venture returns 409 (3-venture limit)", dup3.status === 409);

  // Get venture
  const get = await request("GET", `/ventures/${ventureId}`);
  assert("GET /ventures/:id returns 200", get.status === 200);
  assert("Includes phases", Array.isArray(getField(get.data, "data", "phases")));
  assert("Has 5 phases", (getField(get.data, "data", "phases") as unknown[])?.length === 5);
  assert("Includes artifact count", getField(get.data, "data", "artifact_count") === 0);

  // Check Phase 1 is ACTIVE, rest are LOCKED
  const phases = getField(get.data, "data", "phases") as Array<Record<string, unknown>>;
  assert("Phase 1 is ACTIVE", phases[0]?.status === "ACTIVE");
  assert("Phase 2 is LOCKED", phases[1]?.status === "LOCKED");
  assert("Phase 5 is LOCKED", phases[4]?.status === "LOCKED");
  assert("Phase 1 has gate criteria", Array.isArray(phases[0]?.gate_criteria));

  // Update venture
  const patch = await request("PATCH", `/ventures/${ventureId}`, {
    name: "My Startup",
    problem_statement: "People waste time on manual bookkeeping",
    entity_type: "LLC",
  });
  assert("PATCH returns 200", patch.status === 200);
  assert("Name updated", getField(patch.data, "data", "name") === "My Startup");
  assert("Problem statement updated", getField(patch.data, "data", "problem_statement") === "People waste time on manual bookkeeping");
  assert("Entity type updated", getField(patch.data, "data", "entity_type") === "LLC");

  // Invalid update field → 400
  const badField = await request("PATCH", `/ventures/${ventureId}`, {
    hacker_field: "evil",
  });
  assert("Unknown field returns 400", badField.status === 400);

  // Non-existent venture → 404
  const notFound = await request("GET", "/ventures/00000000-0000-0000-0000-000000000000");
  assert("Non-existent venture returns 404", notFound.status === 404);

  return ventureId;
}

async function testArtifacts(ventureId: string): Promise<void> {
  console.log("\n📄 Artifacts");

  // Create artifact
  const res = await request("POST", `/ventures/${ventureId}/artifacts`, {
    phase_number: 1,
    type: "CUSTOMER_LIST",
    content: { competitors: ["Wave", "QuickBooks", "FreshBooks"] },
  });
  assert("POST artifact returns 201", res.status === 201);
  const artifactId = getField(res.data, "data", "id") as string;
  assert("Artifact has id", typeof artifactId === "string");
  assert("Version is 1", getField(res.data, "data", "version") === 1);

  // List artifacts
  const list = await request("GET", `/ventures/${ventureId}/artifacts`);
  assert("GET artifacts returns 200", list.status === 200);
  assert("Returns array", Array.isArray(getField(list.data, "data", "artifacts")));
  assert("Has 1 artifact", (getField(list.data, "data", "artifacts") as unknown[])?.length === 1);

  // Filter by phase
  const filtered = await request("GET", `/ventures/${ventureId}/artifacts?phase=2`);
  assert("Filter by phase=2 returns empty", (getField(filtered.data, "data", "artifacts") as unknown[])?.length === 0);

  // Update artifact
  const updated = await request("PUT", `/ventures/${ventureId}/artifacts/${artifactId}`, {
    content: { competitors: ["Wave", "QuickBooks", "FreshBooks", "Xero"] },
  });
  assert("PUT artifact returns 200", updated.status === 200);
  assert("Version incremented to 2", getField(updated.data, "data", "version") === 2);

  // Invalid artifact creation → 400
  const badArtifact = await request("POST", `/ventures/${ventureId}/artifacts`, {
    phase_number: 99,
    type: "INVALID_TYPE",
    content: {},
  });
  assert("Invalid artifact returns 400", badArtifact.status === 400);

  // Non-existent artifact update → 404
  const noArtifact = await request("PUT", `/ventures/${ventureId}/artifacts/00000000-0000-0000-0000-000000000000`, {
    content: { foo: "bar" },
  });
  assert("Non-existent artifact returns 404", noArtifact.status === 404);
}

async function testPhases(ventureId: string): Promise<void> {
  console.log("\n📊 Phase Progress");

  const res = await request("GET", `/ventures/${ventureId}/phases`);
  assert("GET phases returns 200", res.status === 200);

  const phases = getField(res.data, "data", "phases") as Array<Record<string, unknown>>;
  assert("Returns 5 phases", phases?.length === 5);
  assert("Each phase has gate_criteria", phases.every((p) => Array.isArray(p.gate_criteria)));
  assert("Each phase has status", phases.every((p) => typeof p.status === "string"));
}

async function testRouteNotFound(): Promise<void> {
  console.log("\n🚫 404 Handling");
  // Authenticated request to non-existent route
  const res = await request("GET", "/nonexistent/path");
  assert("Unknown route returns 404", res.status === 404);
  assert("Error code is NOT_FOUND", getField(res.data, "error", "code") === "NOT_FOUND");

  // Unauthenticated request to non-existent route should return 401
  const unauth = await request("GET", "/nonexistent/path", undefined, true);
  assert("Unauth unknown route returns 401", unauth.status === 401);
}

// ── Test Runner ──

async function runAllTests(): Promise<void> {
  console.log("═══════════════════════════════════════════");
  console.log("  Phase A Test Suite — Entrepreneurial Toolkit");
  console.log("═══════════════════════════════════════════");

  try {
    await testHealth();
    const userId = await testUserCreation();
    await testGetUser(userId);
    await testIntake(userId);
    await testAuth(userId);
    const ventureId = await testVenture(userId);
    await testArtifacts(ventureId);
    await testPhases(ventureId);
    await testRouteNotFound();
  } catch (err) {
    console.error("\n💥 Test suite crashed:", err);
    failed++;
  }

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log("\n  Failures:");
    failures.forEach((f) => console.log(f));
  }
  console.log("═══════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

// Wait for server to be ready, then run
function waitForServer(retries = 20): Promise<void> {
  return new Promise((resolve, reject) => {
    const attempt = (n: number): void => {
      const req = http.request({ hostname: "127.0.0.1", port: 3001, path: "/health", method: "GET" }, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (n <= 0) {
          reject(new Error("Server did not start"));
          return;
        }
        setTimeout(() => attempt(n - 1), 200);
      });
      req.end();
    };
    attempt(retries);
  });
}

waitForServer()
  .then(() => runAllTests())
  .catch((err) => {
    console.error("Failed to connect to server:", err);
    process.exit(1);
  });

import * as http from "http";

const BASE = "http://127.0.0.1:4001";
let passed = 0;
let failed = 0;
const failures: string[] = [];
let authToken = "";

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
          try { data = JSON.parse(raw); } catch { data = raw; }
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

let userId: string;
let ventureId: string;

async function setup(): Promise<void> {
  console.log("\n⚙️  Setup");
  const userRes = await request("POST", "/users", { email: "phasec@test.com" }, true);
  userId = getField(userRes.data, "data", "id") as string;

  // Get auth token
  const ml = await request("POST", "/auth/magic-link", { email: "phasec@test.com" }, true);
  const verify = await request("POST", "/auth/verify", { token: getField(ml.data, "data", "_dev_token") as string }, true);
  authToken = getField(verify.data, "data", "jwt") as string;

  await request("PUT", `/users/${userId}/intake`, {
    experience_level: 3, business_type: "ONLINE", budget: 500, income_goal: 5000, weekly_hours: 20,
  });
  const ventureRes = await request("POST", "/ventures", {});
  ventureId = getField(ventureRes.data, "data", "id") as string;
  await request("PATCH", `/ventures/${ventureId}`, {
    name: "BookBot AI",
    problem_statement: "Small business owners waste hours on manual bookkeeping every single week",
  });
  assert("Setup: user + venture created", !!userId && !!ventureId);
}

async function testChat(): Promise<void> {
  console.log("\n💬 Chat");
  const res = await request("POST", `/ventures/${ventureId}/chat`, {
    message: "How do I validate my business idea?", phase_number: 1,
  });
  assert("POST /chat returns 200", res.status === 200);
  assert("Has reply", typeof getField(res.data, "data", "reply") === "string");
  assert("Reply is non-empty", (getField(res.data, "data", "reply") as string).length > 20);
  assert("Has tokens_used", typeof getField(res.data, "data", "tokens_used") === "number");
  assert("Has remaining_today", typeof getField(res.data, "data", "remaining_today") === "number");
  assert("remaining_today is 29", (getField(res.data, "data", "remaining_today") as number) === 29);
  assert("Has model", typeof getField(res.data, "data", "model") === "string");
  assert("Has conversation_id", typeof getField(res.data, "data", "conversation_id") === "string");

  const reply = getField(res.data, "data", "reply") as string;
  assert("Reply has phase context", reply.includes("Phase") || reply.includes("Discovery") || reply.includes("question"));

  // Second message — same conversation
  const res2 = await request("POST", `/ventures/${ventureId}/chat`, {
    message: "Can you tell me more about customer interviews?", phase_number: 1,
  });
  assert("Second chat returns 200", res2.status === 200);
  assert("remaining is 28", (getField(res2.data, "data", "remaining_today") as number) === 28);
  const convId1 = getField(res.data, "data", "conversation_id") as string;
  const convId2 = getField(res2.data, "data", "conversation_id") as string;
  assert("Same conversation for same phase", convId1 === convId2);
}

async function testChatValidation(): Promise<void> {
  console.log("\n💬 Chat Validation");
  const noMsg = await request("POST", `/ventures/${ventureId}/chat`, { phase_number: 1 });
  assert("Missing message → 400", noMsg.status === 400);
  const emptyMsg = await request("POST", `/ventures/${ventureId}/chat`, { message: "", phase_number: 1 });
  assert("Empty message → 400", emptyMsg.status === 400);
  const noPhase = await request("POST", `/ventures/${ventureId}/chat`, { message: "hi" });
  assert("Missing phase_number → 400", noPhase.status === 400);
  const badPhase = await request("POST", `/ventures/${ventureId}/chat`, { message: "hi", phase_number: 99 });
  assert("Invalid phase_number → 400", badPhase.status === 400);
  const noVenture = await request("POST", "/ventures/00000000-0000-0000-0000-000000000000/chat", { message: "hi", phase_number: 1 });
  assert("Non-existent venture → 404", noVenture.status === 404);
}

async function testChatHistory(): Promise<void> {
  console.log("\n📜 Chat History");
  const res = await request("GET", `/ventures/${ventureId}/chat/history`);
  assert("GET /chat/history returns 200", res.status === 200);
  const convos = getField(res.data, "data", "messages") as Array<Record<string, unknown>>;
  assert("Has conversations", convos.length > 0);
  const msgs = convos[0].messages as Array<Record<string, unknown>>;
  assert("Conversation has messages", msgs.length >= 4);
  assert("Messages have role", typeof msgs[0]?.role === "string");
  assert("Messages have content", typeof msgs[0]?.content === "string");
  assert("Messages have timestamp", typeof msgs[0]?.timestamp === "string");

  const phase1 = await request("GET", `/ventures/${ventureId}/chat/history?phase=1`);
  assert("Phase=1 filter returns data", (getField(phase1.data, "data", "messages") as unknown[]).length > 0);
  const phase2 = await request("GET", `/ventures/${ventureId}/chat/history?phase=2`);
  assert("Phase=2 filter returns empty", (getField(phase2.data, "data", "messages") as unknown[]).length === 0);
  const noV = await request("GET", "/ventures/00000000-0000-0000-0000-000000000000/chat/history");
  assert("Non-existent venture → 404", noV.status === 404);
}

async function testArtifactGen(): Promise<void> {
  console.log("\n🏗️  Artifact Generation");
  const res = await request("POST", `/ventures/${ventureId}/generate/BUSINESS_PLAN`, { phase_number: 1 });
  assert("Generate BUSINESS_PLAN → 200", res.status === 200);
  assert("Has artifact", typeof getField(res.data, "data", "artifact") === "object");
  assert("Artifact has id", typeof getField(res.data, "data", "artifact", "id") === "string");
  assert("Artifact has content", typeof getField(res.data, "data", "artifact", "content") === "object");
  assert("Has tokens_used", typeof getField(res.data, "data", "tokens_used") === "number");
  assert("remaining reflects 3-unit cost (25)", (getField(res.data, "data", "remaining_today") as number) === 25);

  const content = getField(res.data, "data", "artifact", "content") as Record<string, unknown>;
  assert("Content has problem field", typeof content.problem === "string");
  assert("Content has solution field", typeof content.solution === "string");

  const offer = await request("POST", `/ventures/${ventureId}/generate/OFFER_STATEMENT`, { phase_number: 2 });
  assert("Generate OFFER_STATEMENT → 200", offer.status === 200);
  assert("Offer has headline", typeof getField(offer.data, "data", "artifact", "content", "headline") === "string");
  assert("remaining is 22", (getField(offer.data, "data", "remaining_today") as number) === 22);

  const gtm = await request("POST", `/ventures/${ventureId}/generate/GTM_PLAN`, { phase_number: 4 });
  assert("Generate GTM_PLAN → 200", gtm.status === 200);
  assert("remaining is 19", (getField(gtm.data, "data", "remaining_today") as number) === 19);

  const growth = await request("POST", `/ventures/${ventureId}/generate/GROWTH_PLAN`, { phase_number: 5 });
  assert("Generate GROWTH_PLAN → 200", growth.status === 200);
  assert("remaining is 16", (getField(growth.data, "data", "remaining_today") as number) === 16);
}

async function testArtifactGenValidation(): Promise<void> {
  console.log("\n🏗️  Artifact Gen Validation");
  const badType = await request("POST", `/ventures/${ventureId}/generate/INVALID`, { phase_number: 1 });
  assert("Invalid type → 400", badType.status === 400);
  const manual = await request("POST", `/ventures/${ventureId}/generate/CUSTOMER_LIST`, { phase_number: 1 });
  assert("Non-generatable type → 400", manual.status === 400);
  const noPhase = await request("POST", `/ventures/${ventureId}/generate/BUSINESS_PLAN`, {});
  assert("Missing phase_number → 400", noPhase.status === 400);
  const noV = await request("POST", "/ventures/00000000-0000-0000-0000-000000000000/generate/BUSINESS_PLAN", { phase_number: 1 });
  assert("Non-existent venture → 404", noV.status === 404);
}

async function testRateLimit(): Promise<void> {
  console.log("\n⏱️  Rate Limiting");
  const status = await request("GET", `/ventures/${ventureId}/rate-limit`);
  assert("GET /rate-limit → 200", status.status === 200);
  assert("Has messages_used", typeof getField(status.data, "data", "messages_used") === "number");
  assert("messages_limit is 30", getField(status.data, "data", "messages_limit") === 30);
  assert("Has remaining_today", typeof getField(status.data, "data", "remaining_today") === "number");
  assert("Has resets_at", typeof getField(status.data, "data", "resets_at") === "string");
  const remaining = getField(status.data, "data", "remaining_today") as number;
  assert("Remaining is 16", remaining === 16);

  // Exhaust remaining
  for (let i = 0; i < 16; i++) {
    await request("POST", `/ventures/${ventureId}/chat`, { message: `exhaust ${i}`, phase_number: 1 });
  }

  const limited = await request("POST", `/ventures/${ventureId}/chat`, { message: "should fail", phase_number: 1 });
  assert("Rate limited chat → 429", limited.status === 429);
  assert("Error code RATE_LIMITED", getField(limited.data, "error", "code") === "RATE_LIMITED");

  const limitedGen = await request("POST", `/ventures/${ventureId}/generate/BUSINESS_PLAN`, { phase_number: 1 });
  assert("Rate limited gen → 429", limitedGen.status === 429);

  const finalStatus = await request("GET", `/ventures/${ventureId}/rate-limit`);
  assert("Remaining is 0", getField(finalStatus.data, "data", "remaining_today") === 0);
  assert("Used is 30", getField(finalStatus.data, "data", "messages_used") === 30);
}

async function testConversationPersistence(): Promise<void> {
  console.log("\n💾 Conversation Persistence");
  const history = await request("GET", `/ventures/${ventureId}/chat/history?phase=1`);
  const convos = getField(history.data, "data", "messages") as Array<Record<string, unknown>>;
  assert("Phase 1 has conversations", convos.length > 0);
  const allMsgs = convos[0].messages as Array<Record<string, unknown>>;
  const userMsgs = allMsgs.filter((m) => m.role === "user");
  const asstMsgs = allMsgs.filter((m) => m.role === "assistant");
  assert("Has user messages", userMsgs.length > 0);
  assert("Has assistant messages", asstMsgs.length > 0);
  assert("Balanced user/assistant", userMsgs.length === asstMsgs.length);
}

async function testSeparatePhaseConvos(): Promise<void> {
  console.log("\n🔀 Separate Phase Conversations");
  const u2 = await request("POST", "/users", { email: "phasec2@test.com" }, true);
  const uid2 = getField(u2.data, "data", "id") as string;

  // Auth as second user
  const ml2 = await request("POST", "/auth/magic-link", { email: "phasec2@test.com" }, true);
  const v2auth = await request("POST", "/auth/verify", { token: getField(ml2.data, "data", "_dev_token") as string }, true);
  const savedToken = authToken;
  authToken = getField(v2auth.data, "data", "jwt") as string;

  await request("PUT", `/users/${uid2}/intake`, {
    experience_level: 5, business_type: "LOCAL", budget: 2000, income_goal: 8000, weekly_hours: 30,
  });
  const v2 = await request("POST", "/ventures", {});
  const vid2 = getField(v2.data, "data", "id") as string;
  await request("PATCH", `/ventures/${vid2}`, { name: "Local Bakery" });
  await request("POST", `/ventures/${vid2}/phases/2/unlock`, { reason: "test" });

  const c1 = await request("POST", `/ventures/${vid2}/chat`, { message: "Discovery help", phase_number: 1 });
  assert("V2 Phase 1 chat OK", c1.status === 200);
  const cid1 = getField(c1.data, "data", "conversation_id") as string;

  const c2 = await request("POST", `/ventures/${vid2}/chat`, { message: "Plan help", phase_number: 2 });
  assert("V2 Phase 2 chat OK", c2.status === 200);
  const cid2 = getField(c2.data, "data", "conversation_id") as string;
  assert("Different phases → different conversations", cid1 !== cid2);

  const h1 = await request("GET", `/ventures/${vid2}/chat/history?phase=1`);
  const h2 = await request("GET", `/ventures/${vid2}/chat/history?phase=2`);
  assert("Phase 1 history: 1 convo", (getField(h1.data, "data", "messages") as unknown[]).length === 1);
  assert("Phase 2 history: 1 convo", (getField(h2.data, "data", "messages") as unknown[]).length === 1);

  const lim2 = await request("GET", `/ventures/${vid2}/rate-limit`);
  assert("V2 rate limit independent (used=2)", (getField(lim2.data, "data", "messages_used") as number) === 2);

  // Restore original auth token
  authToken = savedToken;
}

async function runAllTests(): Promise<void> {
  console.log("═══════════════════════════════════════════");
  console.log("  Phase C Test Suite — AI Copilot");
  console.log("═══════════════════════════════════════════");
  try {
    await setup();
    await testChat();
    await testChatValidation();
    await testChatHistory();
    await testArtifactGen();
    await testArtifactGenValidation();
    await testRateLimit();
    await testConversationPersistence();
    await testSeparatePhaseConvos();
  } catch (err) {
    console.error("\n💥 Test suite crashed:", err);
    failed++;
  }
  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) { console.log("\n  Failures:"); failures.forEach((f) => console.log(f)); }
  console.log("═══════════════════════════════════════════\n");
  process.exit(failed > 0 ? 1 : 0);
}

function waitForServer(retries = 20): Promise<void> {
  return new Promise((resolve, reject) => {
    const attempt = (n: number): void => {
      const req = http.request(
        { hostname: "127.0.0.1", port: 4001, path: "/health", method: "GET" },
        (res) => { res.resume(); resolve(); }
      );
      req.on("error", () => {
        if (n <= 0) { reject(new Error("Server did not start")); return; }
        setTimeout(() => attempt(n - 1), 200);
      });
      req.end();
    };
    attempt(retries);
  });
}

waitForServer().then(() => runAllTests()).catch((err) => { console.error("Server:", err); process.exit(1); });

import * as http from "http";

// ── Test Infrastructure ──

const BASE = "http://127.0.0.1:3001";
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
          ...(payload
            ? { "Content-Length": Buffer.byteLength(payload).toString() }
            : {}),
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

// ── Setup: Create user + venture ──

let userId: string;
let ventureId: string;

async function setup(): Promise<void> {
  console.log("\n⚙️  Setup: Creating user + venture");

  const userRes = await request("POST", "/users", {
    email: "phaseb@test.com",
  }, true);
  userId = getField(userRes.data, "data", "id") as string;

  // Get auth token
  const ml = await request("POST", "/auth/magic-link", { email: "phaseb@test.com" }, true);
  const verify = await request("POST", "/auth/verify", { token: getField(ml.data, "data", "_dev_token") as string }, true);
  authToken = getField(verify.data, "data", "jwt") as string;

  await request("PUT", `/users/${userId}/intake`, {
    experience_level: 5,
    business_type: "ONLINE",
    budget: 1000,
    income_goal: 5000,
    weekly_hours: 20,
  });

  const ventureRes = await request("POST", "/ventures", {});
  ventureId = getField(ventureRes.data, "data", "id") as string;

  assert("Setup: user created", !!userId);
  assert("Setup: venture created", !!ventureId);
}

// ── Test Suites ──

async function testPhaseConfig(): Promise<void> {
  console.log("\n📖 Phase Config");

  // Get all configs
  const all = await request("GET", "/phases/config");
  assert("GET /phases/config returns 200", all.status === 200);

  const configs = getField(all.data, "data", "configs") as Array<
    Record<string, unknown>
  >;
  assert("Returns 5 phase configs", configs?.length === 5);
  assert(
    "Phase 1 is Discovery",
    (configs[0]?.name as string) === "Discovery"
  );
  assert(
    "Phase 2 is Planning",
    (configs[1]?.name as string) === "Planning"
  );
  assert(
    "Phase 3 is Formation",
    (configs[2]?.name as string) === "Formation"
  );
  assert("Phase 4 is Launch", (configs[3]?.name as string) === "Launch");
  assert("Phase 5 is Scale", (configs[4]?.name as string) === "Scale");

  // Each config has required fields
  assert(
    "Configs have guide_content",
    configs.every(
      (c) =>
        typeof c.guide_content === "string" &&
        (c.guide_content as string).length > 100
    )
  );
  assert(
    "Configs have tool_recommendations",
    configs.every(
      (c) =>
        Array.isArray(c.tool_recommendations) &&
        (c.tool_recommendations as string[]).length > 0
    )
  );
  assert(
    "Configs have core_deliverable",
    configs.every((c) => typeof c.core_deliverable === "string")
  );

  // Get single config
  const single = await request("GET", "/phases/config/3");
  assert("GET /phases/config/3 returns 200", single.status === 200);
  assert(
    "Phase 3 name is Formation",
    getField(single.data, "data", "name") === "Formation"
  );
  assert(
    "Phase 3 has original_sections",
    getField(single.data, "data", "original_sections") ===
      "§4 Company Setup + §9 Finance Basics"
  );

  // Invalid phase number
  const bad = await request("GET", "/phases/config/99");
  assert("Invalid phase config returns 400", bad.status === 400);
}

async function testEnrichedPhases(): Promise<void> {
  console.log("\n📊 Enriched Phases");

  const res = await request(
    "GET",
    `/ventures/${ventureId}/phases/enriched`
  );
  assert("GET enriched phases returns 200", res.status === 200);

  const phases = getField(res.data, "data", "phases") as Array<
    Record<string, unknown>
  >;
  assert("Returns 5 enriched phases", phases?.length === 5);
  assert(
    "Phase 1 has name",
    (phases[0]?.name as string) === "Discovery"
  );
  assert(
    "Phase 1 has guide_content",
    typeof phases[0]?.guide_content === "string" &&
      (phases[0].guide_content as string).length > 100
  );
  assert(
    "Phase 1 has tool_recommendations",
    Array.isArray(phases[0]?.tool_recommendations)
  );
  assert(
    "Phase 1 has gate_criteria",
    Array.isArray(phases[0]?.gate_criteria)
  );
  assert("Phase 1 is ACTIVE", phases[0]?.status === "ACTIVE");
  assert("Phase 2 is LOCKED", phases[1]?.status === "LOCKED");

  // Non-existent venture → 404
  const notFound = await request(
    "GET",
    "/ventures/00000000-0000-0000-0000-000000000000/phases/enriched"
  );
  assert("Non-existent venture returns 404", notFound.status === 404);
}

async function testGateEvaluation(): Promise<void> {
  console.log("\n🔍 Gate Evaluation — Phase 1");

  // Evaluate Phase 1 gates — should have nothing satisfied yet
  const initial = await request(
    "POST",
    `/ventures/${ventureId}/phases/1/gate`
  );
  assert("Gate evaluation returns 200", initial.status === 200);
  assert(
    "Not passed initially",
    getField(initial.data, "data", "passed") === false
  );

  const missing = getField(initial.data, "data", "missing") as Array<
    Record<string, unknown>
  >;
  assert("3 gates missing initially", missing?.length === 3);

  // Cannot evaluate gate on LOCKED phase
  const locked = await request(
    "POST",
    `/ventures/${ventureId}/phases/2/gate`
  );
  assert("Gate on LOCKED phase returns 400", locked.status === 400);

  // Set problem statement (≥20 chars) to satisfy Gate 1.1
  await request("PATCH", `/ventures/${ventureId}`, {
    problem_statement:
      "Small business owners waste hours on manual bookkeeping every week",
  });

  // Create competitor artifact to satisfy Gate 1.2
  await request("POST", `/ventures/${ventureId}/artifacts`, {
    phase_number: 1,
    type: "CUSTOMER_LIST",
    content: {
      competitors: ["QuickBooks", "Wave", "FreshBooks", "Xero"],
    },
  });

  // Re-evaluate — should now have 2 gates satisfied, 1 remaining
  const partial = await request(
    "POST",
    `/ventures/${ventureId}/phases/1/gate`
  );
  assert(
    "Partial evaluation — not passed",
    getField(partial.data, "data", "passed") === false
  );

  const partialMissing = getField(
    partial.data,
    "data",
    "missing"
  ) as Array<Record<string, unknown>>;
  assert("1 gate remaining", partialMissing?.length === 1);
  assert(
    "Missing gate is customer_conversations",
    partialMissing[0]?.key === "customer_conversations"
  );

  const partialCriteria = getField(
    partial.data,
    "data",
    "gate_criteria"
  ) as Array<Record<string, unknown>>;
  const problemGate = partialCriteria?.find(
    (g) => g.key === "problem_statement"
  );
  assert(
    "Problem statement gate satisfied",
    problemGate?.satisfied === true
  );
  const competitorGate = partialCriteria?.find(
    (g) => g.key === "competitors_identified"
  );
  assert(
    "Competitor gate satisfied",
    competitorGate?.satisfied === true
  );
}

async function testSelfReportedGates(): Promise<void> {
  console.log("\n✏️  Self-Reported Gate Updates");

  // Mark customer_conversations as satisfied
  const update = await request(
    "PATCH",
    `/ventures/${ventureId}/phases/1/gate/customer_conversations`,
    { satisfied: true }
  );
  assert("PATCH gate criterion returns 200", update.status === 200);

  const criteria = getField(
    update.data,
    "data",
    "gate_criteria"
  ) as Array<Record<string, unknown>>;
  const convGate = criteria?.find(
    (g) => g.key === "customer_conversations"
  );
  assert(
    "customer_conversations now satisfied",
    convGate?.satisfied === true
  );

  // Invalid gate key → 404
  const badKey = await request(
    "PATCH",
    `/ventures/${ventureId}/phases/1/gate/nonexistent_gate`,
    { satisfied: true }
  );
  assert("Non-existent gate key returns 404", badKey.status === 404);

  // Missing satisfied field → 400
  const badBody = await request(
    "PATCH",
    `/ventures/${ventureId}/phases/1/gate/customer_conversations`,
    { value: true }
  );
  assert("Missing satisfied field returns 400", badBody.status === 400);
}

async function testPhaseTransition(): Promise<void> {
  console.log("\n🔄 Phase State Transitions");

  // Now all Phase 1 gates should pass — evaluate to trigger transition
  const eval1 = await request(
    "POST",
    `/ventures/${ventureId}/phases/1/gate`
  );
  assert(
    "Phase 1 gates now pass",
    getField(eval1.data, "data", "passed") === true
  );
  assert(
    "No missing gates",
    (getField(eval1.data, "data", "missing") as unknown[])?.length === 0
  );

  // Check that Phase 1 is now COMPLETE and Phase 2 is ACTIVE
  const phases = await request(
    "GET",
    `/ventures/${ventureId}/phases`
  );
  const phaseList = getField(phases.data, "data", "phases") as Array<
    Record<string, unknown>
  >;
  assert(
    "Phase 1 transitioned to COMPLETE",
    phaseList[0]?.status === "COMPLETE"
  );
  assert(
    "Phase 1 has completed_at",
    typeof phaseList[0]?.completed_at === "string"
  );
  assert(
    "Phase 2 transitioned to ACTIVE",
    phaseList[1]?.status === "ACTIVE"
  );
  assert(
    "Phase 2 has started_at",
    typeof phaseList[1]?.started_at === "string"
  );
  assert("Phase 3 still LOCKED", phaseList[2]?.status === "LOCKED");

  // Evaluate a COMPLETE phase — should still work (re-evaluation)
  // Actually Phase 1 is now COMPLETE — but our evaluateGate only blocks LOCKED
  const reeval = await request(
    "POST",
    `/ventures/${ventureId}/phases/1/gate`
  );
  assert(
    "Re-evaluating COMPLETE phase works",
    reeval.status === 200
  );
}

async function testForceUnlock(): Promise<void> {
  console.log("\n🔓 Force Unlock");

  // Phase 3 should be LOCKED
  const before = await request(
    "GET",
    `/ventures/${ventureId}/phases`
  );
  const beforePhases = getField(
    before.data,
    "data",
    "phases"
  ) as Array<Record<string, unknown>>;
  assert(
    "Phase 3 is LOCKED before unlock",
    beforePhases[2]?.status === "LOCKED"
  );

  // Force-unlock Phase 3
  const unlock = await request(
    "POST",
    `/ventures/${ventureId}/phases/3/unlock`,
    { reason: "Client requested skip for testing" }
  );
  assert("Force-unlock returns 200", unlock.status === 200);
  assert(
    "Phase 3 now ACTIVE",
    getField(unlock.data, "data", "status") === "ACTIVE"
  );
  assert(
    "Phase 3 has started_at after unlock",
    typeof getField(unlock.data, "data", "started_at") === "string"
  );

  // Force-unlock already ACTIVE phase — should return current state (no-op)
  const noop = await request(
    "POST",
    `/ventures/${ventureId}/phases/3/unlock`,
    { reason: "Double unlock attempt" }
  );
  assert("Double unlock returns 200", noop.status === 200);
  assert(
    "Still ACTIVE",
    getField(noop.data, "data", "status") === "ACTIVE"
  );

  // Missing reason → 400
  const noReason = await request(
    "POST",
    `/ventures/${ventureId}/phases/4/unlock`,
    {}
  );
  assert("Missing reason returns 400", noReason.status === 400);

  // Non-existent venture → 404
  const notFound = await request(
    "POST",
    "/ventures/00000000-0000-0000-0000-000000000000/phases/3/unlock",
    { reason: "test" }
  );
  assert("Non-existent venture returns 404", notFound.status === 404);

  // Invalid phase number → 400
  const badPhase = await request(
    "POST",
    `/ventures/${ventureId}/phases/99/unlock`,
    { reason: "test" }
  );
  assert("Invalid phase number returns 400", badPhase.status === 400);
}

async function testPhase2GateEvaluation(): Promise<void> {
  console.log("\n🔍 Gate Evaluation — Phase 2");

  // Phase 2 is now ACTIVE. Set up all 8 business plan fields.
  await request("PATCH", `/ventures/${ventureId}`, {
    solution_statement: "Automated bookkeeping powered by AI",
    target_customer: "Freelancers and small business owners",
    offer_description:
      "AI-powered bookkeeping for $29/month — save 5 hours/week",
    revenue_model: "Monthly subscription — $29/mo standard, $79/mo premium",
    distribution_channel: "Content marketing + direct outreach",
    estimated_costs: { startup: 500, monthly: 200 },
    advantage:
      "First to combine AI categorization with human CPA review at this price point",
  });

  // Create offer statement artifact
  await request("POST", `/ventures/${ventureId}/artifacts`, {
    phase_number: 2,
    type: "OFFER_STATEMENT",
    content: {
      for: "Freelancers who waste 5+ hours per week on bookkeeping",
      what: "AI-powered automated bookkeeping with CPA review",
      result: "Reclaim 5 hours/week and never miss a tax deduction",
      price: "$29/month",
    },
  });

  // Mark pricing as set (self-reported)
  await request(
    "PATCH",
    `/ventures/${ventureId}/phases/2/gate/pricing_set`,
    { satisfied: true }
  );

  // Evaluate — should pass all gates
  const eval2 = await request(
    "POST",
    `/ventures/${ventureId}/phases/2/gate`
  );
  assert(
    "Phase 2 gates all pass",
    getField(eval2.data, "data", "passed") === true
  );

  // Verify Phase 2 → COMPLETE, Phase 3 stays ACTIVE (was already unlocked)
  const phases = await request(
    "GET",
    `/ventures/${ventureId}/phases`
  );
  const phaseList = getField(phases.data, "data", "phases") as Array<
    Record<string, unknown>
  >;
  assert(
    "Phase 2 now COMPLETE",
    phaseList[1]?.status === "COMPLETE"
  );
  // Phase 3 was already force-unlocked to ACTIVE, so it should stay ACTIVE
  assert(
    "Phase 3 still ACTIVE (was force-unlocked)",
    phaseList[2]?.status === "ACTIVE"
  );
}

async function testForwardOnlyTransitions(): Promise<void> {
  console.log("\n⏩ Forward-Only Transitions");

  // Phase 1 is COMPLETE — evaluate gate shouldn't revert it
  const eval1 = await request(
    "POST",
    `/ventures/${ventureId}/phases/1/gate`
  );
  assert(
    "Phase 1 re-evaluation still passes",
    getField(eval1.data, "data", "passed") === true
  );

  // Verify Phase 1 is still COMPLETE
  const phases = await request(
    "GET",
    `/ventures/${ventureId}/phases`
  );
  const phaseList = getField(phases.data, "data", "phases") as Array<
    Record<string, unknown>
  >;
  assert(
    "Phase 1 remains COMPLETE",
    phaseList[0]?.status === "COMPLETE"
  );

  // Force-unlock on COMPLETE phase — should be a no-op (doesn't go back to ACTIVE)
  const unlockComplete = await request(
    "POST",
    `/ventures/${ventureId}/phases/1/unlock`,
    { reason: "Trying to revert completed phase" }
  );
  assert("Unlock COMPLETE phase returns 200", unlockComplete.status === 200);
  assert(
    "COMPLETE phase stays COMPLETE",
    getField(unlockComplete.data, "data", "status") === "COMPLETE"
  );
}

async function testGateEvaluationEdgeCases(): Promise<void> {
  console.log("\n🧪 Gate Evaluation Edge Cases");

  // Evaluate gate for non-existent venture
  const noVenture = await request(
    "POST",
    "/ventures/00000000-0000-0000-0000-000000000000/phases/1/gate"
  );
  assert("Non-existent venture gate eval → 404", noVenture.status === 404);

  // Invalid phase number
  const badPhase = await request(
    "POST",
    `/ventures/${ventureId}/phases/0/gate`
  );
  assert("Phase 0 gate eval → 400", badPhase.status === 400);

  const badPhase2 = await request(
    "POST",
    `/ventures/${ventureId}/phases/6/gate`
  );
  assert("Phase 6 gate eval → 400", badPhase2.status === 400);
}

// ── Test Runner ──

async function runAllTests(): Promise<void> {
  console.log("═══════════════════════════════════════════");
  console.log("  Phase B Test Suite — Phase Engine");
  console.log("═══════════════════════════════════════════");

  try {
    await setup();
    await testPhaseConfig();
    await testEnrichedPhases();
    await testGateEvaluation();
    await testSelfReportedGates();
    await testPhaseTransition();
    await testForceUnlock();
    await testPhase2GateEvaluation();
    await testForwardOnlyTransitions();
    await testGateEvaluationEdgeCases();
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

function waitForServer(retries = 20): Promise<void> {
  return new Promise((resolve, reject) => {
    const attempt = (n: number): void => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: 3001,
          path: "/health",
          method: "GET",
        },
        (res) => {
          res.resume();
          resolve();
        }
      );
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

/**
 * Phase D Test Suite — UX Features
 *
 * Tests for:
 * - Dashboard endpoint
 * - Phase preview endpoint
 * - Suggested actions endpoint
 * - Shareable artifact links (share, unshare, public access)
 * - Engagement streak tracking
 * - Error handling on all new endpoints
 *
 * Port: 5001
 */

import { IncomingMessage } from "http";
import * as http from "http";

const BASE = "http://localhost:5001";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

async function request(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  token?: string
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res: IncomingMessage) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: { _raw: raw } });
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Failed to connect to server: ${err}`));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Setup helpers ──

async function createUserAndAuth(email: string): Promise<{ userId: string; jwt: string; ventureId: string }> {
  // Create user
  const createRes = await request("POST", "/users", { email });
  const userId = (createRes.data as { data: { id: string } }).data.id;

  // Get magic link token
  const mlRes = await request("POST", "/auth/magic-link", { email });
  const devToken = ((mlRes.data as { data: { _dev_token: string } }).data)._dev_token;

  // Verify and get JWT
  const verifyRes = await request("POST", "/auth/verify", { token: devToken });
  const jwt = ((verifyRes.data as { data: { jwt: string } }).data).jwt;

  // Create venture
  const ventureRes = await request("POST", "/ventures", {}, jwt);
  const ventureId = ((ventureRes.data as { data: { id: string } }).data).id;

  // Submit intake
  await request("PUT", `/users/${userId}/intake`, {
    experience_level: 3,
    business_type: "ONLINE",
    budget: 5000,
    income_goal: 10000,
    weekly_hours: 20,
  }, jwt);

  // Name the venture
  await request("PATCH", `/ventures/${ventureId}`, { name: "Test Startup" }, jwt);

  return { userId, jwt, ventureId };
}

// ── Main Test Runner ──

async function runTests(): Promise<void> {
  console.log("\n═══════════════════════════════════════════");
  console.log("  Phase D Test Suite — UX Features");
  console.log("═══════════════════════════════════════════\n");

  // Setup
  console.log("⚙️  Setup: Creating user + venture");
  const { userId, jwt, ventureId } = await createUserAndAuth("ux-test@example.com");
  assert(!!userId, "Setup: user created");
  assert(!!ventureId, "Setup: venture created");

  // ── Dashboard Tests ──
  console.log("\n📊 Dashboard");

  const dash1 = await request("GET", `/ventures/${ventureId}/dashboard`, undefined, jwt);
  assert(dash1.status === 200, "GET /dashboard returns 200");

  const dashData = (dash1.data as { data: Record<string, unknown> }).data;
  assert(dashData.venture_id === ventureId, "Dashboard has venture_id");
  assert(dashData.venture_name === "Test Startup", "Dashboard has venture_name");
  assert(dashData.current_phase === 1, "Current phase is 1");
  assert(dashData.current_phase_name === "Discovery", "Current phase name is Discovery");

  const overallProgress = dashData.overall_progress as Record<string, unknown>;
  assert(overallProgress.phases_completed === 0, "0 phases completed initially");
  assert(overallProgress.total_phases === 5, "Total phases is 5");
  assert(overallProgress.percentage === 0, "Overall progress 0%");

  const phaseProgress = dashData.current_phase_progress as Record<string, unknown>;
  assert(phaseProgress.total_gates === 3, "Phase 1 has 3 gates");
  assert(phaseProgress.gates_satisfied === 0, "0 gates satisfied initially");

  assert(typeof dashData.artifacts_generated === "number", "Has artifacts_generated");
  assert(typeof dashData.days_active === "number", "Has days_active");
  assert(dashData.days_active >= 1, "Days active >= 1");

  const streak = dashData.streak as Record<string, unknown>;
  assert(typeof streak.current_days === "number", "Streak has current_days");

  const nextAction = dashData.next_action as Record<string, unknown>;
  assert(typeof nextAction.type === "string", "next_action has type");
  assert(typeof nextAction.message === "string", "next_action has message");

  const rateLimit = dashData.rate_limit as Record<string, unknown>;
  assert(rateLimit.messages_limit === 30, "Rate limit is 30");
  assert(typeof rateLimit.remaining_today === "number", "Has remaining_today");

  // Dashboard error handling
  const dashNoAuth = await request("GET", `/ventures/${ventureId}/dashboard`);
  assert(dashNoAuth.status === 401, "Dashboard without auth returns 401");

  const dashBadVenture = await request("GET", "/ventures/nonexistent/dashboard", undefined, jwt);
  assert(dashBadVenture.status === 404, "Dashboard for nonexistent venture returns 404");

  // ── Phase Preview Tests ──
  console.log("\n🔭 Phase Preview");

  const preview = await request("GET", `/ventures/${ventureId}/phases/preview`, undefined, jwt);
  assert(preview.status === 200, "GET /phases/preview returns 200");

  const previewPhases = ((preview.data as { data: { phases: Array<Record<string, unknown>> } }).data).phases;
  assert(previewPhases.length === 5, "Preview returns all 5 phases");

  // All phases should have name, description, core_deliverable even if locked
  const lockedPhase = previewPhases.find((p) => p.status === "LOCKED");
  assert(!!lockedPhase, "Has at least one LOCKED phase");
  assert(typeof lockedPhase!.name === "string" && (lockedPhase!.name as string).length > 0, "Locked phase has name");
  assert(typeof lockedPhase!.description === "string", "Locked phase has description");
  assert(typeof lockedPhase!.core_deliverable === "string", "Locked phase has core_deliverable");
  assert(Array.isArray(lockedPhase!.tool_recommendations), "Locked phase has tool_recommendations");

  const gateLabels = lockedPhase!.gate_labels as Array<Record<string, unknown>>;
  assert(Array.isArray(gateLabels), "Locked phase has gate_labels");
  assert(gateLabels.length > 0, "Locked phase gate_labels are populated");
  assert(typeof gateLabels[0].label === "string", "Gate label has label text");
  assert(gateLabels[0].satisfied === false, "Locked phase gates show as unsatisfied");

  // Active phase should show progress
  const activePhase = previewPhases.find((p) => p.status === "ACTIVE");
  assert(!!activePhase, "Has an ACTIVE phase");
  assert(activePhase!.started_at !== null, "Active phase has started_at");

  // Error handling
  const previewNoAuth = await request("GET", `/ventures/${ventureId}/phases/preview`);
  assert(previewNoAuth.status === 401, "Preview without auth returns 401");

  // ── Suggested Actions Tests ──
  console.log("\n💡 Suggested Actions");

  const actions = await request("GET", `/ventures/${ventureId}/suggested-actions`, undefined, jwt);
  assert(actions.status === 200, "GET /suggested-actions returns 200");

  const actionData = (actions.data as { data: { actions: Array<Record<string, unknown>>; phase_number: number } }).data;
  assert(Array.isArray(actionData.actions), "Returns actions array");
  assert(actionData.actions.length > 0, "Has at least one suggested action");
  assert(actionData.actions.length <= 3, "Has at most 3 suggested actions");
  assert(actionData.phase_number === 1, "Actions are for current phase (1)");

  const firstAction = actionData.actions[0];
  assert(typeof firstAction.type === "string", "Action has type");
  assert(typeof firstAction.message === "string", "Action has message");

  // ── Shareable Artifact Tests ──
  console.log("\n🔗 Shareable Artifacts");

  // Create an artifact first
  const artRes = await request("POST", `/ventures/${ventureId}/artifacts`, {
    phase_number: 1,
    type: "BUSINESS_PLAN",
    content: { problem: "Test problem", solution: "Test solution" },
  }, jwt);
  assert(artRes.status === 201, "Created artifact for sharing test");
  const artifactId = ((artRes.data as { data: { id: string } }).data).id;

  // Share the artifact
  const shareRes = await request("POST", `/ventures/${ventureId}/artifacts/${artifactId}/share`, {}, jwt);
  assert(shareRes.status === 200, "POST /artifacts/:aid/share returns 200");

  const shareData = (shareRes.data as { data: { public_slug: string; public_url: string } }).data;
  assert(typeof shareData.public_slug === "string", "Returns public_slug");
  assert(shareData.public_slug.length > 0, "Slug is non-empty");
  assert(shareData.public_url.startsWith("/shared/"), "Returns public_url path");

  const slug = shareData.public_slug;

  // Share again — should return same slug (idempotent)
  const shareRes2 = await request("POST", `/ventures/${ventureId}/artifacts/${artifactId}/share`, {}, jwt);
  const slug2 = ((shareRes2.data as { data: { public_slug: string } }).data).public_slug;
  assert(slug2 === slug, "Re-sharing returns same slug (idempotent)");

  // Access the public artifact (NO auth)
  const publicRes = await request("GET", `/shared/${slug}`);
  assert(publicRes.status === 200, "GET /shared/:slug returns 200 (no auth)");

  const publicData = (publicRes.data as { data: { artifact: Record<string, unknown>; venture_name: string; phase_name: string } }).data;
  assert(publicData.artifact !== undefined, "Public response has artifact");
  assert(publicData.venture_name === "Test Startup", "Public response includes venture name");
  assert(publicData.phase_name === "Discovery", "Public response includes phase name");

  const pubArtifact = publicData.artifact;
  assert(pubArtifact.type === "BUSINESS_PLAN", "Public artifact has correct type");
  assert(typeof pubArtifact.content === "object", "Public artifact has content");
  // Ensure venture_id is NOT exposed publicly
  assert(!("venture_id" in pubArtifact), "Public artifact does NOT expose venture_id");

  // Non-existent slug
  const badSlug = await request("GET", "/shared/nonexistent99");
  assert(badSlug.status === 404, "Non-existent slug returns 404");

  // Invalid slug
  const invalidSlug = await request("GET", "/shared/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  assert(invalidSlug.status === 400, "Overly long slug returns 400");

  // Unshare the artifact
  const unshareRes = await request("DELETE", `/ventures/${ventureId}/artifacts/${artifactId}/share`, undefined, jwt);
  assert(unshareRes.status === 200, "DELETE /artifacts/:aid/share returns 200");

  const unshareData = (unshareRes.data as { data: { revoked: boolean } }).data;
  assert(unshareData.revoked === true, "Response confirms revocation");

  // Previously public artifact should now 404
  const revokedRes = await request("GET", `/shared/${slug}`);
  assert(revokedRes.status === 404, "Revoked slug returns 404");

  // Share error handling
  const shareNoAuth = await request("POST", `/ventures/${ventureId}/artifacts/${artifactId}/share`);
  assert(shareNoAuth.status === 401, "Share without auth returns 401");

  const shareBadArtifact = await request("POST", `/ventures/${ventureId}/artifacts/nonexistent/share`, {}, jwt);
  assert(shareBadArtifact.status === 404, "Share nonexistent artifact returns 404");

  // ── Cross-user isolation ──
  console.log("\n🔒 Cross-User Isolation");

  const user2 = await createUserAndAuth("ux-test-2@example.com");

  const dashCross = await request("GET", `/ventures/${ventureId}/dashboard`, undefined, user2.jwt);
  assert(dashCross.status === 403, "Cannot access other user's dashboard");

  const previewCross = await request("GET", `/ventures/${ventureId}/phases/preview`, undefined, user2.jwt);
  assert(previewCross.status === 403, "Cannot access other user's phase preview");

  const actionsCross = await request("GET", `/ventures/${ventureId}/suggested-actions`, undefined, user2.jwt);
  assert(actionsCross.status === 403, "Cannot access other user's suggested actions");

  const shareCross = await request("POST", `/ventures/${ventureId}/artifacts/${artifactId}/share`, {}, user2.jwt);
  assert(shareCross.status === 403, "Cannot share other user's artifact");

  // ── Dashboard After Activity ──
  console.log("\n📈 Dashboard After Activity");

  // Chat to generate some activity (engagement tracking)
  await request("POST", `/ventures/${ventureId}/chat`, {
    message: "Help me validate my idea",
    phase_number: 1,
  }, jwt);

  const dash2 = await request("GET", `/ventures/${ventureId}/dashboard`, undefined, jwt);
  const dash2Data = (dash2.data as { data: Record<string, unknown> }).data;
  const dash2Rate = dash2Data.rate_limit as Record<string, unknown>;
  assert((dash2Rate.remaining_today as number) < 30, "Rate limit reflects chat usage");

  // ── Summary ──
  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});

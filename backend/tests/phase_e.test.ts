/**
 * Phase E Test Suite — Anonymous Trial Chat + Multi-Venture + Rate Limit 30
 *
 * Tests for:
 * - Anonymous trial session creation
 * - Anonymous trial chat (3-message limit)
 * - Trial session status endpoint
 * - Trial session claiming after sign-up
 * - Multi-venture support (create up to 3)
 * - List user ventures endpoint
 * - Rate limit at 30/day
 * - Error handling on all new endpoints
 *
 * Port: 6001
 */

import { IncomingMessage } from "http";
import * as http from "http";

const BASE = "http://localhost:6001";

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

async function createUserAndAuth(email: string): Promise<{ userId: string; jwt: string }> {
  const createRes = await request("POST", "/users", { email });
  const userId = ((createRes.data as { data: { id: string } }).data).id;
  const mlRes = await request("POST", "/auth/magic-link", { email });
  const devToken = ((mlRes.data as { data: { _dev_token: string } }).data)._dev_token;
  const verifyRes = await request("POST", "/auth/verify", { token: devToken });
  const jwt = ((verifyRes.data as { data: { jwt: string } }).data).jwt;
  return { userId, jwt };
}

// ── Main Tests ──

async function runTests(): Promise<void> {
  console.log("\n═══════════════════════════════════════════");
  console.log("  Phase E Test Suite — Trial Chat + Multi-Venture");
  console.log("═══════════════════════════════════════════\n");

  // ── Anonymous Trial Session ──
  console.log("🆓 Anonymous Trial Session");

  // Create session (no auth)
  const sessionRes = await request("POST", "/trial/session");
  assert(sessionRes.status === 201, "POST /trial/session returns 201 (no auth)");

  const sessionData = (sessionRes.data as { data: { session_token: string; messages_limit: number; messages_remaining: number } }).data;
  assert(typeof sessionData.session_token === "string", "Returns session_token");
  assert(sessionData.session_token.length > 0, "Token is non-empty");
  assert(sessionData.messages_limit === 3, "Limit is 3");
  assert(sessionData.messages_remaining === 3, "3 remaining initially");

  const token = sessionData.session_token;

  // Get status (no auth)
  const statusRes = await request("GET", `/trial/session/${token}`);
  assert(statusRes.status === 200, "GET /trial/session/:token returns 200");
  const statusData = (statusRes.data as { data: Record<string, unknown> }).data;
  assert(statusData.messages_used === 0, "0 messages used initially");
  assert(statusData.messages_limit === 3, "Status shows limit of 3");
  assert(statusData.remaining === 3, "Status shows 3 remaining");
  assert(Array.isArray(statusData.messages), "Status has messages array");
  assert((statusData.messages as unknown[]).length === 0, "No messages initially");
  assert(statusData.claimed === false, "Not claimed initially");

  // ── Trial Chat ──
  console.log("\n💬 Trial Chat (3-message limit)");

  // Message 1
  const chat1 = await request("POST", "/trial/chat", {
    session_token: token,
    message: "I have an idea for a dog walking app",
  });
  assert(chat1.status === 200, "First trial chat returns 200");
  const chat1Data = (chat1.data as { data: Record<string, unknown> }).data;
  assert(typeof chat1Data.reply === "string", "Has reply");
  assert((chat1Data.reply as string).length > 10, "Reply is substantive");
  assert(chat1Data.messages_used === 1, "1 message used");
  assert(chat1Data.remaining === 2, "2 remaining");
  assert(chat1Data.session_token === token, "Returns same session token");

  // Message 2
  const chat2 = await request("POST", "/trial/chat", {
    session_token: token,
    message: "How do I know if people would pay for it?",
  });
  assert(chat2.status === 200, "Second trial chat returns 200");
  const chat2Data = (chat2.data as { data: Record<string, unknown> }).data;
  assert(chat2Data.messages_used === 2, "2 messages used");
  assert(chat2Data.remaining === 1, "1 remaining");

  // Message 3 (last free message)
  const chat3 = await request("POST", "/trial/chat", {
    session_token: token,
    message: "What should I charge?",
  });
  assert(chat3.status === 200, "Third (final) trial chat returns 200");
  const chat3Data = (chat3.data as { data: Record<string, unknown> }).data;
  assert(chat3Data.messages_used === 3, "3 messages used");
  assert(chat3Data.remaining === 0, "0 remaining");

  // Message 4 — should be rate limited
  const chat4 = await request("POST", "/trial/chat", {
    session_token: token,
    message: "One more question...",
  });
  assert(chat4.status === 429, "4th trial message returns 429");
  assert(((chat4.data as { error: { code: string } }).error).code === "RATE_LIMITED", "Error code is RATE_LIMITED");

  // Verify status reflects usage
  const status2 = await request("GET", `/trial/session/${token}`);
  const status2Data = (status2.data as { data: Record<string, unknown> }).data;
  assert(status2Data.messages_used === 3, "Status shows 3 used");
  assert(status2Data.remaining === 0, "Status shows 0 remaining");
  assert((status2Data.messages as unknown[]).length === 6, "Has 6 messages (3 user + 3 assistant)");

  // ── Trial Chat Validation ──
  console.log("\n🚫 Trial Chat Validation");

  const noToken = await request("POST", "/trial/chat", { message: "hi" });
  assert(noToken.status === 400, "Missing session_token → 400");

  const noMsg = await request("POST", "/trial/chat", { session_token: token });
  assert(noMsg.status === 400, "Missing message → 400");

  const badToken = await request("POST", "/trial/chat", {
    session_token: "nonexistent_token_xyz",
    message: "hi",
  });
  assert(badToken.status === 404, "Invalid session_token → 404");

  const longMsg = await request("POST", "/trial/chat", {
    session_token: token,
    message: "x".repeat(2001),
  });
  assert(longMsg.status === 400, "Message >2000 chars → 400");

  const badStatus = await request("GET", "/trial/session/nonexistent_token");
  assert(badStatus.status === 404, "Non-existent session status → 404");

  // ── Trial Session Claiming ──
  console.log("\n🔗 Trial Session Claiming");

  const { userId, jwt } = await createUserAndAuth("trial-claim@example.com");

  // Claim requires auth
  const claimNoAuth = await request("POST", "/trial/claim", { session_token: token });
  assert(claimNoAuth.status === 401, "Claim without auth → 401");

  // Claim with auth
  const claimRes = await request("POST", "/trial/claim", { session_token: token }, jwt);
  assert(claimRes.status === 200, "POST /trial/claim returns 200");
  const claimData = (claimRes.data as { data: { claimed: boolean; user_id: string } }).data;
  assert(claimData.claimed === true, "Response confirms claimed");
  assert(claimData.user_id === userId, "Claimed by correct user");

  // Verify session is now marked as claimed
  const status3 = await request("GET", `/trial/session/${token}`);
  const status3Data = (status3.data as { data: Record<string, unknown> }).data;
  assert(status3Data.claimed === true, "Session shows as claimed");

  // Trying to chat on claimed session → error
  // First create a fresh session to test claiming prevents further trial use
  const freshSession = await request("POST", "/trial/session");
  const freshToken = ((freshSession.data as { data: { session_token: string } }).data).session_token;
  // Use 1 message
  await request("POST", "/trial/chat", { session_token: freshToken, message: "test" });
  // Claim it
  await request("POST", "/trial/claim", { session_token: freshToken }, jwt);
  // Try to chat again on claimed session
  const chatClaimed = await request("POST", "/trial/chat", {
    session_token: freshToken,
    message: "should fail",
  });
  assert(chatClaimed.status === 400, "Chat on claimed session → 400");

  // Claim non-existent session
  const claimBad = await request("POST", "/trial/claim", { session_token: "nonexistent" }, jwt);
  assert(claimBad.status === 404, "Claim non-existent session → 404");

  // Missing session_token in claim body
  const claimNoToken = await request("POST", "/trial/claim", {}, jwt);
  assert(claimNoToken.status === 400, "Claim without token → 400");

  // ── Multi-Venture ──
  console.log("\n🚀 Multi-Venture Support");

  const mvUser = await createUserAndAuth("multi-venture@example.com");

  // Create venture 1
  const v1 = await request("POST", "/ventures", {}, mvUser.jwt);
  assert(v1.status === 201, "Venture 1 created (201)");
  const v1Id = ((v1.data as { data: { id: string } }).data).id;

  // Create venture 2
  const v2 = await request("POST", "/ventures", {}, mvUser.jwt);
  assert(v2.status === 201, "Venture 2 created (201)");
  const v2Id = ((v2.data as { data: { id: string } }).data).id;
  assert(v2Id !== v1Id, "Venture 2 has different ID");

  // Create venture 3
  const v3 = await request("POST", "/ventures", {}, mvUser.jwt);
  assert(v3.status === 201, "Venture 3 created (201)");

  // Create venture 4 — should fail
  const v4 = await request("POST", "/ventures", {}, mvUser.jwt);
  assert(v4.status === 409, "Venture 4 returns 409 (3-venture limit)");

  // Each venture is independent
  const getV1 = await request("GET", `/ventures/${v1Id}`, undefined, mvUser.jwt);
  const getV2 = await request("GET", `/ventures/${v2Id}`, undefined, mvUser.jwt);
  assert(getV1.status === 200, "Can GET venture 1");
  assert(getV2.status === 200, "Can GET venture 2");

  // Each venture has its own phases
  const v1Phases = ((getV1.data as { data: { phases: unknown[] } }).data).phases;
  const v2Phases = ((getV2.data as { data: { phases: unknown[] } }).data).phases;
  assert(v1Phases.length === 5, "Venture 1 has 5 phases");
  assert(v2Phases.length === 5, "Venture 2 has 5 phases");

  // ── List User Ventures ──
  console.log("\n📋 List User Ventures");

  const listRes = await request("GET", `/users/${mvUser.userId}/ventures`, undefined, mvUser.jwt);
  assert(listRes.status === 200, "GET /users/:id/ventures returns 200");
  const listData = (listRes.data as { data: { ventures: unknown[]; limit: number } }).data;
  assert(Array.isArray(listData.ventures), "Returns ventures array");
  assert(listData.ventures.length === 3, "Has 3 ventures");
  assert(listData.limit === 3, "Shows limit of 3");

  // Cannot list another user's ventures
  const otherUser = await createUserAndAuth("other-user@example.com");
  const crossList = await request("GET", `/users/${mvUser.userId}/ventures`, undefined, otherUser.jwt);
  assert(crossList.status === 403, "Cannot list another user's ventures (403)");

  // ── Rate Limit Verification (30/day) ──
  console.log("\n⏱️  Rate Limit = 30/day");

  // Create a venture for rate limit testing
  const rlVenture = await request("POST", "/ventures", {}, otherUser.jwt);
  const rlVentureId = ((rlVenture.data as { data: { id: string } }).data).id;

  const rlStatus = await request("GET", `/ventures/${rlVentureId}/rate-limit`, undefined, otherUser.jwt);
  const rlData = (rlStatus.data as { data: Record<string, unknown> }).data;
  assert(rlData.messages_limit === 30, "Rate limit is 30/day");
  assert(rlData.remaining_today === 30, "30 remaining for fresh venture");

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

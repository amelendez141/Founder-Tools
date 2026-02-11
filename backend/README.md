# Entrepreneurial Toolkit — QA Handoff Package

**Version:** 1.0.0-rc1 (Phases A–C complete)
**Date:** February 10, 2026
**Tests:** 196 passing (64 + 65 + 67), 0 failing

---

## Quick Start

```bash
# Install dependencies
npm install

# Build (TypeScript strict mode)
npm run build

# Start server (port 3000 default)
npm start

# Or dev mode (no build step)
npm run dev

# Run tests
npm run test:a    # Phase A: Foundation (port 3001)
npm run test:b    # Phase B: Phase Engine (port 3001)
npm run test:c    # Phase C: AI Copilot (port 4001)
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `ANTHROPIC_API_KEY` | No | — | Enables live LLM. Without it, mock responses are used. |

---

## What's Implemented (Phases A–C)

### Phase A — Foundation
- Magic link auth (send → verify → JWT)
- User CRUD + 5-variable intake form
- Venture CRUD (one per user, V1)
- PostgreSQL-compatible schema (SQLite for dev) — all 5 data models
- Consistent error envelope on every endpoint
- CORS middleware

### Phase B — Phase Engine
- Phase config table (DB-driven, not hardcoded) with guide content + tool recommendations
- 10 original sections → 5 logical phases (Discovery, Planning, Formation, Launch, Scale)
- Gate evaluation engine — auto-computed + self-reported criteria per phase
- State machine: LOCKED → ACTIVE → COMPLETE (forward-only)
- Auto-unlock of next phase on completion
- Admin force-unlock endpoint
- Phase 5 loops (never completes)

### Phase C — AI Copilot
- 6-layer prompt assembly (persona, user context, venture state, phase constraints, artifact summaries, conversation history)
- Chat endpoint (Haiku model) scoped to current phase
- Artifact generation (Sonnet model) — BUSINESS_PLAN, OFFER_STATEMENT, GTM_PLAN, GROWTH_PLAN
- Conversation persistence per venture per phase with sliding window
- Rate limiting: 20 messages/day, artifact generation = 3 units
- LLM retry with exponential backoff, timeout handling, graceful degradation
- Mock LLM provider for testing without API key

---

## API Endpoint Catalog

### Auth & Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Create user (409 on duplicate) |
| GET | `/users/:id` | Get user |
| PUT | `/users/:id/intake` | Submit intake form |
| POST | `/auth/magic-link` | Send magic link token |
| POST | `/auth/verify` | Verify token → JWT |

### Ventures
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ventures` | Create venture (409 if exists) |
| GET | `/ventures/:id` | Get venture + phases + artifact count |
| PATCH | `/ventures/:id` | Partial update venture fields |

### Phases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ventures/:id/phases` | List all phases |
| GET | `/ventures/:id/phases/enriched` | Phases + config (guide, tools) |
| POST | `/ventures/:id/phases/:num/gate` | Evaluate gate criteria |
| POST | `/ventures/:id/phases/:num/unlock` | Admin force-unlock |
| PATCH | `/ventures/:id/phases/:num/gate/:key` | Update self-reported gate |

### Artifacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ventures/:id/artifacts` | List (filter: `?phase=N&type=X`) |
| POST | `/ventures/:id/artifacts` | Create artifact |
| PUT | `/ventures/:id/artifacts/:aid` | Update (version increments) |

### AI Copilot
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ventures/:id/chat` | Send chat message |
| GET | `/ventures/:id/chat/history` | Get history (filter: `?phase=N`) |
| POST | `/ventures/:id/generate/:type` | Generate artifact via AI |
| GET | `/ventures/:id/rate-limit` | Check rate limit status |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/phases/config` | All phase configurations |
| GET | `/phases/config/:num` | Single phase config |
| GET | `/health` | Health check |

### Error Envelope (all errors)
```json
{
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | UNAUTHORIZED | RATE_LIMITED | LLM_UNAVAILABLE | CONFLICT | INTERNAL",
    "message": "Human-readable description",
    "details": {}
  }
}
```

---

## Project Structure

```
src/
├── config/
│   └── phase-seed.ts          # Phase definitions + guide content (5 phases)
├── routes/
│   ├── ai.routes.ts           # Chat, generate, rate-limit endpoints
│   ├── phase.routes.ts        # Gate eval, unlock, config endpoints
│   ├── user.routes.ts         # User CRUD + auth endpoints
│   └── venture.routes.ts      # Venture CRUD + artifact endpoints
├── services/
│   ├── ai-copilot.service.ts  # Orchestrates LLM, conversations, rate limits
│   ├── llm.provider.ts        # Anthropic API + mock fallback
│   ├── phase.service.ts       # Gate evaluation, state machine, config
│   ├── prompt.service.ts      # 6-layer prompt assembly
│   ├── user.service.ts        # User + magic link token management
│   └── venture.service.ts     # Venture + artifact + phase CRUD
├── utils/
│   ├── database.ts            # SQLite wrapper (Python bridge)
│   ├── http.ts                # Router, request/response helpers
│   ├── schema.ts              # DB schema initialization
│   └── validation.ts          # Input validation + error types
├── types.ts                   # All TypeScript interfaces + enums
└── server.ts                  # HTTP server + route registration

tests/
├── phase_a.test.ts            # 64 tests — Foundation
├── phase_b.test.ts            # 65 tests — Phase Engine
└── phase_c.test.ts            # 67 tests — AI Copilot
```

---

## QA Notes

### What to test manually
1. **Full user journey**: Create user → intake → venture → Phase 1 chat → generate artifacts → complete gates → auto-unlock Phase 2
2. **Rate limiting boundary**: Send exactly 20 messages, verify 21st is rejected with 429
3. **Artifact generation quality** (with API key): Verify generated business plans, offer statements, GTM plans, and growth plans contain venture-specific content
4. **Phase gate auto-evaluation**: Populate venture fields + create artifacts, trigger gate eval, verify auto-computed gates update correctly
5. **Forward-only transitions**: Verify completed phases cannot revert to ACTIVE

### What is NOT implemented (Phase D + E)
- Inactivity email nudges
- Progress dashboard endpoint
- Artifact export (PDF/Markdown)
- Tool recommendation engine
- Legal disclaimer interstitials
- Event tracking / analytics
- Upsell hooks / waitlist capture

### Known limitations
- SQLite via Python bridge (production should use proper driver)
- Auth returns dev-mode JWT (`dev-jwt-{userId}`), not real JWT signing
- No admin role verification on force-unlock (trusts caller)
- Mock LLM returns static responses — switch to live with `ANTHROPIC_API_KEY`
- Test suites use hardcoded ports (A/B: 3001, C: 4001)

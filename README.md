# Founder Toolkit

An AI-powered entrepreneurship coaching platform that guides first-time founders through a 5-phase journey from idea to scale.

## Features

- **5-Phase Journey**: Discovery, Planning, Formation, Launch, Scale
- **AI Copilot**: Chat with an AI coach for guidance and questions
- **Artifact Generation**: Auto-generate business plans, offer statements, GTM plans
- **Progress Tracking**: Gate-based progression with milestones
- **Trial Experience**: 3-message anonymous trial before signup
- **Multi-Venture Support**: Up to 3 ventures per user

## Tech Stack

### Backend
- Node.js 22+ with TypeScript
- SQLite with WAL mode (via node:sqlite)
- JWT authentication with magic links
- Native fetch for Anthropic API

### Frontend
- Next.js 14 (App Router)
- Tailwind CSS
- TanStack Query for data fetching
- Zustand for client state

## Project Structure

```
Founder-Tools/
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── config/    # Environment config
│   │   ├── infrastructure/  # Logging, shutdown
│   │   ├── middleware/      # Request ID
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   └── utils/     # Database, auth, validation
│   └── tests/         # 325 tests across 5 phases
│
├── frontend/          # Next.js web app
│   ├── app/           # Pages (App Router)
│   ├── components/    # React components
│   └── lib/           # API client, stores, hooks
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 22 or higher
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings (optional: add ANTHROPIC_API_KEY for live AI)

# Build and start
npm run build
npm start

# Or run in dev mode
npm run dev
```

The API will be available at http://localhost:3000

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Start development server
npm run dev
```

The app will be available at http://localhost:3000

### Running Tests

```bash
cd backend

# Run all tests (325 tests)
npm test

# Run specific phase tests
npm run test:a  # Foundation tests
npm run test:b  # Phase engine tests
npm run test:c  # AI copilot tests
npm run test:d  # UX feature tests
npm run test:e  # Trial + multi-venture tests
```

## API Endpoints

### Authentication
- `POST /users` - Create user
- `POST /auth/magic-link` - Send magic link
- `POST /auth/verify` - Verify token, get JWT

### Ventures
- `POST /ventures` - Create venture (max 3)
- `GET /ventures/:id` - Get venture
- `PATCH /ventures/:id` - Update venture
- `GET /users/:id/ventures` - List user ventures

### Phases
- `GET /ventures/:id/phases/enriched` - Get phases with config
- `POST /ventures/:id/phases/:num/gate` - Evaluate gate
- `PATCH /ventures/:id/phases/:num/gate/:key` - Update gate

### AI Copilot
- `POST /ventures/:id/chat` - Send message (1 unit)
- `GET /ventures/:id/chat/history` - Get history
- `POST /ventures/:id/generate/:type` - Generate artifact (3 units)
- `GET /ventures/:id/rate-limit` - Check limit (30/day)

### Trial
- `POST /trial/session` - Create anonymous session
- `POST /trial/chat` - Trial chat (3 max)
- `POST /trial/claim` - Claim session after signup

### UX Features
- `GET /ventures/:id/dashboard` - Aggregated metrics
- `GET /ventures/:id/suggested-actions` - Smart nudges
- `POST /ventures/:id/artifacts/:aid/share` - Share artifact
- `GET /shared/:slug` - View public artifact

## Environment Variables

### Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NODE_ENV | No | development | Environment mode |
| PORT | No | 3000 | Server port |
| JWT_SECRET | Production | auto-generated | JWT signing key |
| RESEND_API_KEY | No | - | Email provider key |
| ANTHROPIC_API_KEY | No | - | AI provider key |
| CORS_ORIGINS | No | localhost:3000,5173 | Allowed origins |

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NEXT_PUBLIC_API_URL | No | http://localhost:3000 | Backend API URL |

## License

MIT

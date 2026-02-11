import { createHash } from "crypto";
import type { User, Venture, Artifact, GateCriterion, ChatMessage } from "../types";

/**
 * Prompt Assembly — 6 layers per architecture §8.1.
 *
 * Layer 1: Base Persona (~500 tokens)
 * Layer 2: User Context (~150 tokens)
 * Layer 3: Venture State (~250 tokens)
 * Layer 4: Phase Constraint (~300 tokens)
 * Layer 5: Artifact Summaries (~1000 tokens, capped)
 * Layer 6: Conversation History (~5000 tokens, sliding window)
 *
 * Total budget: ~7,200 tokens for context + ~800 for user message and response.
 */

// ── Token estimation (conservative: 1 token ≈ 4 chars) ──

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}

// ── Layer 1: Base Persona ──

function buildBasePersona(): string {
  return `You are an experienced entrepreneurial advisor and co-pilot embedded in the Beginner Entrepreneurial Toolkit. Your role is to guide first-time entrepreneurs through the process of building a real business.

Core behaviors:
- Be encouraging but honest. Never give false reassurance.
- Give specific, actionable advice. Avoid generic motivation.
- Use plain language. The user may have zero business experience.
- When the user asks about legal or financial matters, provide educational information but always include a disclaimer that they should consult a qualified professional.
- Focus on progress over perfection. Help them take the next step, not plan the perfect journey.
- Reference their specific venture details when giving advice.
- Keep responses concise and focused. Aim for 150-300 words unless the user asks for more detail.`;
}

// ── Layer 2: User Context ──

function buildUserContext(user: User): string {
  const parts: string[] = ["User profile:"];

  if (user.experience_level !== null) {
    const level = user.experience_level <= 3 ? "beginner" :
                  user.experience_level <= 6 ? "some experience" : "experienced";
    parts.push(`- Experience level: ${user.experience_level}/10 (${level})`);
  }
  if (user.business_type) {
    parts.push(`- Business type: ${user.business_type}`);
  }
  if (user.budget !== null) {
    parts.push(`- Starting budget: $${user.budget}`);
  }
  if (user.income_goal !== null) {
    parts.push(`- Monthly income goal: $${user.income_goal}`);
  }
  if (user.weekly_hours !== null) {
    parts.push(`- Weekly hours available: ${user.weekly_hours}`);
  }

  return parts.join("\n");
}

// ── Layer 3: Venture State ──

function buildVentureState(venture: Venture): string {
  const parts: string[] = ["Current venture state:"];

  if (venture.name) parts.push(`- Name: ${venture.name}`);
  if (venture.problem_statement) parts.push(`- Problem: ${venture.problem_statement}`);
  if (venture.solution_statement) parts.push(`- Solution: ${venture.solution_statement}`);
  if (venture.target_customer) parts.push(`- Target customer: ${venture.target_customer}`);
  if (venture.offer_description) parts.push(`- Offer: ${venture.offer_description}`);
  if (venture.revenue_model) parts.push(`- Revenue model: ${venture.revenue_model}`);
  if (venture.distribution_channel) parts.push(`- Distribution: ${venture.distribution_channel}`);
  if (venture.estimated_costs) {
    parts.push(`- Estimated costs: $${venture.estimated_costs.startup} startup, $${venture.estimated_costs.monthly}/month`);
  }
  if (venture.advantage) parts.push(`- Advantage: ${venture.advantage}`);
  if (venture.entity_type !== "NONE") parts.push(`- Entity type: ${venture.entity_type}`);
  if (venture.entity_state) parts.push(`- Entity state: ${venture.entity_state}`);
  if (venture.ein_obtained) parts.push(`- EIN: obtained`);
  if (venture.bank_account_opened) parts.push(`- Bank account: opened`);

  if (parts.length === 1) {
    parts.push("- No venture details populated yet.");
  }

  return parts.join("\n");
}

// ── Layer 4: Phase Constraint ──

const PHASE_NAMES: Record<number, string> = {
  1: "Discovery",
  2: "Planning",
  3: "Formation",
  4: "Launch",
  5: "Scale",
};

function buildPhaseConstraint(
  phaseNumber: number,
  gateCriteria: GateCriterion[]
): string {
  const phaseName = PHASE_NAMES[phaseNumber] ?? `Phase ${phaseNumber}`;

  const unsatisfied = gateCriteria.filter((g) => !g.satisfied);
  const satisfied = gateCriteria.filter((g) => g.satisfied);

  const parts: string[] = [
    `The user is currently in Phase ${phaseNumber}: ${phaseName}.`,
    "",
  ];

  if (satisfied.length > 0) {
    parts.push("Completed gates:");
    for (const g of satisfied) {
      parts.push(`  ✓ ${g.label}`);
    }
    parts.push("");
  }

  if (unsatisfied.length > 0) {
    parts.push("Remaining gates to complete:");
    for (const g of unsatisfied) {
      parts.push(`  ☐ ${g.label}`);
    }
    parts.push("");
  }

  parts.push(
    `IMPORTANT CONSTRAINTS:`,
    `- Help the user complete the remaining gates for Phase ${phaseNumber}.`,
    `- Do NOT discuss topics from phases beyond Phase ${Math.min(phaseNumber + 1, 5)} unless the user specifically asks.`,
    `- Do NOT overwhelm the user with future steps. Focus on what they need to do RIGHT NOW.`,
    `- If all gates are satisfied, congratulate them and explain what happens next.`
  );

  return parts.join("\n");
}

// ── Layer 5: Artifact Summaries ──

function buildArtifactSummaries(artifacts: Artifact[]): string {
  if (artifacts.length === 0) {
    return "No artifacts generated yet.";
  }

  const MAX_TOKENS = 1000;
  const parts: string[] = ["Previously generated artifacts:"];
  let currentTokens = estimateTokens(parts[0]);

  // Sort by phase, then creation time
  const sorted = [...artifacts].sort((a, b) => {
    if (a.phase_number !== b.phase_number) return a.phase_number - b.phase_number;
    return a.created_at.localeCompare(b.created_at);
  });

  for (const artifact of sorted) {
    const contentStr = JSON.stringify(artifact.content);
    const summary = `- [Phase ${artifact.phase_number}] ${artifact.type} (v${artifact.version}): ${truncateToTokens(contentStr, 150)}`;
    const summaryTokens = estimateTokens(summary);

    if (currentTokens + summaryTokens > MAX_TOKENS) {
      parts.push(`... and ${sorted.length - parts.length + 1} more artifacts (truncated for context budget)`);
      break;
    }

    parts.push(summary);
    currentTokens += summaryTokens;
  }

  return parts.join("\n");
}

// ── Layer 6: Conversation History (sliding window) ──

function buildConversationHistory(messages: ChatMessage[]): ChatMessage[] {
  const MAX_TOKENS = 5000;
  let totalTokens = 0;
  const result: ChatMessage[] = [];

  // Work backwards from most recent
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const tokens = estimateTokens(msg.content);
    if (totalTokens + tokens > MAX_TOKENS && result.length > 0) {
      break;
    }
    totalTokens += tokens;
    result.unshift(msg);
  }

  return result;
}

// ── Public API ──

export interface AssembledPrompt {
  systemPrompt: string;
  systemPromptHash: string;
  conversationHistory: ChatMessage[];
}

export function assemblePrompt(
  user: User,
  venture: Venture,
  phaseNumber: number,
  gateCriteria: GateCriterion[],
  artifacts: Artifact[],
  conversationMessages: ChatMessage[]
): AssembledPrompt {
  const layers = [
    buildBasePersona(),
    buildUserContext(user),
    buildVentureState(venture),
    buildPhaseConstraint(phaseNumber, gateCriteria),
    buildArtifactSummaries(artifacts),
  ];

  const systemPrompt = layers.join("\n\n---\n\n");
  const systemPromptHash = createHash("sha256").update(systemPrompt).digest("hex");
  const conversationHistory = buildConversationHistory(conversationMessages);

  return {
    systemPrompt,
    systemPromptHash,
    conversationHistory,
  };
}

// ── Artifact Generation Prompts ──

export function buildArtifactGenerationPrompt(
  type: string,
  venture: Venture,
  user: User
): string {
  const baseContext = [
    buildUserContext(user),
    buildVentureState(venture),
  ].join("\n\n");

  switch (type) {
    case "BUSINESS_PLAN":
      return `${baseContext}

Generate a structured 1-page business plan as a JSON object with these fields:
- problem: The problem being solved (2-3 sentences)
- solution: The proposed solution (2-3 sentences)
- target_customer: Who the ideal customer is (2-3 sentences)
- value_proposition: The unique value offered (2-3 sentences)
- revenue_model: How the business makes money (2-3 sentences)
- distribution_channels: How to reach customers (list 2-3 channels)
- cost_structure: Startup and ongoing costs breakdown
- competitive_advantage: What makes this different (2-3 sentences)
- key_metrics: 3-5 metrics to track success
- next_steps: 3 immediate action items

Base this on the user's venture details. If fields are missing, make reasonable assumptions based on their business type and budget. Be specific and actionable, not generic.

Respond ONLY with a valid JSON object. No markdown, no explanation.`;

    case "OFFER_STATEMENT":
      return `${baseContext}

Generate a compelling offer statement as a JSON object with these fields:
- headline: A clear, benefit-driven headline (under 15 words)
- for_who: Specific description of the target customer
- problem: The specific pain point addressed
- solution: What the customer gets
- transformation: The result/outcome they can expect
- price_point: Suggested pricing with rationale
- guarantee: Suggested risk-reversal (money-back, free trial, etc.)
- social_proof_strategy: How to build credibility before having customers

Be specific to the user's venture. Avoid generic marketing language.

Respond ONLY with a valid JSON object. No markdown, no explanation.`;

    case "GTM_PLAN":
      return `${baseContext}

Generate a go-to-market plan as a JSON object with these fields:
- primary_channel: The single best distribution channel and why
- first_10_customers: Specific strategy to get the first 10 customers
- messaging: Key messages for each customer segment
- launch_timeline: Week-by-week plan for the first 4 weeks
- budget_allocation: How to allocate the available budget
- metrics: 3 key metrics to track during launch
- contingency: What to do if the primary channel doesn't work

Tailor this to the user's budget, business type, and target customer. Be brutally specific — no generic advice.

Respond ONLY with a valid JSON object. No markdown, no explanation.`;

    case "GROWTH_PLAN":
      return `${baseContext}

Generate a 90-day growth plan as a JSON object with these fields:
- current_state: Summary of where the business is now
- goals: Array of 3 specific goals, each with { metric, current, target, weekly_actions[] }
- systems_to_build: 3 systems/processes to create for repeatability
- ai_integrations: 3 specific ways to use AI in their workflow
- weekly_review_checklist: 5 items to check every week
- monthly_milestones: What to achieve by month 1, 2, and 3
- risks: Top 3 risks and mitigation strategies

This plan should build on their existing customers and revenue. Focus on systems that scale without proportional time investment.

Respond ONLY with a valid JSON object. No markdown, no explanation.`;

    default:
      return `${baseContext}

Generate a structured deliverable of type "${type}" as a JSON object with relevant fields for this type of document. Base the content on the user's venture details. Be specific and actionable.

Respond ONLY with a valid JSON object. No markdown, no explanation.`;
  }
}

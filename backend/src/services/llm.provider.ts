/**
 * LLM Provider — the ONLY module that calls the LLM API.
 * Per architecture §8: AI-Copilot service is the ONLY service that touches LLM APIs.
 *
 * ANTHROPIC_API_KEY set → real API calls via native fetch (no subprocess).
 * Unset → deterministic mock responses (dev/test).
 *
 * Fixes applied:
 * - SCALE-2: Uses native fetch instead of execSync + Python subprocess
 * - SEC-5: API key never written to disk
 *
 * Model routing per §8.2:
 *   Chat → claude-haiku  (fast, cheap)
 *   Artifact generation → claude-sonnet (higher quality)
 */

export type LLMModel = "haiku" | "sonnet";

export interface LLMRequest {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model: LLMModel;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  tokens_used: number;
  model: string;
  mock: boolean;
}

const MODEL_MAP: Record<LLMModel, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5-20250929",
};

const MAX_RETRIES = 2;
const TIMEOUT_MS = 30000;

export class LLMProvider {
  private apiKey: string | null;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY ?? null;
    if (this.apiKey) {
      console.log("[LLM] Anthropic API key detected — live mode");
    } else {
      console.log("[LLM] No API key — mock mode");
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      return this.mockComplete(request);
    }
    return this.apiComplete(request);
  }

  isLive(): boolean {
    return this.apiKey !== null;
  }

  // ── Real API via native fetch ──

  private async apiComplete(request: LLMRequest): Promise<LLMResponse> {
    const modelId = MODEL_MAP[request.model];
    const maxTokens = request.maxTokens ?? 2048;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.callAPI(modelId, request.systemPrompt, request.messages, maxTokens);
        return {
          content: result.content,
          tokens_used: result.inputTokens + result.outputTokens,
          model: modelId,
          mock: false,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const msg = lastError.message;
        if (msg.includes("401") || msg.includes("400")) {
          throw new Error(`LLM_AUTH_ERROR: ${msg}`);
        }
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[LLM] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms: ${msg}`);
          await new Promise<void>((r) => setTimeout(r, delay));
        }
      }
    }
    throw new Error(`LLM_UNAVAILABLE: ${lastError?.message ?? "Unknown error after retries"}`);
  }

  private async callAPI(
    model: string,
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
    maxTokens: number
  ): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const payload = JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: payload,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const content = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    return {
      content,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    };
  }

  // ── Mock ──

  private mockComplete(request: LLMRequest): LLMResponse {
    const isArtifactGen = request.systemPrompt.includes("Respond ONLY with a valid JSON object");
    const content = isArtifactGen
      ? this.mockArtifact(request.systemPrompt)
      : this.mockChat(request.messages, request.systemPrompt);
    const tokens = Math.ceil(content.length / 4) + Math.ceil(request.systemPrompt.length / 4);
    return { content, tokens_used: tokens, model: `mock-${request.model}`, mock: true };
  }

  private mockChat(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string
  ): string {
    const phaseMatch = systemPrompt.match(/Phase (\d): (\w+)/);
    const phaseName = phaseMatch ? phaseMatch[2] : "your current phase";
    const phaseNum = phaseMatch ? phaseMatch[1] : "?";
    const gateMatches = systemPrompt.match(/☐ (.+)/g);
    const remaining = gateMatches ? gateMatches.map((g) => g.replace("☐ ", "")) : [];
    const lastMsg = messages[messages.length - 1]?.content ?? "";

    if (remaining.length > 0) {
      return `You're in Phase ${phaseNum} (${phaseName}). Based on your question about "${lastMsg.slice(0, 50)}", I'd recommend focusing on: "${remaining[0]}". This is your most impactful next step. Would you like specific guidance on how to approach it?`;
    }
    return `Great progress in Phase ${phaseNum} (${phaseName})! All your gates look satisfied. You're ready to move forward. What would you like to work on next?`;
  }

  private mockArtifact(systemPrompt: string): string {
    if (systemPrompt.includes("business plan")) {
      return JSON.stringify({
        problem: "Small business owners spend 5+ hours weekly on manual bookkeeping.",
        solution: "AI-powered bookkeeping that auto-categorizes transactions and generates reports.",
        target_customer: "Freelancers and SMBs with <10 employees using spreadsheets today.",
        value_proposition: "Save 5 hours/week with tax-ready records at a fraction of CPA cost.",
        revenue_model: "SaaS: $29/mo standard, $79/mo premium with CPA review.",
        distribution_channels: ["Content marketing", "Freelancer community outreach", "Partnerships"],
        cost_structure: { startup: 500, monthly_hosting: 50, monthly_ai: 100, monthly_marketing: 200 },
        competitive_advantage: "First AI + human CPA review combo at this price for non-accountants.",
        key_metrics: ["MRR", "CAC", "Time saved/user/week", "Churn rate", "NPS"],
        next_steps: ["Launch landing page", "Run 5 customer interviews", "Build MVP categorization"],
      });
    }
    if (systemPrompt.includes("offer statement")) {
      return JSON.stringify({
        headline: "Stop Drowning in Receipts. Start Running Your Business.",
        for_who: "Freelancers and small business owners who dread bookkeeping.",
        problem: "Manual bookkeeping eats 5+ hours weekly; errors cause missed deductions.",
        solution: "AI bookkeeping: auto-categorize, track expenses, generate tax-ready reports.",
        transformation: "Reclaim 5 hours/week. Never miss a deduction or face a tax surprise.",
        price_point: "$29/mo standard. $79/mo premium with quarterly CPA review.",
        guarantee: "30-day free trial. Save 3+ hours in month one or cancel instantly.",
        social_proof_strategy: "Offer 5-10 beta users free 60-day access for testimonials.",
      });
    }
    if (systemPrompt.includes("go-to-market")) {
      return JSON.stringify({
        primary_channel: "Content marketing targeting 'freelance bookkeeping' keywords.",
        first_10_customers: "Personal outreach to 50 freelancers. Free 60-day beta for feedback.",
        messaging: { freelancers: "Stop losing money to bad bookkeeping.", small_biz: "Books done automatically." },
        launch_timeline: { week_1: "Landing page live", week_2: "10 outreach + 3 blog posts", week_3: "Onboard users + feedback", week_4: "Iterate + wider launch" },
        budget_allocation: { landing_page: 100, content: 50, email: 50, paid_social: 200, reserve: 100 },
        metrics: ["Email list growth", "Beta activation rate", "WAU"],
        contingency: "If content stalls after 4 weeks, pivot to direct community outreach.",
      });
    }
    if (systemPrompt.includes("90-day growth")) {
      return JSON.stringify({
        current_state: "Early-stage with initial customers and validated PMF.",
        goals: [
          { metric: "MRR", current: 290, target: 2000, weekly_actions: ["2 content pieces", "10 outreach emails", "1 referral campaign"] },
          { metric: "Active users", current: 10, target: 75, weekly_actions: ["Onboard 5 trials", "Activation emails", "Improve onboarding"] },
          { metric: "Churn %", current: 15, target: 5, weekly_actions: ["2 churn interviews", "1 retention feature", "Tips email"] },
        ],
        systems_to_build: ["Automated onboarding sequence", "Weekly KPI dashboard", "Monthly feedback loop"],
        ai_integrations: ["AI blog from customer Qs", "AI support for bookkeeping Qs", "Auto-categorization learning"],
        weekly_review_checklist: ["Check MRR", "Review signups vs churn", "Read feedback", "Update content calendar", "Review ad ROI"],
        monthly_milestones: { month_1: "50 users, $1000 MRR", month_2: "75 users, $1500 MRR", month_3: "100 users, $2000 MRR" },
        risks: [
          { risk: "Slow content traction", mitigation: "Parallel paid test $200" },
          { risk: "High churn", mitigation: "Weekly user interviews" },
          { risk: "AI cost scaling", mitigation: "Cache common queries" },
        ],
      });
    }
    return JSON.stringify({
      title: "Generated Artifact",
      summary: "Artifact based on your venture details.",
      sections: [
        { heading: "Overview", content: "A structured deliverable for your current phase." },
        { heading: "Key Actions", content: "Focus on the 3 most impactful steps." },
        { heading: "Timeline", content: "Complete within 1-2 weeks." },
      ],
    });
  }
}

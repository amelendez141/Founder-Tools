/**
 * Phase definitions seeded into the phase_config table.
 * Per architecture §12.5: phase config lives in the database so content
 * can be updated without code deployment.
 *
 * This seed runs on server init (idempotent — uses INSERT OR REPLACE).
 */

export interface PhaseConfig {
  phase_number: number;
  name: string;
  description: string;
  original_sections: string;
  core_deliverable: string;
  guide_content: string;
  tool_recommendations: string[];
}

export const PHASE_SEED: PhaseConfig[] = [
  {
    phase_number: 1,
    name: "Discovery",
    description:
      "Validate your business idea by understanding the problem, researching competitors, and talking to potential customers.",
    original_sections: "§1 Mindset + §2 Idea Validation",
    core_deliverable: "Validated problem statement",
    guide_content: `## Phase 1: Discovery

Your goal in this phase is to move from a vague idea to a validated problem worth solving.

### Step 1: Define the Problem
Write a clear problem statement. Who has this problem? How painful is it? How are they solving it today? A good problem statement is specific, not generic. "People need better software" is weak. "Freelance designers spend 5+ hours/week chasing invoices because existing tools don't integrate with their project management workflow" is strong.

### Step 2: Research Existing Solutions
Identify at least 3 competitors or existing solutions. For each one, note: what they do well, what they do poorly, and what gap remains. This isn't about proving no one else does what you do — it's about understanding the landscape so you can position yourself.

### Step 3: Talk to Real People
Have at least 5 conversations with potential customers. These are not sales pitches. Ask open-ended questions: "Tell me about the last time you dealt with [problem]." "What did you try?" "What was frustrating about it?" Listen more than you talk. Write down exact quotes — these become marketing gold later.

### Mindset Check
Most first-time entrepreneurs skip validation because it feels slow. It's not slow — it prevents you from spending 6 months building something nobody wants. Every hour spent here saves 10 hours later.`,
    tool_recommendations: [
      "Google Trends — validate search demand for your problem area",
      "Reddit / Quora — find real conversations about the problem",
      "Notion or Google Docs — organize your research notes",
      "Calendly — schedule customer discovery calls",
    ],
  },
  {
    phase_number: 2,
    name: "Planning",
    description:
      "Build your 1-page business plan, design your offer, and set pricing — even if it's 'free beta.'",
    original_sections: "§3 Business Plan + §5 Offer Design",
    core_deliverable: "1-page business plan + offer statement",
    guide_content: `## Phase 2: Planning

You've validated the problem. Now translate that into a concrete business plan and a specific offer.

### Step 1: Complete Your 1-Page Business Plan
Fill in all 8 fields: problem, solution, target customer, offer, revenue model, distribution channel, estimated costs, and unfair advantage. This isn't a 40-page document — it's a single page that forces clarity. If you can't explain each field in 2–3 sentences, you haven't thought it through.

### Step 2: Design Your Offer
Your offer is not your product — it's the transformation you promise. "I sell accounting software" is a product. "I give freelancers 5 hours back every week by automating their invoicing" is an offer. Write an offer statement that includes: who it's for, what they get, and the result they can expect.

### Step 3: Set Your Price
Even if you're starting with a free beta, you need a pricing strategy. Options: free trial → paid, freemium, one-time purchase, subscription, pay-per-use. Pick one and commit. You can change it later, but you need a starting point to test with real customers.

### Planning Reality Check
Perfectionism kills more businesses than bad ideas. Your plan will be wrong — that's fine. The point is to have a testable hypothesis, not a perfect prediction. Ship the plan, not the planning.`,
    tool_recommendations: [
      "Canva — create a visual 1-page business plan",
      "Lean Canvas template — structured business model format",
      "Stripe or Gumroad — pricing research and payment setup",
      "Google Sheets — financial projections (startup + monthly costs)",
    ],
  },
  {
    phase_number: 3,
    name: "Formation",
    description:
      "Set up the legal and financial foundation: entity type, EIN, bank account, and bookkeeping method.",
    original_sections: "§4 Company Setup + §9 Finance Basics",
    core_deliverable: "Legal entity + bookkeeping setup",
    guide_content: `## Phase 3: Formation

**Important: This phase covers legal and financial setup. The information here is educational — not legal or financial advice. Consult a qualified professional for decisions specific to your situation.**

### Step 1: Choose Your Entity Type
Your options in the U.S.: Sole Proprietorship (simplest, no protection), LLC (moderate protection, flexible taxes), or Corporation (complex, best for investors). For most beginners with low budgets, starting as a Sole Proprietorship and upgrading to an LLC when revenue justifies it is the pragmatic path. You can also explicitly skip this step if you're not ready.

### Step 2: Get Your EIN
An Employer Identification Number (EIN) is free from the IRS and takes 5 minutes online. You need it to open a business bank account, file taxes, and hire contractors. Even sole proprietors should get one to avoid using their SSN on business forms.

### Step 3: Open a Business Bank Account
Separate your business and personal finances from day one. This isn't optional — it's the single most important financial habit. Most banks offer free business checking. Pick one, deposit $0, and start routing all business transactions through it.

### Step 4: Choose a Bookkeeping Method
You have three tiers: spreadsheet (free, manual), Wave (free software), or QuickBooks/Xero (paid, full-featured). Pick the one that matches your budget and transaction volume. The best system is the one you'll actually use weekly.

### Legal Disclaimer
Entity formation, tax obligations, and financial regulations vary by state and situation. This guide provides general educational information. Always consult with a licensed attorney or CPA for advice tailored to your circumstances.`,
    tool_recommendations: [
      "IRS EIN Assistant — free online EIN application (irs.gov)",
      "Wave — free accounting and invoicing software",
      "QuickBooks Self-Employed — paid bookkeeping for small businesses",
      "LegalZoom or Incfile — LLC formation services",
      "Mercury or Relay — modern business banking with no fees",
    ],
  },
  {
    phase_number: 4,
    name: "Launch",
    description:
      "Activate your first distribution channel, send your first outreach, and acquire your first customer.",
    original_sections: "§7 First Customers + §8 Brand",
    core_deliverable: "First customer acquired",
    guide_content: `## Phase 4: Launch

This is where your business becomes real. One customer is worth more than 100 hours of planning.

### Step 1: Pick One Distribution Channel
Don't try to be everywhere. Choose ONE channel where your target customers already spend time: social media (which platform specifically?), email outreach, content marketing, local networking, marketplaces, or partnerships. Double down on it until it works or you've conclusively proven it doesn't.

### Step 2: Send Your First Outreach
Write a personal message to 10 potential customers. Not a mass email — a personalized, individual message. Reference their specific situation. Offer value before asking for anything. "I noticed you mentioned [problem] in [place]. I built something that might help — would you be open to a 10-minute call?" Send it today.

### Step 3: Get Your First Customer
Your first customer will probably come from your personal network or your outreach list. Make it easy: offer a discount, a free trial, or a money-back guarantee. The goal isn't maximum revenue — it's proof that someone will pay (or at least commit) to your solution. One real customer teaches you more than 1,000 survey responses.

### Brand Basics
Before you launch publicly, ensure you have: a name, a simple logo (Canva is fine), a consistent color palette, and a one-liner that explains what you do. Don't overthink this. A clear message beats a pretty brand every time.

### Launch Mindset
Waiting until everything is "ready" means never launching. Launch ugly. Launch small. Launch now. Your first version should embarrass you slightly — if it doesn't, you waited too long.`,
    tool_recommendations: [
      "Canva — logo, social media graphics, brand kit",
      "Mailchimp or ConvertKit — email marketing",
      "Carrd or Linktree — simple landing page",
      "Calendly — booking calls with leads",
      "Stripe — accept payments",
    ],
  },
  {
    phase_number: 5,
    name: "Scale",
    description:
      "Generate your 90-day growth plan, integrate AI into your workflow, and build systems for repeatable revenue.",
    original_sections: "§6 AI Integration + §10 Growth",
    core_deliverable: "90-day growth plan (loops indefinitely)",
    guide_content: `## Phase 5: Scale

You have revenue. Now build systems so growth doesn't depend entirely on your daily effort.

### Step 1: Document What's Working
Before you scale, write down exactly how you got your first customers. What channel? What message? What conversion rate? This is your repeatable playbook. If you can't describe the process, you can't scale it.

### Step 2: Integrate AI Into Your Workflow
Now that you have a real business with real tasks, AI becomes powerful. Use AI to: draft customer emails, generate social media content, analyze customer feedback patterns, create standard operating procedures, and automate repetitive research. The key is applying AI to bottlenecks you've actually experienced — not hypothetical ones.

### Step 3: Build Your 90-Day Growth Plan
Set 3 specific goals for the next 90 days. For each goal, define: the metric, the current number, the target number, and the 3 actions you'll take weekly to move it. Example: "Grow email list from 50 to 500 subscribers by publishing 2 blog posts/week and running 1 collaboration/month."

### Step 4: Create Feedback Loops
Growth compounds when you systematize learning. Weekly: review your numbers. Monthly: talk to 3 customers. Quarterly: revisit your 90-day plan. The businesses that win aren't the ones with the best first idea — they're the ones that learn fastest.

### Ongoing
Phase 5 has no exit gate. You'll cycle through it continuously as your business evolves. Each cycle, your goals get more ambitious, your systems get more sophisticated, and your AI integration gets deeper.`,
    tool_recommendations: [
      "ChatGPT / Claude — content generation, analysis, SOPs",
      "Zapier or Make — workflow automation",
      "Google Analytics — website traffic analysis",
      "Notion — operating system for your business",
      "Airtable — CRM and pipeline management",
      "Buffer or Later — social media scheduling",
    ],
  },
];

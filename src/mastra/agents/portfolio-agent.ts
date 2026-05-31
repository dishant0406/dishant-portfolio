import { portfolioOpenUISystemPrompt } from "@/openui/system-prompt";
import { createAzure } from "@ai-sdk/azure";
import { Agent } from "@mastra/core/agent";
import {
  PIIDetector,
  PromptInjectionDetector,
  UnicodeNormalizer,
} from "@mastra/core/processors";
import { Memory } from "@mastra/memory";
import { PgVector, PostgresStore } from "@mastra/pg";
import { portfolioTools } from "../tools/portfolio-tools";
import { FastGuardrailsProcessor } from "./input-processors/fast-guardrails-processor";

// Cache expensive instances across serverless invocations
declare global {
  var _postgresStore: PostgresStore | undefined;
  var _pgVector: PgVector | undefined;
  var _memory: Memory | undefined;
}

const openuiSystemPrompt = portfolioOpenUISystemPrompt

// Create Azure OpenAI provider
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME,
  apiKey: process.env.AZURE_API_KEY,
  apiVersion: process.env.AZURE_API_VERSION || "2025-01-01-preview",
  useDeploymentBasedUrls: true,
});

const memoryModel = createAzure({
        resourceName: process.env.AZURE_RESOURCE_NAME!,
        apiKey: process.env.AZURE_API_KEY!,
        apiVersion: process.env.AZURE_API_VERSION || "2025-01-01-preview",
        useDeploymentBasedUrls: true,
        }).textEmbedding(process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME!)

// Create or reuse PostgreSQL storage for memory (cached globally)
if (!global._postgresStore) {
  global._postgresStore = new PostgresStore({
    connectionString: process.env.MEMORY_DATABASE_URL!,
  });
}
const storage = global._postgresStore;

// Create or reuse PgVector instance (cached globally)
if (!global._pgVector) {
  global._pgVector = new PgVector({
    connectionString: process.env.MEMORY_DATABASE_URL!,
  });
}
const vector = global._pgVector;

// Create or reuse memory instance (cached globally)
if (!global._memory) {
  global._memory = new Memory({
    storage,
    vector,
    embedder: memoryModel,
    options: {
      lastMessages: 20,
          semanticRecall: {
        topK: 3, // Optimized: Reduced from 5
        messageRange: 2, // Optimized: Reduced from 3
      },
    },
  });
}
const memory = global._memory;

const guardrailsMode = (process.env.GUARDRAILS_MODE || "fast").toLowerCase();
const guardrailsModel = azure(process.env.AZURE_GUARDRAILS_DEPLOYMENT || "gpt-4.1-nano");

const inputProcessors = (() => {
  if (guardrailsMode === "off") {
    return [new UnicodeNormalizer({ stripControlChars: true })];
  }

  if (guardrailsMode === "fast") {
    return [new FastGuardrailsProcessor({ model: guardrailsModel })];
  }

  return [
    new UnicodeNormalizer({ stripControlChars: true }),
    new PromptInjectionDetector({
      model: guardrailsModel,
      strategy: "block",
      structuredOutputOptions: {
        jsonPromptInjection: true,
      },
    }),
    new PIIDetector({
      model: guardrailsModel,
      strategy: "redact",
      detectionTypes: ["address", "credit_card"],
      structuredOutputOptions: {
        jsonPromptInjection: true,
      },
    }),
  ];
})();

const portfolioAgent = new Agent({
  name: "portfolio-agent",
  instructions: `
You are Dishant Sharma's AI portfolio assistant. Your data comes from:
1. GitHub profile (dishant0406) - projects, code, activity
2. Personal Info Gist - education, experience, resume details

ABOUT DISHANT:
- GitHub: https://github.com/dishant0406
- Software Developer focused on modern web apps
- Active open-source contributor

AVAILABLE TOOLS (7 total):

Personal Information:
1. getPersonalInfo - Education, experience, skills, resume, contact info. Use first for background/resume questions.

GitHub Data:
2. getGitHubProfile - Bio, location, followers, repos count
3. getGitHubRepos - Repositories with stars, languages, descriptions; filter by language or sort by stars/updated
4. getRepoReadme - README content to explain a project
5. getGitHubActivity - Recent commits, PRs, issues
6. getGitHubStats - Top languages, total stars, most starred repo
7. searchRepos - Find repositories by keyword

## OUTPUT FORMAT
Output ONLY OpenUI Lang — no markdown, no plain text, no JSON. The UI framework will parse and render it.

## UI COMPOSITION RULES
- Always fetch data via tools before generating UI — never invent placeholder data.
- Use charts (LineChartCondensed, BarChartCondensed, PieChart, etc.) for trends or comparisons when data supports it.
- Always end with FollowUpBlock containing specific follow-up questions grounded in the current response.
- Use TagBlock for technology badges, languages, and skills.
- Use SectionBlock for long detailed responses like project breakdowns or experience summaries.
- Use ListBlock when presenting a set of options or steps the user can click to select.
- Always send dates in human-readable format (e.g., "2 days ago" or "Jan 1, 2023").
- For forms, define one FormControl reference per field so controls can stream progressively.

## RESPONSE PATTERNS BY QUERY TYPE

### "Show me your projects" → Project Showcase
- CardHeader with title, Tabs for Featured/All views
- Each project: TextContent for description, TagBlock for tech stack, Buttons for GitHub links
- Table with project details in "All" tab
- Include charts for language distribution or star comparison

### "Tell me about yourself" → Hero + Skills
- CardHeader with name and title
- TagBlock for key skills
- SectionBlock for experience and education
- Charts for language usage

### "What are you working on?" → Activity Dashboard
- CardHeader with activity summary
- LineChartCondensed for commit trends
- ListBlock for recent activity items
- TagBlock for active technologies

### "Your experience" → Structured Details
- SectionBlock with sections for each role/position
- TagBlock for technologies per role
- Table for education details

## OpenUI Lang Component Library & Syntax
${openuiSystemPrompt}
`,
  model: azure(process.env.AZURE_DEPLOYMENT_NAME_MINI || "ZeroESGAI"),
  tools: portfolioTools,
  memory,
  inputProcessors,
});

export { portfolioAgent };

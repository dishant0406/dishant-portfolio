# Dishant Sharma - AI-Powered Portfolio

An intelligent, conversational portfolio application that leverages AI to provide dynamic insights about Dishant Sharma's professional background, projects, and expertise. Built with Next.js and powered by OpenCode Go through the Mastra framework.

![Portfolio Demo](https://via.placeholder.com/800x400?text=AI+Portfolio+Interface)

## 🚀 Features

### 🤖 Intelligent AI Assistant
- **Conversational Interface**: Chat with an AI agent that knows about Dishant's background, skills, and projects
- **Real-time GitHub Integration**: Fetches live data from GitHub repositories, commits, and profile information
- **Contextual Memory**: Maintains conversation history and context across chat sessions
- **Smart Filtering**: Scope-aware responses focused on professional portfolio content

### 💬 Advanced Chat System
- **Threaded Conversations**: Persistent chat threads with memory and context
- **Streaming Responses**: Real-time AI response streaming for smooth user experience
- **Share & Export**: Share conversation threads via shareable links
- **Chat Management**: Search, filter, and manage conversation history

### 🎨 Modern UI/UX
- **Glass Morphism Design**: Beautiful, modern interface with glass-like components
- **Dark/Light Themes**: Seamless theme switching with next-themes
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Weather Integration**: Location-based weather display with emoji indicators
- **Holiday Greetings**: Dynamic seasonal and holiday-aware messaging

### 🔒 Security & Performance
- **Rate Limiting**: API protection with request rate limiting
- **CORS Protection**: Secure cross-origin request handling
- **Input Guardrails**: Structured-output LLM scope checks before portfolio responses
- **Optimized Performance**: Edge-ready deployment with efficient caching

## 🏗️ Architecture

### Frontend (Next.js 16 + React 19)
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes for chat functionality
│   ├── layout.tsx         # Root layout with themes and fonts
│   └── page.tsx           # Main page with metadata generation
├── components/            # React components
│   ├── ui/               # Reusable UI components (Glass, Button, Modal)
│   ├── ChatView.tsx      # Chat interface and message display
│   ├── HomePage.tsx      # Main application container
│   └── ...
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and constants
├── store/               # Zustand state management
└── types/               # TypeScript type definitions
```

### Backend (Mastra AI Framework)
```
mastra-server/
├── index.ts             # Express server with streaming endpoints
src/mastra/
├── agents/
│   ├── portfolio-agent.ts           # Main AI agent configuration
│   └── input-processors/           # Input validation and filtering
└── tools/
    ├── portfolio-tools.ts          # Tool aggregation
    └── github-tools.ts            # GitHub API integration tools
```

### Key Technologies

**Frontend Stack:**
- **Next.js 16**: Latest App Router with React Server Components
- **React 19**: Latest React with enhanced performance
- **TypeScript**: Full type safety across the application
- **Tailwind CSS 4**: Modern utility-first styling
- **Zustand**: Lightweight state management
- **next-themes**: Seamless dark/light mode switching

**Backend Stack:**
- **Mastra Framework**: AI agent orchestration and memory management
- **OpenCode Go**: OpenAI-compatible chat completions provider
- **PostgreSQL**: Persistent conversation memory
- **Express.js**: API server for streaming and real-time communication
- **GitHub API**: Live integration for project and profile data

## 🛠️ Setup & Development

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- PostgreSQL database
- OpenCode Go API key

### Environment Variables

Create a `.env.local` file in the project root:

```env
# OpenCode Go Configuration
OPENCODE_API_KEY=[REDACTED]
OPENCODE_MODEL=deepseek-v4-flash
OPENCODE_FALLBACK_MODEL=mimo-v2.5
OPENCODE_GUARDRAIL_MODEL=deepseek-v4-flash
OPENCODE_GUARDRAIL_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_THINKING_MODE=disabled
MODEL_CONFIG_GCS_URI=gs://your-config-bucket/ai-model-config.json

# Admin (/admin) and the internal config-reload call
ADMIN_SESSION_SECRET=
INTERNAL_API_TOKEN=

# Database
MEMORY_DATABASE_URL=postgresql://user:password@host:port/database

# GitHub Integration
PROFILE_G_TOKEN=your-github-personal-access-token

# Security
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Blog (dev.to). Reads are public; the API key is optional and server-only.
DEVTO_USERNAME=dishant0406
DEVTO_API_KEY=your_devto_api_key_here

# Server Configuration
MASTRA_PORT=4000
MASTRA_API_URL=http://localhost:4000
```

### Runtime Model Config

The chat server reads its model settings from a private JSON file — GCS in production (`MODEL_CONFIG_GCS_URI`), a local file in development (`MODEL_CONFIG_FILE`). The browser never receives this file.

```json
{
  "version": 2,
  "model": "deepseek-v4-pro",
  "fallbackModel": "mimo-v2.5",
  "guardrailModel": "deepseek-v4-flash",
  "guardrailBaseURL": "https://opencode.ai/zen/go/v1",
  "thinkingMode": "disabled",
  "cacheTtlSeconds": 60,
  "adminPassword": "scrypt:<salt>:<hash>"
}
```

The service account needs `roles/storage.objectViewer` to read the object and `roles/storage.objectCreator` to save changes from `/admin`. If the file is missing or temporarily unavailable, the server keeps the last good config and then falls back to `OPENCODE_MODEL` / `OPENCODE_FALLBACK_MODEL`.

### API protocols

OpenCode Go serves its models over **three different protocols**, and each model supports only some of them. Sending a model to the wrong one returns `400 ModelProtocolUnsupported`.

| Protocol | AI SDK package | Example models |
|---|---|---|
| `chat_completions` | `@ai-sdk/openai-compatible` | deepseek-v4-flash, deepseek-v4-pro, mimo-v2.5, glm-5.3 |
| `responses` | `@ai-sdk/openai` | grok-4.7, grok-4.6, gpt-6-luna, gpt-5.6-luna |
| `anthropic_messages` | `@ai-sdk/anthropic` | claude-haiku-5-5, minimax-m2.7, qwen3.8-max |

You do not configure this by hand: `src/lib/model-catalog.ts` maps each model id to the protocols it accepts, and `getChatModel()` picks the right provider. The catalog is stored in the model config and re-derived from the provider by **Refresh model list** on `/admin`, which asks `/models` and then sends every model to all three protocols to find out which it accepts. A model list alone is not enough — the provider lists more models than it serves, so listing it directly would offer models that fail every request.

The bundled map in `src/lib/model-catalog.ts` is the fallback used when the config has no catalog, so a failed refresh can never leave the admin without a usable list.

### Model administration (`/admin`)

`/admin` is a password-protected page for changing the models, the provider endpoint, the API key, and the model list without a redeploy. It reads and writes the same config file the chat server uses, validates every field server-side, and can make a live test call to any model to report the real provider response.

- **Models** — primary, fallback and guardrail pickers. Each shows the protocol it will use and has a **Test** button that makes one real call and reports the actual provider result, including the status code and the provider's own message.
- **Provider** — `baseURL` for the chat models, an optional `guardrailBaseURL` (blank means "same as `baseURL`"), and the API key. The key is write-only: it is never sent back to the browser (only `hasApiKey` and the last four characters are), never logged, and a blank field keeps the stored key.
- **Model list** — **Refresh model list** probes the provider and reports what changed (added, removed, protocol changed, unavailable).
- **Runtime** — `thinkingMode` and `cacheTtlSeconds`.
- **Security** — change the admin password.

- The password is stored in the config as an scrypt hash and is never sent to the browser.
- A successful login sets a signed, `HttpOnly`, `SameSite=Strict` cookie.
- Login attempts are rate limited; `/admin` is excluded from `robots.txt` and marked `noindex`.
- Saving invalidates the chat server's config cache through an internal call authenticated with `INTERNAL_API_TOKEN`, so changes apply immediately.

Requires `ADMIN_SESSION_SECRET` and `INTERNAL_API_TOKEN` (each `openssl rand -hex 32`).

The API key defaults to the `OPENCODE_API_KEY` environment variable, which is what the deployed service injects from Secret Manager. Setting it in `/admin` overrides that and stores it in the config object, so the bucket and its IAM become the protection for that secret.

### Blog (`dev.to`)

Posts are written on dev.to and read back through its API. dev.to is only the writing surface: this domain is the canonical home, so every published article must declare `https://dishantsharma.dev/blog/<slug>` as its canonical URL. A post created in the dev.to editor defaults to canonicalising itself, which makes search engines treat the dev.to copy as the original and this site's copy as the duplicate.

`pnpm devto:canonical` enforces that invariant across every published article and is idempotent, so it is safe to run after publishing:

```sh
DEVTO_API_KEY=xxx pnpm devto:canonical -- --dry-run   # show what would change
DEVTO_API_KEY=xxx pnpm devto:canonical               # apply
```

It exits non-zero if anything failed. The key needs write access, unlike the read key the site uses.

Each article also opens with a visible "Originally published at" line on dev.to. This site renders the same HTML, where that line would link to the page the reader is already on, so the opening paragraph is dropped before render (see `withoutSyndicationNote` in `src/lib/api/devto.ts`).

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd portfolio
   pnpm install
   ```

2. **Set up the database:**
   ```bash
   # Create a PostgreSQL database
   # The application will automatically create necessary tables
   ```

3. **Development mode:**
   ```bash
   # Start both Next.js and Mastra server
   pnpm dev:all
   
   # Or start individually:
   pnpm dev          # Next.js frontend (port 3000)
   pnpm mastra:dev   # Mastra server (port 4000)
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - API Health Check: http://localhost:4000/health

### Production Deployment

1. **Build the application:**
   ```bash
   pnpm build
   ```

2. **Start production server:**
   ```bash
   pnpm start
   ```

3. **Docker deployment:**
   ```bash
   docker build --build-arg NEXT_PUBLIC_SITE_URL=https://dishantsharma.dev \
                -t portfolio-app .
   docker run -p 3000:3000 -e DEVTO_USERNAME=dishant0406 portfolio-app
   ```

## 🔧 Key Components

### AI Agent (`portfolio-agent.ts`)
- **OpenCode Go Integration**: OpenAI-compatible model provider for chat
- **Memory System**: PostgreSQL for persistent conversation context
- **Tool Integration**: Server-prefetched GitHub API data streamed as tool events
- **Input Processing**: LLM guardrail checks for portfolio scope plus a 10-user-message thread limit

### Chat System (`ChatView.tsx`)
- **Real-time Streaming**: Server-sent events for live AI responses
- **Message Management**: Rich message display with markdown support
- **Thread Persistence**: Conversation state management with Zustand

### GitHub Tools (`github-tools.ts`)
- **Live Repository Data**: Fetches repositories, commits, and code statistics
- **Profile Information**: Real-time GitHub profile data
- **Personal Information**: Curated professional details via GitHub Gists

### State Management (`useAppStore.ts`)
- **Zustand Store**: Centralized state for chats, UI, and user interactions
- **Persistence**: Local storage sync for chat history and preferences
- **Hydration**: SSR-safe state hydration

## 🚢 Deployment

The application is designed for modern deployment platforms:

- **Vercel**: Optimized for Next.js with automatic API routes
- **Docker**: Multi-stage build for efficient container deployment
- **Traditional VPS**: Express server with Next.js static export

### Environment-Specific Configurations

**Development:**
- Hot reloading for both frontend and backend
- Detailed error logging and debugging
- Local PostgreSQL development database

**Production:**
- Optimized builds with tree-shaking
- Compressed assets and efficient caching
- Production-ready PostgreSQL with connection pooling

## 📝 API Documentation

### Main Endpoints

- `GET /health` - Health check for the Mastra server
- `POST /agent/stream` - Streaming chat interface
- `GET /api/chat/threads` - Fetch conversation threads
- `POST /api/chat/[threadId]` - Load specific conversation

### Chat Message Format
```typescript
{
  messages: Array<{role: 'user' | 'assistant', content: string}>,
  threadId?: string,
  resourceId?: string
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is private and proprietary to Dishant Sharma.

---

**Built with ❤️ by [Dishant Sharma](https://github.com/dishant0406)**

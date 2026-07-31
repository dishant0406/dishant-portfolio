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
- **Input Sanitization**: PII detection and prompt injection protection
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
OPENCODE_API_KEY=your-opencode-key
OPENCODE_MODEL=deepseek-v4-flash
OPENCODE_FALLBACK_MODEL=deepseek-v4-pro
OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_THINKING_MODE=disabled

# Database
MEMORY_DATABASE_URL=postgresql://user:password@host:port/database

# GitHub Integration
PROFILE_G_TOKEN=your-github-personal-access-token

# Security
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Server Configuration
MASTRA_PORT=4000
MASTRA_API_URL=http://localhost:4000
```

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
   docker build --build-arg NEXT_PUBLIC_HASHNODE_HOST=dishantsharma.hashnode.dev \
                --build-arg NEXT_PUBLIC_SITE_URL=https://dishantsharma.dev \
                -t portfolio-app .
   docker run -p 3000:3000 portfolio-app
   ```

## 🔧 Key Components

### AI Agent (`portfolio-agent.ts`)
- **OpenCode Go Integration**: OpenAI-compatible model provider for chat
- **Memory System**: PostgreSQL for persistent conversation context
- **Tool Integration**: Server-prefetched GitHub API data streamed as tool events
- **Input Processing**: Local guardrails for prompt-injection blocking and sensitive text redaction

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

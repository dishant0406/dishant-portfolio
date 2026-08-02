# Mastra Server

Standalone API server for Mastra agent - share across multiple applications.

## Features

- ✅ Always-running instance (no cold starts)
- ✅ Streaming-only chat API
- ✅ Server-Sent Events for live model/tool output
- ✅ CORS enabled for multiple origins
- ✅ Memory/thread management

## Endpoints

### `POST /agent/stream`
Stream agent responses in real-time.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Tell me about your projects" }
  ],
  "threadId": "optional-thread-id",
  "resourceId": "optional-resource-id"
}
```

**Response:** Server-Sent Events stream

### `GET /threads/:threadId?resourceId=xyz`
Get thread history.

### `GET /threads?resourceId=xyz`
List all threads for a resource.

### `GET /health`
Health check endpoint.

## Local Development

```bash
cd mastra-server
pnpm install
pnpm dev
```

Server runs on `http://localhost:4000`

## Environment Variables

```env
MASTRA_PORT=4000
ALLOWED_ORIGINS=https://app1.com,https://app2.com
MEMORY_DATABASE_URL=postgresql://...
OPENCODE_API_KEY=...
OPENCODE_MODEL=deepseek-v4-flash
OPENCODE_FALLBACK_MODEL=mimo-v2.5
OPENCODE_GUARDRAIL_MODEL=deepseek-v4-flash
OPENCODE_GUARDRAIL_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_THINKING_MODE=disabled
MODEL_CONFIG_GCS_URI=gs://your-config-bucket/ai-model-config.json
```

## Runtime Model Config

For production, set `MODEL_CONFIG_GCS_URI` to a private GCS object. The server reads it before streaming a response, caches it for `cacheTtlSeconds`, and keeps the last good config if GCS has a transient failure.
`guardrailModel` and `guardrailBaseURL` are used only for the structured-output portfolio-scope classifier. Threads are blocked after 10 user messages. For Big Pickle guardrail tests, use `big-pickle` with `https://opencode.ai/zen/v1`.

```json
{
  "version": 1,
  "provider": "opencode-go",
  "model": "deepseek-v4-pro",
  "fallbackModel": "mimo-v2.5",
  "guardrailModel": "deepseek-v4-flash",
  "guardrailBaseURL": "https://opencode.ai/zen/go/v1",
  "thinkingMode": "disabled",
  "cacheTtlSeconds": 60
}
```

## Deployment

### Docker
```bash
docker build -t mastra-server -f mastra-server/Dockerfile .
docker run -p 4000:4000 --env-file .env mastra-server
```

### Railway/Render
1. Push to GitHub
2. Connect repository
3. Set build command: `cd mastra-server && pnpm install && pnpm build`
4. Set start command: `cd mastra-server && pnpm start`
5. Set port: `4000`

### Using from Next.js Apps

Update your Next.js API routes to call this server:

```typescript
// src/app/api/chat/stream/route.ts
const MASTRA_API = process.env.MASTRA_API_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const response = await fetch(`${MASTRA_API}/agent/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  // Forward the stream
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Benefits

- **No cold starts** - Always running instance
- **Shared across apps** - Multiple Next.js apps can use same instance
- **Better performance** - Persistent connections and memory
- **Easier scaling** - Scale independently from frontend apps
- **Cost effective** - One instance for multiple apps

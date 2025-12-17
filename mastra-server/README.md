# Mastra Server

Standalone API server for Mastra agent - share across multiple applications.

## Features

- ✅ Always-running instance (no cold starts)
- ✅ RESTful API endpoints
- ✅ Server-Sent Events for streaming
- ✅ CORS enabled for multiple origins
- ✅ Memory/thread management

## Endpoints

### `POST /agent/stream`
Stream agent responses in real-time.

**Request:**
```json
{
  "message": "Tell me about your projects",
  "threadId": "optional-thread-id",
  "resourceId": "optional-resource-id"
}
```

**Response:** Server-Sent Events stream

### `POST /agent/generate`
Get a complete response (non-streaming).

**Request:**
```json
{
  "message": "What's your background?",
  "threadId": "optional-thread-id",
  "resourceId": "optional-resource-id"
}
```

**Response:**
```json
{
  "text": "Response text...",
  "threadId": "thread-id",
  "resourceId": "resource-id"
}
```

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
AZURE_RESOURCE_NAME=...
AZURE_API_KEY=...
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

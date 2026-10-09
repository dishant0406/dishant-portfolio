# Mastra Server

Standalone API server for the Mastra portfolio agent. It is started by `start.sh`
alongside Next.js and listens on `MASTRA_PORT` (4000). Cloud Run only forwards to
the Next.js port, so this server is reachable from the internet only through the
`/api/chat/*` routes that proxy to it.

## Endpoints

### `POST /agent/stream`
Stream agent responses as Server-Sent Events.

```json
{
  "messages": [{ "role": "user", "content": "Tell me about your projects" }],
  "threadId": "optional-thread-id",
  "resourceId": "optional-resource-id"
}
```

### `POST /agent/prepare-local`
Runs the guardrail and collects portfolio context for the in-browser WebLLM
model. Returns `{ allowed, portfolioContext?, message?, events }`.

### `GET /threads/:threadId` and `GET /threads?resourceId=...`
Thread history and thread list, backed by PostgreSQL memory.

### `GET /health`
Health check.

### `POST /internal/model-config/reload`
Drops the cached model config so the next request reloads it. Called by the
Next.js `/admin` save handler and authenticated with `INTERNAL_API_TOKEN`.

## Guardrails

Before answering, the agent asks a small model to classify the message as
in-scope or off-topic, using a structured output schema. Threads are blocked
after 10 user messages.

A guardrail **failure** (provider down, bad credentials) is reported to the user
as "temporarily unavailable" and logged as `Portfolio guardrail unavailable`.
It is deliberately not reported as an off-topic block, because the two have
completely different causes.

Set `GUARDRAILS_MODE=off` to skip the check entirely.

## Environment Variables

```env
MASTRA_PORT=4000
ALLOWED_ORIGINS=https://app1.com,https://app2.com
MEMORY_DATABASE_URL=postgresql://...
OPENCODE_API_KEY=[REDACTED]
OPENCODE_MODEL=deepseek-v4-flash
OPENCODE_FALLBACK_MODEL=mimo-v2.5
OPENCODE_GUARDRAIL_MODEL=deepseek-v4-flash
OPENCODE_GUARDRAIL_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1
OPENCODE_THINKING_MODE=disabled
MODEL_CONFIG_GCS_URI=gs://your-config-bucket/ai-model-config.json
INTERNAL_API_TOKEN=
```

## Runtime Model Config

Model settings live in a JSON file read from `MODEL_CONFIG_FILE` or
`MODEL_CONFIG_GCS_URI`, cached for `cacheTtlSeconds`. On a read failure the last
good config is reused; if there is none, the `OPENCODE_*` environment values are
used. `src/lib/model-config.ts` owns the schema, validation, and both the read
and write paths — the admin UI writes through the same module, so a value that
saves successfully is always a value this server can load.

The `apiType` for each model is not configurable: OpenCode Go only accepts each
model on specific protocols, so `src/mastra/agents/opencode-model-catalog.ts`
maps model id → protocols and `getChatModel()` selects the provider. See the
root `README.md` for the protocol table.

## Local Development

```bash
cd mastra-server
pnpm dev
```

Runs on `http://localhost:4000`.

## Deployment

The Dockerfile at the repository root builds both Next.js and this server.
`start.sh` runs `node mastra-server/dist/index.js` in the background and then
starts Next.js in the foreground.

`mastra-server/dist/index.js` is committed, so it must be rebuilt
(`pnpm mastra:build`) whenever this directory changes or the container ships
stale code.

#!/bin/sh
set -e

MASTRA_PORT="${MASTRA_PORT:-4000}"

# Start the Mastra API server in the background.
echo "Starting Mastra API server on port ${MASTRA_PORT}..."
node mastra-server/dist/index.js &
MASTRA_PID=$!

# Only runs if this script still owns the process, i.e. before the `exec` below.
cleanup() {
    echo "Shutting down servers..."
    kill "$MASTRA_PID" 2>/dev/null || true
}
trap cleanup EXIT TERM INT

# Wait for Mastra to answer /health instead of sleeping a fixed amount. It comes
# up in 1-3s, so a fixed sleep either wastes time on a fast boot or proceeds
# before the server can serve. This returns as soon as it is actually ready.
echo "Waiting for Mastra server to start..."
if ! MASTRA_PORT="$MASTRA_PORT" node -e '
const port = process.env.MASTRA_PORT || 4000;
const deadline = Date.now() + 30000;
(async () => {
    while (Date.now() < deadline) {
        try {
            // Without a per-request timeout a socket that accepts but never
            // answers would stall past the deadline on undici default timeouts.
            const response = await fetch(`http://127.0.0.1:${port}/health`, {
                signal: AbortSignal.timeout(2000),
            });
            if (response.ok) process.exit(0);
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    process.exit(1);
})();
'; then
    if ! kill -0 "$MASTRA_PID" 2>/dev/null; then
        echo "Error: Mastra server exited during startup"
    else
        echo "Error: Mastra server did not become ready in time"
    fi
    exit 1
fi

echo "Mastra server is ready."

# Run the Next.js binary directly. `npm run` would add an npm process that only
# forwards signals and arguments. Cloud Run injects PORT.
APP_PORT="${PORT:-3000}"
echo "Starting Next.js server on port ${APP_PORT}..."
exec node node_modules/next/dist/bin/next start -p "$APP_PORT" -H 0.0.0.0

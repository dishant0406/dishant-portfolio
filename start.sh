#!/bin/sh
set -e

# Start Mastra API server in the background
echo "Starting Mastra API server on port 4000..."
node mastra-server/dist/index.js &
MASTRA_PID=$!

# Function to cleanup on exit
cleanup() {
    echo "Shutting down servers..."
    kill $MASTRA_PID 2>/dev/null || true
    exit
}

trap cleanup SIGTERM SIGINT

# Wait for Mastra to be ready
echo "Waiting for Mastra server to start..."
sleep 3

# Check if Mastra is still running
if ! kill -0 $MASTRA_PID 2>/dev/null; then
    echo "Error: Mastra server failed to start"
    exit 1
fi

# Start Next.js server in the foreground
echo "Starting Next.js server on port 3000..."
exec npm run start:next

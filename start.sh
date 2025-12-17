#!/bin/sh

# Start Mastra API server in the background
echo "Starting Mastra API server on port 4000..."
node mastra-server/dist/index.js &

# Wait a moment for Mastra to initialize
sleep 2

# Start Next.js server
echo "Starting Next.js server on port 3000..."
npm run start

#!/bin/sh
# Start Colyseus server in background
npx tsx src/server/index.ts &

# Start Next.js
npm run start

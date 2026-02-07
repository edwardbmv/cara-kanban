#!/bin/bash
# Start Cara HQ Dashboard locally with live OpenClaw data
# Access at http://localhost:3000

cd "$(dirname "$0")"

echo "🐾 Starting Cara HQ Dashboard..."
echo "📡 Gateway: $OPENCLAW_GATEWAY_URL"
echo ""

npm run dev

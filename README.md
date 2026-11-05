# VoltEdge Electronics — order management automation

Follow the "VoltEdge Implementation Guide" doc step by step. Quick map:

- supabase/schema.sql          → run once in Supabase SQL Editor
- storefront/                  → Next.js site (copy .env.example to .env.local)
- n8n/01..04-*.json            → import into n8n (Workflows → Import from File)
- n8n/code/*.js                → readable copies of the Code nodes (already inside the JSON)

Before importing the n8n files, find-and-replace in all four JSON files:
  YOUR_TELEGRAM_CHAT_ID          → your Telegram group chat ID
  https://YOUR-STORE.vercel.app  → your deployed site URL (only in 01-order-intake.json)

# COC Systems Engineering Platform

## Setup
1. `npm install`
2. Copy `.env.example` → `.env.local`, fill in Supabase credentials
3. `npm run dev`

## Deployment
- Frontend: Vercel or any static host
- Backend: Supabase (cloud or self-hosted) with the versioned `api-v1` Edge Function

See [deployment and operations](docs/deployment.md) for the API contract, migration workflow, secrets, storage, encryption, and backup requirements.

# Deployment and operations

## Architecture and API contract

The React application calls typed application services in `src/services`; components must never import the Supabase client. Database-shaped values are confined to service/infrastructure adapters and are mapped to the camel-case domain models in `src/models`. `src/infrastructure/supabase/database.types.ts` is generated from the migration schema.

`supabase/functions/api-v1` is the stable REST/BFF entry point for server integrations. Its base URL is `https://<project-ref>.supabase.co/functions/v1/api-v1`; current routes are `GET /health`, `GET /workspaces`, `GET /projects?workspaceId=<uuid>`, and `GET /pages?projectId=<uuid>`. Send `Authorization: Bearer <user JWT>` and `apikey: <anon key>`. Responses are `{data,meta:{apiVersion:"v1"}}`; failures are `{error:{code,message}}`. Breaking contracts get a new `api-v2` function—never silently change v1. The BFF forwards the user token so PostgreSQL RLS, not a service-role bypass, authorizes every query.

## Configuration and secrets

For both targets, build the frontend with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These are public browser credentials; **never** put the service-role key, database password, JWT secret, SMTP password, or storage credentials in a `VITE_*` variable. Configure allowed Site URL/redirect URLs and OAuth providers in Supabase Auth. Edge Functions receive `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Supabase; put any additional server-only value in `supabase secrets set`, and rotate it through the provider secret manager.

### Supabase Cloud

1. Create separate projects for development, staging, and production and configure Auth URLs/providers.
2. Link and apply schema: `supabase link --project-ref <ref>` then `supabase db push --include-all`.
3. Deploy the BFF: `supabase functions deploy api-v1 --no-verify-jwt=false`.
4. Create frontend environment variables in the hosting provider and deploy the immutable build output.

Cloud encrypts network traffic with TLS and managed database/storage volumes at rest. Application attachment objects are private and authorized using RLS. If policy or contractual requirements demand application-layer encryption, encrypt before upload and keep envelope-encryption keys in a KMS—not in PostgreSQL or browser configuration.

### Self-hosted

Pin a released Supabase Docker compose version rather than `latest`. Supply high-entropy, distinct `POSTGRES_PASSWORD`, `JWT_SECRET`, anon/service JWTs, dashboard credentials, SMTP credentials, and S3 keys through Docker/Kubernetes secrets. Terminate TLS at a trusted reverse proxy, restrict Postgres/Studio/admin endpoints to private networks, and persist Postgres and object-storage volumes on encrypted disks. Configure an S3-compatible private bucket (or persistent Storage volume), lifecycle policy, CORS, upload-size limits, malware scanning where required, and the same `attachments/<workspace-uuid>/...` object naming assumed by storage RLS.

## Migrations and generated types

Migration files are immutable and ordered in `supabase/migrations`. Create a new file with `supabase migration new <name>`; never edit a migration already applied to a shared environment. Validate from an empty database with `supabase db reset`, inspect the generated diff, and regenerate models using `npm run db:types`. Commit the migration and generated type file together. Promote the exact commit dev → staging → production, run `supabase db push --dry-run`, take a backup, then run `supabase db push --include-all`. Prefer additive/expand-contract changes; deploy code that tolerates both schemas before destructive cleanup. Roll forward with a corrective migration instead of rolling migration history back.

## Backup, recovery, and monitoring

Enable managed daily backups and point-in-time recovery for the production Cloud project according to the required RPO/RTO. For self-hosting, schedule encrypted `pg_dump` backups plus WAL archiving/PITR and versioned object-storage replication. Database backups do **not** replace storage-object backups. Store copies in a separate account/region, restrict and audit access, define retention/deletion schedules, and test a full database + object restore to an isolated environment at least quarterly.

Monitor failed Edge Function requests, Auth anomalies, database/storage capacity, replication lag, and backup completion. Realtime is published only for collaborative page/canvas/sheet tables by migration; adding a table requires an explicit reviewed publication change. After restore, verify migrations, RLS policies, bucket privacy, representative tenant isolation, Realtime subscriptions, and signed attachment access before reopening traffic.


import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** Versioned BFF entry point. It forwards the caller JWT; RLS remains the final authorization boundary. */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(request.url);
  const segments = url.pathname.replace(/^.*\/api-v1\/?/, '').split('/').filter(Boolean);
  if (segments[0] === 'health') return json({ status: 'ok', apiVersion: 'v1' });

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: { code: 'unauthorized', message: 'Bearer token required' } }, 401);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
  });

  try {
    let query;
    if (request.method === 'GET' && segments[0] === 'workspaces') {
      query = db.from('workspace').select('*').is('deleted_at', null).order('created_at');
    } else if (request.method === 'GET' && segments[0] === 'projects') {
      const workspaceId = url.searchParams.get('workspaceId');
      if (!workspaceId) return json({ error: { code: 'invalid_request', message: 'workspaceId is required' } }, 400);
      query = db.from('project').select('*').eq('workspace_id', workspaceId).is('deleted_at', null).order('created_at');
    } else if (request.method === 'GET' && segments[0] === 'pages') {
      const projectId = url.searchParams.get('projectId');
      if (!projectId) return json({ error: { code: 'invalid_request', message: 'projectId is required' } }, 400);
      query = db.from('page').select('*').eq('project_id', projectId).is('deleted_at', null).order('position');
    } else {
      return json({ error: { code: 'not_found', message: 'Unknown API v1 route' } }, 404);
    }
    const { data, error } = await query;
    if (error) return json({ error: { code: error.code, message: error.message } }, 400);
    return json({ data, meta: { apiVersion: 'v1' } });
  } catch (error) {
    return json({ error: { code: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' } }, 500);
  }
});


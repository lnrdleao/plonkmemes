import { NextResponse } from 'next/server';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bfwdlanqfokvmxhzfdie.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmd2RsYW5xZm9rdm14aHpmZGllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc5Mzg1NywiZXhwIjoyMTA0MzY5ODU3fQ.n6b0zpr1zb67a-nn9SHtk88aPtx0JKcvZlh9CJjdz34';
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmd2RsYW5xZm9rdm14aHpmZGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3OTM4NTcsImV4cCI6MjEwNDM2OTg1N30.uQEduoqmdNY9pErx0p8LUlJTADg_Rpg0CcNYs7QiB6E';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const results: Record<string, any> = {};
  const timestamp = new Date().toISOString();

  // 1. Ping PostgreSQL via GoTrue Admin API (executes SQL on auth.users in Postgres)
  try {
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      cache: 'no-store',
    });
    results.auth_database_query = {
      status: authRes.status,
      ok: authRes.ok,
    };
  } catch (err: any) {
    results.auth_database_query = { error: err.message };
  }

  // 2. Ping PostgreSQL via PostgREST schema table (executes SQL query on public.sound_stats)
  try {
    const restRes = await fetch(`${SUPABASE_URL}/rest/v1/sound_stats?select=count`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      cache: 'no-store',
    });
    results.rest_database_query = {
      status: restRes.status,
      ok: restRes.ok,
    };
  } catch (err: any) {
    results.rest_database_query = { error: err.message };
  }

  // 3. Ping Supabase Storage API (executes SQL on storage.buckets)
  try {
    const storageRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      cache: 'no-store',
    });
    results.storage_query = {
      status: storageRes.status,
      ok: storageRes.ok,
    };
  } catch (err: any) {
    results.storage_query = { error: err.message };
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Supabase keep-alive ping executed successfully',
    timestamp,
    queries: results,
  });
}

export async function POST(request: Request) {
  return GET(request);
}

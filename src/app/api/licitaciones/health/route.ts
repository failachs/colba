/**
 * GET /api/licitaciones/health
 * Diagnóstico completo según documentación oficial confirmada.
 */
import { NextResponse } from 'next/server';

export async function GET() {
  const base     = process.env.LICI_INFO_BASE_URL?.replace(/\/$/, '');
  const email    = process.env.LICI_INFO_EMAIL    ?? '';
  const password = process.env.LICI_INFO_PASSWORD ?? '';

  if (!base) return NextResponse.json({ ok: false, error: 'LICI_INFO_BASE_URL no configurada' });

  // ── 1. Login ──────────────────────────────────────────────────────────────
  const loginRes = await fetch(`${base}/api/client/auth-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });
  const loginText = await loginRes.text();
  let loginData: Record<string, unknown> = {};
  try { loginData = JSON.parse(loginText); } catch { /* noop */ }

  // Extraer token JWT
  const tokenObj = loginData.token as Record<string, unknown> | undefined;
  const token = typeof tokenObj?.accessToken === 'string' ? tokenObj.accessToken : null;

  if (!token) {
    return NextResponse.json({
      ok: false, paso: 'login',
      login_status: loginRes.status,
      login_response: loginData,
    });
  }

  // ── 2. Perfiles con token JWT (según documentación) ───────────────────────
  // Docs dicen: GET /api/client/perfiles/consultar con BearerAuth
  // Probamos las dos formas posibles: query string y Authorization header

  const perfQS = await fetch(`${base}/api/client/perfiles/consultar?token=${token}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const perfQSText = await perfQS.text();

  const perfBearer = await fetch(`${base}/api/client/perfiles/consultar`, {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const perfBearerText = await perfBearer.text();

  // ── 3. Procesos directamente con perfiles hardcodeados ────────────────────
  const perfiles = '843884,843918,843818';
  const procRes = await fetch(`${base}/api/client/contratos/consultar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      token,
      perfiles,
      page: 1,
      limit: 2,
      filtrar_nuevos: 0,
      query: '',
      ascending: 0,
      campos_adicionales: '',
    }),
    cache: 'no-store',
  });
  const procText = await procRes.text();
  let procData: unknown = null;
  try { procData = JSON.parse(procText); } catch { /* noop */ }

  return NextResponse.json({
    login: {
      status:        loginRes.status,
      token_preview: token.slice(0, 40) + '…',
      token_length:  token.length,
      expires_at:    tokenObj?.expires_at ?? null,
    },
    perfiles_query_string: {
      status:      perfQS.status,
      preview:     perfQSText.slice(0, 200),
    },
    perfiles_bearer_header: {
      status:      perfBearer.status,
      preview:     perfBearerText.slice(0, 200),
    },
    procesos_directo: {
      status:      procRes.status,
      preview:     procText.slice(0, 400),
      data:        procData,
    },
  });
}
/**
 * GET /api/licitaciones/debug?codigo=MC-007-2026
 * Diagnóstico completo — muestra respuesta cruda del 401 para campos_adicionales
 */
import { NextRequest, NextResponse } from 'next/server';
import { liciLogin } from '@/lib/licitaciones-info';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const codigo = searchParams.get('codigo') ?? '';
  const base   = process.env.LICI_INFO_BASE_URL?.replace(/\/$/, '');
  if (!base) return NextResponse.json({ ok: false, error: 'LICI_INFO_BASE_URL no configurada' });

  try {
    const token = await liciLogin();

    // Probar campos_adicionales con y sin Authorization header
    const variantes = [
      { campos: 'fechas,documentos', useBearer: true,  label: 'fechas,documentos + Bearer' },
      { campos: 'fechas,documentos', useBearer: false, label: 'fechas,documentos sin Bearer' },
      { campos: 'fechas',            useBearer: true,  label: 'fechas + Bearer' },
      { campos: 'documentos',        useBearer: true,  label: 'documentos + Bearer' },
      { campos: 'fechas,documentos', useBearer: true,  label: 'fechas,documentos + Bearer (sin query)' },
    ];

    const resultados: Record<string, unknown> = {};

    for (const v of variantes) {
      const body: Record<string, unknown> = {
        token,
        perfiles: '843884,843918,843818',
        page:  1,
        limit: 2,
        campos_adicionales: v.campos,
      };
      // Solo agrega query si tiene codigo
      if (codigo && v.label.indexOf('sin query') === -1) {
        body.query = JSON.stringify({ CodigoProceso: codigo });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (v.useBearer) headers.Authorization = `Bearer ${token}`;

      const res  = await fetch(`${base}/api/client/contratos/consultar`, {
        method: 'POST', headers,
        body: JSON.stringify(body),
        cache: 'no-store',
      });

      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text.slice(0, 600); }

      const d = data as Record<string, unknown>;
      const lote = Array.isArray(d?.data) ? d.data as Record<string,unknown>[] : [];
      const first = lote[0];

      resultados[v.label] = {
        status:      res.status,
        ok:          res.ok,
        // Si 401 — mostrar body completo para ver el mensaje de error exacto
        body_raw:    res.status !== 200 ? data : undefined,
        count:       d?.count ?? d?.total ?? lote.length,
        keys:        first ? Object.keys(first) : [],
        // Campos que incluyen fechas/docs/cronograma
        campos_doc:  first ? Object.fromEntries(
          Object.entries(first).filter(([k]) => /crono|fecha|doc|file|adjunt|link|url/i.test(k))
        ) : null,
        first_raw:   first ?? null,
      };
    }

    // También mostrar el token usado (primeros 60 chars) para verificar
    return NextResponse.json({
      ok: true,
      token_preview: token.slice(0, 60) + '…',
      token_length:  token.length,
      base_url:      base,
      resultados,
    });

  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
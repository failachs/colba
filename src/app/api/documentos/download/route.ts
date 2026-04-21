import { NextRequest, NextResponse } from 'next/server';

type FormInput = {
  name: string;
  value: string;
};

type HtmlForm = {
  action: string;
  method: 'GET' | 'POST';
  inputs: FormInput[];
};

function nombreSeguro(nombre: string) {
  return nombre
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

function esHtml(contentType: string | null) {
  return (contentType || '').toLowerCase().includes('text/html');
}

function esArchivo(contentType: string | null) {
  const ct = (contentType || '').toLowerCase();

  return (
    ct.includes('application/pdf') ||
    ct.includes('application/octet-stream') ||
    ct.includes('application/zip') ||
    ct.includes('application/x-zip') ||
    ct.includes('application/msword') ||
    ct.includes('application/vnd.openxmlformats-officedocument') ||
    ct.includes('application/vnd.ms-excel') ||
    ct.includes('application/vnd.openxmlformats-officedocument.spreadsheetml') ||
    ct.includes('application/vnd.ms-powerpoint') ||
    ct.includes('application/vnd.openxmlformats-officedocument.presentationml') ||
    ct.includes('image/') ||
    ct.includes('audio/') ||
    ct.includes('video/')
  );
}

function extDesdeContentType(contentType: string) {
  const ct = contentType.toLowerCase();

  if (ct.includes('pdf')) return '.pdf';
  if (ct.includes('msword')) return '.doc';
  if (ct.includes('wordprocessingml')) return '.docx';
  if (ct.includes('ms-excel')) return '.xls';
  if (ct.includes('spreadsheetml')) return '.xlsx';
  if (ct.includes('ms-powerpoint')) return '.ppt';
  if (ct.includes('presentationml')) return '.pptx';
  if (ct.includes('zip')) return '.zip';
  if (ct.includes('rar')) return '.rar';
  if (ct.includes('png')) return '.png';
  if (ct.includes('jpeg')) return '.jpg';
  if (ct.includes('jpg')) return '.jpg';
  return '';
}

function nombreConExtension(nombre: string, contentType: string) {
  const limpio = nombreSeguro(nombre || 'documento');
  const ext = extDesdeContentType(contentType);

  if (!ext) return limpio;
  if (limpio.toLowerCase().endsWith(ext)) return limpio;

  return `${limpio}${ext}`;
}

function extraerNombreDesdeDisposition(contentDisposition: string | null) {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (basicMatch?.[1]) {
    return basicMatch[1];
  }

  return null;
}

function absolutizarUrl(url: string, base: string) {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

function extraerFormularioHtml(html: string, baseUrl: string): HtmlForm | null {
  const formMatch = html.match(/<form[^>]*action=['"]([^'"]+)['"][^>]*method=['"]([^'"]+)['"][^>]*>/i)
    || html.match(/<form[^>]*method=['"]([^'"]+)['"][^>]*action=['"]([^'"]+)['"][^>]*>/i);

  if (!formMatch) return null;

  let action = '';
  let method = 'GET';

  if (formMatch[0].includes('action=') && formMatch[0].includes('method=')) {
    const actionAttr = formMatch[0].match(/action=['"]([^'"]+)['"]/i);
    const methodAttr = formMatch[0].match(/method=['"]([^'"]+)['"]/i);
    action = actionAttr?.[1] || '';
    method = (methodAttr?.[1] || 'GET').toUpperCase();
  }

  if (!action) return null;

  const inputs = [...html.matchAll(/<input[^>]*name=['"]([^'"]+)['"][^>]*value=['"]([^'"]*)['"][^>]*>/gi)]
    .map((m) => ({
      name: m[1],
      value: m[2],
    }));

  return {
    action: absolutizarUrl(action, baseUrl),
    method: method === 'POST' ? 'POST' : 'GET',
    inputs,
  };
}

async function ejecutarFormulario(form: HtmlForm, referer: string) {
  if (form.method === 'POST') {
    const body = new URLSearchParams();
    for (const input of form.inputs) {
      body.set(input.name, input.value);
    }

    return fetch(form.action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        Accept: '*/*',
        Referer: referer,
        Origin: new URL(form.action).origin,
      },
      body: body.toString(),
      redirect: 'follow',
      cache: 'no-store',
    });
  }

  const qs = new URLSearchParams();
  for (const input of form.inputs) {
    qs.set(input.name, input.value);
  }

  const finalUrl = `${form.action}${form.action.includes('?') ? '&' : '?'}${qs.toString()}`;

  return fetch(finalUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: '*/*',
      Referer: referer,
    },
    redirect: 'follow',
    cache: 'no-store',
  });
}

async function resolverDescarga(url: string, maxSaltos = 4): Promise<Response> {
  let actualUrl = url;

  for (let intento = 0; intento < maxSaltos; intento++) {
    const resp = await fetch(actualUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: '*/*',
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      throw new Error(`No se pudo descargar el documento. HTTP ${resp.status}`);
    }

    const contentType = resp.headers.get('content-type') || 'application/octet-stream';

    if (esArchivo(contentType)) {
      return resp;
    }

    if (!esHtml(contentType)) {
      return resp;
    }

    const html = await resp.text();
    const form = extraerFormularioHtml(html, actualUrl);

    if (!form) {
      throw new Error(
        JSON.stringify({
          ok: false,
          error: 'El origen devolvió HTML y no se pudo resolver automáticamente.',
          contentType,
          preview: html.slice(0, 500),
          url: actualUrl,
        })
      );
    }

    const siguiente = await ejecutarFormulario(form, actualUrl);

    if (!siguiente.ok) {
      throw new Error(`No se pudo resolver el formulario intermedio. HTTP ${siguiente.status}`);
    }

    const nextType = siguiente.headers.get('content-type') || 'application/octet-stream';

    if (esArchivo(nextType)) {
      return siguiente;
    }

    if (esHtml(nextType)) {
      const html2 = await siguiente.text();
      const form2 = extraerFormularioHtml(html2, form.action);

      if (!form2) {
        throw new Error(
          JSON.stringify({
            ok: false,
            error: 'El documento final sigue devolviendo HTML y no se pudo resolver automáticamente.',
            contentType: nextType,
            preview: html2.slice(0, 500),
            url: form.action,
          })
        );
      }

      actualUrl = form.action;
      continue;
    }

    return siguiente;
  }

  throw new Error('Se alcanzó el máximo de pasos de resolución sin obtener un archivo real.');
}

export async function GET(req: NextRequest) {
  try {
    const urlParam = req.nextUrl.searchParams.get('url');
    const nombreParam = req.nextUrl.searchParams.get('nombre') || 'documento';

    if (!urlParam) {
      return NextResponse.json(
        { ok: false, error: 'Falta la URL del documento.' },
        { status: 400 }
      );
    }

    const target = decodeURIComponent(urlParam);
    const upstream = await resolverDescarga(target);
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = upstream.headers.get('content-disposition');

    if (esHtml(contentType)) {
      const html = await upstream.text();
      return NextResponse.json(
        {
          ok: false,
          error: 'El origen devolvió HTML en vez del archivo real.',
          contentType,
          preview: html.slice(0, 500),
          url: target,
        },
        { status: 502 }
      );
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const nombreHeader = extraerNombreDesdeDisposition(contentDisposition);
    const nombreFinal = nombreConExtension(nombreHeader || nombreParam, contentType);

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${nombreFinal}"`,
        'Content-Length': String(arrayBuffer.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[GET /api/documentos/download]', error);

    if (error instanceof Error) {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed?.ok === false) {
          return NextResponse.json(parsed, { status: 502 });
        }
      } catch {
        // no-op
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error al descargar el documento.',
      },
      { status: 500 }
    );
  }
}
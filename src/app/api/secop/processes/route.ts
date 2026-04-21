import { NextRequest, NextResponse } from 'next/server';

const SOCRATA_URL = 'https://www.datos.gov.co/resource/p6dx-8zbt.json';
const APP_TOKEN = process.env.NEXT_PUBLIC_SOCRATA_APP_TOKEN || '';
const SMMLV_BASE = 35587500;

const UNSPSC_ASEO = [
  'V1.76111500',
  'V1.76111501',
  'V1.76111504',
  'V1.76111505',
  'V1.76111506',
  'V1.76111600',
  'V1.76111601',
  'V1.76111602',
  'V1.76111603',
  'V1.76111604',
  'V1.76111605',
];

const UNSPSC_TEMPO = [
  'V1.80111600',
  'V1.80111601',
  'V1.80111602',
  'V1.80111604',
  'V1.80111700',
];

const UNSPSC_VIGI = [
  'V1.92121500',
  'V1.92121501',
  'V1.92121502',
  'V1.92121504',
  'V1.92121700',
  'V1.92121701',
  'V1.92121702',
  'V1.92121703',
  'V1.92121704',
  'V1.46171600',
  'V1.46171602',
  'V1.46171604',
  'V1.46171610',
  'V1.46171619',
];

const DEPARTAMENTOS_ASEO = [
  'Antioquia',
  'Atlántico',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Cauca',
  'Cesar',
  'Córdoba',
  'Cundinamarca',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Nariño',
  'Norte de Santander',
  'Quindío',
  'Risaralda',
  'San Andrés, Providencia y Santa Catalina',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
];

const DEPARTAMENTOS_TEMPO = [
  'Antioquia',
  'Atlántico',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Cauca',
  'Cesar',
  'Córdoba',
  'Cundinamarca',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Nariño',
  'Norte de Santander',
  'Quindío',
  'Risaralda',
  'San Andrés, Providencia y Santa Catalina',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
];

const DEPARTAMENTOS_VIGI = [
  'Atlántico',
  'Bolívar',
  'Cundinamarca',
  'Magdalena',
];

type EmpresaConfig = {
  key: 'aseo' | 'tempo' | 'vigi';
  empresa: string;
  nomEmpresa: string;
  unspsc: string[];
  departamentos?: string[];
};

type ProcesoRow = {
  empresa: string;
  nom_empresa: string;
  entidad: string;
  referencia_del_proceso: string;
  descripci_n_del_procedimiento: string;
  fase: string;
  departamento_entidad: string;
  ciudad_entidad: string;
  fecha_de_publicacion_del: string;
  fecha_de_ultima_publicaci: string;
  precio_base: string;
  estado_resumen: string;
  estado_del_procedimiento: string;
  urlproceso: string;
  modalidad_de_contratacion: string;
  codigo_principal_de_categoria: string;
  duracion: string;
  unidad_de_duracion: string;
  fecha_de_recepcion_de: string;
  fecha_de_apertura_efectiva: string;
  id_estado_procedimiento: string;
  id_del_proceso: string;
  codigo_pci: string;
  id_del_portafolio: string;
};

const EMPRESAS: EmpresaConfig[] = [
  {
    key: 'aseo',
    empresa: '01',
    nomEmpresa: 'ASEOCOLBA',
    unspsc: UNSPSC_ASEO,
    departamentos: DEPARTAMENTOS_ASEO,
  },
  {
    key: 'tempo',
    empresa: '02',
    nomEmpresa: 'TEMPOCOLBA',
    unspsc: UNSPSC_TEMPO,
    departamentos: DEPARTAMENTOS_TEMPO,
  },
  {
    key: 'vigi',
    empresa: '04',
    nomEmpresa: 'VIGICOLBA',
    unspsc: UNSPSC_VIGI,
    departamentos: DEPARTAMENTOS_VIGI,
  },
];

function inClause(values: string[]) {
  return `(${values.map((v) => `'${v.replace(/'/g, "''")}'`).join(',')})`;
}

function buildWhereClause(params: {
  desde: string;
  q: string;
  unspsc: string[];
  departamentos?: string[];
}) {
  const { desde, q, unspsc, departamentos } = params;
  const whereParts: string[] = [];

  // Todo 2026 en adelante
  whereParts.push(`fecha_de_publicacion_del >= '${desde.replace(/'/g, "''")}'`);

  // Filtros base
  whereParts.push(`precio_base >= ${SMMLV_BASE}`);
  whereParts.push(`codigo_principal_de_categoria in ${inClause(unspsc)}`);

  // Departamentos por empresa
  if (departamentos?.length) {
    whereParts.push(`departamento_entidad in ${inClause(departamentos)}`);
  }

  // Búsqueda libre opcional
  if (q) {
    const safeQ = q.replace(/'/g, "''");
    whereParts.push(
      `(
        upper(referencia_del_proceso) like upper('%${safeQ}%')
        OR upper(entidad) like upper('%${safeQ}%')
        OR upper(nombre_del_procedimiento) like upper('%${safeQ}%')
        OR upper(descripci_n_del_procedimiento) like upper('%${safeQ}%')
      )`
    );
  }

  return whereParts.join(' AND ');
}

function getProcesoTimestamp(item: ProcesoRow) {
  const fechas = [
    item.fecha_de_publicacion_del,
    item.fecha_de_ultima_publicaci,
    item.fecha_de_apertura_efectiva,
    item.fecha_de_recepcion_de,
  ]
    .filter(Boolean)
    .map((f) => new Date(f).getTime())
    .filter((n) => !Number.isNaN(n));

  return fechas.length ? Math.max(...fechas) : 0;
}

function buildProcesoKey(item: ProcesoRow) {
  if (item.id_del_portafolio) {
    return `PORT:${item.id_del_portafolio}`;
  }

  if (item.codigo_pci && item.referencia_del_proceso) {
    return `PCIREF:${item.codigo_pci}::${item.referencia_del_proceso}`;
  }

  if (item.referencia_del_proceso) {
    return `REF:${item.referencia_del_proceso}`;
  }

  return `PROC:${item.id_del_proceso}`;
}

async function fetchEmpresaData(
  config: EmpresaConfig,
  desde: string,
  q: string,
  limit: number,
  offset: number
): Promise<ProcesoRow[]> {
  const whereClause = buildWhereClause({
    desde,
    q,
    unspsc: config.unspsc,
    departamentos: config.departamentos,
  });

  const baseParams =
    `$where=${encodeURIComponent(whereClause)}` +
    (APP_TOKEN ? `&$$app_token=${encodeURIComponent(APP_TOKEN)}` : '');

  const dataUrl =
    `${SOCRATA_URL}?${baseParams}` +
    `&$limit=${limit}` +
    `&$offset=${offset}` +
    `&$order=${encodeURIComponent('fecha_de_publicacion_del DESC')}`;

  const response = await fetch(dataUrl, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`SECOP ${config.key} error ${response.status}: ${raw}`);
  }

  const data = JSON.parse(raw);

  return Array.isArray(data)
    ? data.map((item: Record<string, any>) => ({
        empresa: config.empresa,
        nom_empresa: config.nomEmpresa,
        entidad: item.entidad || '',
        referencia_del_proceso: item.referencia_del_proceso || '',
        descripci_n_del_procedimiento: item.descripci_n_del_procedimiento || '',
        fase: item.fase || '',
        departamento_entidad: item.departamento_entidad || '',
        ciudad_entidad: item.ciudad_entidad || '',
        fecha_de_publicacion_del: item.fecha_de_publicacion_del || '',
        fecha_de_ultima_publicaci: item.fecha_de_ultima_publicaci || '',
        precio_base: item.precio_base || '0',
        estado_resumen: item.estado_resumen || '',
        estado_del_procedimiento: item.estado_del_procedimiento || '',
        urlproceso: item.urlproceso?.url || '',
        modalidad_de_contratacion: item.modalidad_de_contratacion || '',
        codigo_principal_de_categoria: item.codigo_principal_de_categoria || '',
        duracion: item.duracion || '',
        unidad_de_duracion: item.unidad_de_duracion || '',
        fecha_de_recepcion_de: item.fecha_de_recepcion_de || '',
        fecha_de_apertura_efectiva: item.fecha_de_apertura_efectiva || '',
        id_estado_procedimiento: item.id_estado_del_procedimiento || '',
        id_del_proceso: item.id_del_proceso || '',
        codigo_pci: item.codigo_pci || '',
        id_del_portafolio: item.id_del_portafolio || item.id_portafolio || '',
      }))
    : [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const tipo = String(searchParams.get('tipo') || 'all').trim().toLowerCase();
    const desde = '2026-01-01T00:00:00';
    const q = String(searchParams.get('q') || '').trim();
    const page = Math.max(Number(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || '50'), 1), 500);

    const empresasSeleccionadas =
      tipo === 'aseo'
        ? EMPRESAS.filter((e) => e.key === 'aseo')
        : tipo === 'tempo'
          ? EMPRESAS.filter((e) => e.key === 'tempo')
          : tipo === 'vigi'
            ? EMPRESAS.filter((e) => e.key === 'vigi')
            : EMPRESAS;

    // Trae un lote amplio antes de deduplicar
    const fetchLimit = Math.max(limit * page * 10, 300);
    const offset = 0;

    const resultadosPorEmpresa = await Promise.all(
      empresasSeleccionadas.map((empresa) =>
        fetchEmpresaData(empresa, desde, q, fetchLimit, offset)
      )
    );

    const merged = resultadosPorEmpresa.flat();

    // Orden preliminar
    merged.sort((a, b) => getProcesoTimestamp(b) - getProcesoTimestamp(a));

    // Deduplicación: se queda con el más reciente
    const uniqueMap = new Map<string, ProcesoRow>();

    for (const item of merged) {
      const key = buildProcesoKey(item);
      const existing = uniqueMap.get(key);

      if (!existing) {
        uniqueMap.set(key, item);
        continue;
      }

      if (getProcesoTimestamp(item) > getProcesoTimestamp(existing)) {
        uniqueMap.set(key, item);
      }
    }

    const deduped = Array.from(uniqueMap.values());

    // ORDEN FINAL: más reciente → más antigua
    deduped.sort((a, b) => getProcesoTimestamp(b) - getProcesoTimestamp(a));

    // Paginación después de deduplicar y ordenar
    const start = (page - 1) * limit;
    const end = start + limit;
    const paged = deduped.slice(start, end);

    return NextResponse.json({
      tipo,
      desde,
      q,
      page,
      limit,
      count: deduped.length,
      returned: paged.length,
      totalPages: Math.ceil(deduped.length / limit),
      results: paged,
    });
  } catch (error) {
    console.error('Error en /api/secop/processes:', error);

    return NextResponse.json(
      {
        error: 'No se pudo obtener la información de procesos.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
'use client';

import { useMemo, useState } from 'react';

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
};

type ProcessesResponse = {
  tipo: string;
  desde: string;
  q: string;
  page: number;
  limit: number;
  count: number;
  returned: number;
  totalPages: number;
  results: ProcesoRow[];
};

type DocumentoSecop = {
  nombre: string;
  href?: string;
};

type EventoCronograma = {
  evento: string;
  valor: string;
};

type DetalleSecop = {
  url: string;
  urlFinal?: string;
  titulo?: string;
  estado?: string;
  documentos: DocumentoSecop[];
  cronograma: EventoCronograma[];
  textoPlano?: string;
};

type PersistedSecop = {
  procesoId: number;
  sourceKey: string;
  codigoProceso: string | null;
  totalCronogramas: number;
  totalDocumentos: number;
  hashDetalle: string;
  reusedProceso: boolean;
};

type DetalleResponse = {
  ok: boolean;
  data?: DetalleSecop;
  persisted?: PersistedSecop;
  error?: string;
};

function formatearFecha(valor?: string) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleString('es-CO');
}

function formatearDinero(valor?: string) {
  const n = Number(valor || 0);
  if (Number.isNaN(n)) return valor || '-';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function SecopTestPage() {
  const [tipo, setTipo] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [loadingProcesos, setLoadingProcesos] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [errorProcesos, setErrorProcesos] = useState('');
  const [errorDetalle, setErrorDetalle] = useState('');

  const [procesos, setProcesos] = useState<ProcesoRow[]>([]);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [detalle, setDetalle] = useState<DetalleSecop | null>(null);
  const [persisted, setPersisted] = useState<PersistedSecop | null>(null);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoRow | null>(null);

  const tituloPanel = useMemo(() => {
    if (!procesoSeleccionado) return 'Detalle del proceso';
    return procesoSeleccionado.referencia_del_proceso || 'Detalle del proceso';
  }, [procesoSeleccionado]);

  async function consultarProcesos() {
    try {
      setLoadingProcesos(true);
      setErrorProcesos('');
      setDetalle(null);
      setPersisted(null);
      setProcesoSeleccionado(null);

      const params = new URLSearchParams({
        tipo,
        q,
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(`/api/secop/processes?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const raw = await res.json();

      if (!res.ok) {
        throw new Error(raw?.detail || raw?.error || 'No se pudieron consultar los procesos.');
      }

      const data = raw as ProcessesResponse;

      setProcesos(Array.isArray(data.results) ? data.results : []);
      setCount(data.count || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      setProcesos([]);
      setCount(0);
      setTotalPages(0);
      setErrorProcesos(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoadingProcesos(false);
    }
  }

  async function verDetalle(proceso: ProcesoRow) {
    try {
      if (!proceso.urlproceso) {
        throw new Error('Este proceso no trae urlproceso.');
      }

      setLoadingDetalle(true);
      setErrorDetalle('');
      setDetalle(null);
      setPersisted(null);
      setProcesoSeleccionado(proceso);

      const res = await fetch('/api/secop/detalle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: proceso.urlproceso }),
      });

      const raw = (await res.json()) as DetalleResponse;

      if (!res.ok || !raw.ok || !raw.data) {
        throw new Error(raw?.error || 'No se pudo obtener el detalle del proceso.');
      }

      setDetalle(raw.data);
      setPersisted(raw.persisted || null);
    } catch (error) {
      setDetalle(null);
      setPersisted(null);
      setErrorDetalle(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoadingDetalle(false);
    }
  }

  return (
    <div style={{ padding: 24, display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>SECOP Test</h1>
        <p style={{ opacity: 0.8 }}>
          Consulta procesos desde Datos Abiertos, abre el detalle de la ficha pública con Playwright y valida persistencia en BD.
        </p>
      </div>

      <section
        style={{
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          padding: 16,
          display: 'grid',
          gap: 12,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Filtros</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8 }}
            >
              <option value="all">Todos</option>
              <option value="aseo">Aseo</option>
              <option value="tempo">Tempo</option>
              <option value="vigi">Vigi</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Búsqueda</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Entidad, referencia, descripción..."
              style={{ width: '100%', padding: 10, borderRadius: 8 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Página</label>
            <input
              type="number"
              min={1}
              value={page}
              onChange={(e) => setPage(Number(e.target.value || 1))}
              style={{ width: '100%', padding: 10, borderRadius: 8 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Límite</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{ width: '100%', padding: 10, borderRadius: 8 }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={consultarProcesos}
            disabled={loadingProcesos}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {loadingProcesos ? 'Consultando...' : 'Consultar procesos'}
          </button>
        </div>

        {errorProcesos ? (
          <div
            style={{
              background: '#3a1515',
              border: '1px solid #7a2a2a',
              color: '#ffd3d3',
              padding: 12,
              borderRadius: 8,
            }}
          >
            {errorProcesos}
          </div>
        ) : null}
      </section>

      <section
        style={{
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          padding: 16,
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Resultados</h2>
          <div style={{ opacity: 0.8 }}>
            {count} encontrados · {totalPages} páginas
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #2a2a2a' }}>
                <th style={{ padding: 10 }}>Empresa</th>
                <th style={{ padding: 10 }}>Referencia</th>
                <th style={{ padding: 10 }}>Entidad</th>
                <th style={{ padding: 10 }}>Departamento</th>
                <th style={{ padding: 10 }}>Estado</th>
                <th style={{ padding: 10 }}>Precio base</th>
                <th style={{ padding: 10 }}>Publicación</th>
                <th style={{ padding: 10 }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {procesos.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 16, opacity: 0.8 }}>
                    No hay resultados cargados todavía.
                  </td>
                </tr>
              ) : (
                procesos.map((proceso, index) => (
                  <tr key={`${proceso.referencia_del_proceso}-${index}`} style={{ borderBottom: '1px solid #1f1f1f' }}>
                    <td style={{ padding: 10 }}>{proceso.nom_empresa || proceso.empresa || '-'}</td>
                    <td style={{ padding: 10 }}>{proceso.referencia_del_proceso || '-'}</td>
                    <td style={{ padding: 10 }}>{proceso.entidad || '-'}</td>
                    <td style={{ padding: 10 }}>{proceso.departamento_entidad || '-'}</td>
                    <td style={{ padding: 10 }}>{proceso.estado_resumen || proceso.estado_del_procedimiento || '-'}</td>
                    <td style={{ padding: 10 }}>{formatearDinero(proceso.precio_base)}</td>
                    <td style={{ padding: 10 }}>{formatearFecha(proceso.fecha_de_publicacion_del)}</td>
                    <td style={{ padding: 10 }}>
                      <button
                        onClick={() => verDetalle(proceso)}
                        disabled={loadingDetalle}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {loadingDetalle && procesoSeleccionado?.urlproceso === proceso.urlproceso
                          ? 'Abriendo...'
                          : 'Ver detalle'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        style={{
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          padding: 16,
          display: 'grid',
          gap: 16,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>{tituloPanel}</h2>

        {errorDetalle ? (
          <div
            style={{
              background: '#3a1515',
              border: '1px solid #7a2a2a',
              color: '#ffd3d3',
              padding: 12,
              borderRadius: 8,
            }}
          >
            {errorDetalle}
          </div>
        ) : null}

        {!detalle && !loadingDetalle ? (
          <div style={{ opacity: 0.8 }}>
            Selecciona un proceso y pulsa <strong>Ver detalle</strong>.
          </div>
        ) : null}

        {loadingDetalle ? <div>Consultando detalle...</div> : null}

        {persisted ? (
      <div
        style={{
          background: '#0f2f1d',
          border: '1px solid #1f6b42',
          color: '#d8ffe8',
          padding: 12,
          borderRadius: 8,
          display: 'grid',
          gap: 6,
        }}
      >
        <div><strong>Persistencia OK en PostgreSQL</strong></div>
        <div>Proceso ID: {persisted.procesoId}</div>
        <div>SourceKey: {persisted.sourceKey}</div>
        <div>Código proceso: {persisted.codigoProceso || '-'}</div>
        <div>Total cronogramas: {persisted.totalCronogramas}</div>
        <div>Total documentos: {persisted.totalDocumentos}</div>
        <div>Hash detalle: {persisted.hashDetalle}</div>
        <div>Reutilizó proceso existente: {persisted.reusedProceso ? 'Sí' : 'No'}</div>
      </div>
    ) : null}

        {detalle ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              <div>
                <strong>Título:</strong>
                <div>{detalle.titulo || '-'}</div>
              </div>
              <div>
                <strong>Estado:</strong>
                <div>{detalle.estado || '-'}</div>
              </div>
              <div>
                <strong>URL enviada:</strong>
                <div style={{ wordBreak: 'break-all' }}>{detalle.url}</div>
              </div>
              <div>
                <strong>URL final:</strong>
                <div style={{ wordBreak: 'break-all' }}>{detalle.urlFinal || '-'}</div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Cronograma</h3>
              {detalle.cronograma.length === 0 ? (
                <div style={{ opacity: 0.8 }}>No se detectaron eventos de cronograma.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid #2a2a2a' }}>
                        <th style={{ padding: 10 }}>Evento</th>
                        <th style={{ padding: 10 }}>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.cronograma.map((item, idx) => (
                        <tr key={`${item.evento}-${idx}`} style={{ borderBottom: '1px solid #1f1f1f' }}>
                          <td style={{ padding: 10 }}>{item.evento}</td>
                          <td style={{ padding: 10 }}>{item.valor || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Documentos</h3>
              {detalle.documentos.length === 0 ? (
                <div style={{ opacity: 0.8 }}>No se detectaron documentos.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {detalle.documentos.map((doc, idx) => (
                    <div
                      key={`${doc.nombre}-${idx}`}
                      style={{
                        border: '1px solid #242424',
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      <div><strong>{doc.nombre || 'Documento'}</strong></div>
                      <div style={{ wordBreak: 'break-all', opacity: 0.8 }}>
                        {doc.href || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Texto plano extraído</h3>
              <textarea
                readOnly
                value={detalle.textoPlano || ''}
                style={{
                  width: '100%',
                  minHeight: 280,
                  padding: 12,
                  borderRadius: 8,
                  resize: 'vertical',
                }}
              />
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
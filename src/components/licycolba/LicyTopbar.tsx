'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LicyChangePasswordModal from './LicyChangePasswordModal';

interface Sesion {
  usuario?: string;
  cargo?: string;
  email?: string;
  rol?: string;
  entidadGrupo?: string;
  [key: string]: unknown;
}

interface Notif {
  id: number;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  codigoProceso: string | null;
  entidad: string | null;
  perfil: string | null;
  leida: boolean;
  creadoEn: string;
  fechaPublicacion?: string | null;
}

export interface LicyTopbarProps {
  moduloActual?: string;
  sesion?: Sesion | null;
  usuario?: Sesion | null;
  user?: Sesion | null;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  breadcrumbParent?: string;
  breadcrumbCurrent?: string;
  onNewRequest?: () => void;
  onSearch?: (q: string) => void;
  onBuscarGlobal?: (q: string) => void;
  onLogout?: () => void;
}

const CRUMBS: Record<string, { parent: string; current: string }> = {
  procesosNuevos:        { parent: 'Búsqueda de procesos', current: 'Procesos nuevos' },
  busquedaFinal:         { parent: 'Búsqueda de procesos', current: 'Todos los procesos' },
  solicitudesAbiertas:   { parent: 'Solicitudes', current: 'Abiertas' },
  solicitudesComercial:  { parent: 'Solicitudes', current: 'Comercial' },
  solicitudesEspecializada: { parent: 'Solicitudes', current: 'Especializados' },
  solicitudesRechazadas: { parent: 'Solicitudes', current: 'Rechazadas' },
  solicitudesEliminadas: { parent: 'Solicitudes', current: 'Eliminadas' },
  solicitudesTodas:      { parent: 'Solicitudes', current: 'Todas' },
  asignacionesPendientes:{ parent: 'Asignaciones', current: 'Pendientes' },
  asignacionesTerminadas:{ parent: 'Asignaciones', current: 'Terminadas' },
  usuarios:              { parent: 'Usuarios y perfiles', current: 'Usuarios' },
  usuariosEliminados:    { parent: 'Usuarios y perfiles', current: 'Eliminados' },
  examenesMedicos:       { parent: 'Módulos', current: 'Exámenes médicos' },
  dashboard:             { parent: 'LICYCOLBA', current: 'Dashboard' },
  trm:                   { parent: 'LICYCOLBA', current: 'TRM' },
};

function buildInitials(value: string) {
  const clean = String(value || '').trim();
  if (!clean) return 'US';
  const parts = clean.split(/[.\s@_-]+/).filter(Boolean).map(p => p[0]?.toUpperCase() ?? '');
  return parts.join('').slice(0, 2) || clean.slice(0, 2).toUpperCase() || 'US';
}

function formatearNombreUsuario(value: string) {
  const limpio = String(value || '').trim();
  if (!limpio) return 'Usuario';
  if (limpio.includes('@')) {
    const [local, domain] = limpio.split('@');
    const localFormateado = local.split('.').map(p => p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '').join('.');
    return `${localFormateado}@${String(domain || '').toLowerCase()}`;
  }
  return limpio.split('.').map(p => p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '').join('.');
}

function icoTipo(tipo: string) {
  if (tipo === 'proceso_nuevo')      return { icon: '🆕', bg: '#eff6ff' };
  if (tipo === 'cambio_cronograma')  return { icon: '📅', bg: '#fefce8' };
  if (tipo === 'documento_nuevo')    return { icon: '📄', bg: '#f0fdf4' };
  if (tipo === 'cambio_estado')      return { icon: '🔄', bg: '#faf5ff' };
  return { icon: '🔔', bg: '#f8fafc' };
}

function fmtTiempo(fecha: string) {
  const diff = Date.now() - new Date(fecha).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function LicyTopbar({
  moduloActual = '',
  sesion, usuario, user,
  userName, userRole, userInitials,
  breadcrumbParent, breadcrumbCurrent,
  onNewRequest, onSearch, onBuscarGlobal, onLogout,
}: LicyTopbarProps) {
  const [busqueda, setBusqueda] = useState('');
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [tab, setTab] = useState<'todas' | 'noLeidas'>('noLeidas');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement | null>(null);
  const userRef  = useRef<HTMLDivElement | null>(null);

  const sess = sesion ?? usuario ?? user;
  const nombreUsuarioRaw = userName ?? sess?.usuario ?? sess?.email ?? 'Usuario';
  const nombreUsuario = formatearNombreUsuario(String(nombreUsuarioRaw));
  const rolUsuario    = userRole ?? sess?.cargo ?? sess?.rol ?? 'Usuario';
  const initials      = userInitials ?? buildInitials(String(nombreUsuarioRaw));

  const crumb       = CRUMBS[moduloActual] ?? { parent: 'LICYCOLBA', current: moduloActual || 'Inicio' };
  const crumbParent = breadcrumbParent ?? crumb.parent;
  const crumbCurrent= breadcrumbCurrent ?? crumb.current;

  // ── Cargar notificaciones desde API ──────────────────────
  const cargarNotifs = useCallback(async () => {
    try {
      const res  = await fetch('/api/notificaciones?limit=50');
      const data = await res.json();
      if (data.ok) {
        setNotifs(data.notificaciones ?? []);
        setTotalNoLeidas(data.totalNoLeidas ?? 0);
      }
    } catch { /* silencioso */ }
  }, []);

  // Polling cada 30 segundos
  useEffect(() => {
  // Sync primero, luego cargar
  const syncYCargar = async () => {
    try { await fetch('/api/notificaciones/sync'); } catch { /* silencioso */ }
    await cargarNotifs();
  };
  syncYCargar();
  const iv = setInterval(syncYCargar, 60000); // cada 60 segundos
  return () => clearInterval(iv);
}, [cargarNotifs]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(t))  setUserMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setNotifOpen(false); setUserMenuOpen(false); setPwModalOpen(false); }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
  }, []);

  const marcarLeida = async (id: number) => {
    try {
      await fetch(`/api/notificaciones/${id}`, { method: 'PATCH' });
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
      setTotalNoLeidas(prev => Math.max(0, prev - 1));
    } catch { /* silencioso */ }
  };

  const marcarTodas = async () => {
    try {
      await fetch('/api/notificaciones', { method: 'PATCH' });
      setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
      setTotalNoLeidas(0);
    } catch { /* silencioso */ }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = busqueda.trim();
    onSearch?.(texto);
    onBuscarGlobal?.(texto);
  };

  const filtradas = tab === 'noLeidas' ? notifs.filter(n => !n.leida) : notifs;
  const F = 'var(--font)';

  return (
    <>
      <div className="licy-topbar">

        {/* Breadcrumb */}
        <div className="licy-topbar-crumb">
          <span className="licy-topbar-crumb-parent">{crumbParent}</span>
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ width: 12, height: 12 }}>
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span className="licy-topbar-crumb-current">{crumbCurrent}</span>
        </div>

        <div className="licy-topbar-space" />

        {/* Search */}
        <form className="licy-topbar-search" onSubmit={handleSearch}>
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input type="text" placeholder="Buscar aquí..." value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar"/>
        </form>

        {/* Campanita */}
        <div className="licy-notif-bell-wrap" ref={notifRef} style={{ position: 'relative' }}>
          <button type="button"
            className={`licy-topbar-bell${notifOpen ? ' licy-topbar-bell--active' : ''}`}
            title="Notificaciones"
            onClick={() => { setNotifOpen(v => !v); setUserMenuOpen(false); }}>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {totalNoLeidas > 0 && (
              <span className="licy-topbar-bell-dot">{totalNoLeidas > 9 ? '9+' : totalNoLeidas}</span>
            )}
          </button>

          {/* Panel notificaciones */}
          {notifOpen && (
            <div style={{
              position: 'absolute', top: 44, right: 0, width: 380, maxHeight: 520,
              background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
              boxShadow: '0 8px 32px rgba(15,23,42,0.15)',
              display: 'flex', flexDirection: 'column', zIndex: 999, overflow: 'hidden', fontFamily: F,
            }}>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: F }}>
                  Notificaciones
                  {totalNoLeidas > 0 && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '1px 7px', borderRadius: 999 }}>{totalNoLeidas} nuevas</span>}
                </div>
                {totalNoLeidas > 0 && (
                  <button onClick={marcarTodas} style={{ fontSize: 11, color: '#1e5799', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, fontWeight: 600 }}>
                    Marcar todas leídas
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                {[{ k: 'noLeidas', label: `No leídas${totalNoLeidas > 0 ? ` (${totalNoLeidas})` : ''}` }, { k: 'todas', label: 'Todas' }].map(({ k, label }) => (
                  <button key={k} onClick={() => setTab(k as 'todas' | 'noLeidas')}
                    style={{ flex: 1, height: 36, border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === k ? 700 : 500, color: tab === k ? '#1e5799' : '#64748b', fontFamily: F, borderBottom: tab === k ? '2px solid #1e5799' : '2px solid transparent', transition: 'all .15s' }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Lista */}
              <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'thin' }}>
                {filtradas.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13, fontFamily: F }}>
                    {tab === 'noLeidas' ? '✓ Todo al día' : 'Sin notificaciones'}
                  </div>
                ) : filtradas.map(n => {
                  const ico = icoTipo(n.tipo);
                  return (
                    <div key={n.id}
                      style={{ display: 'flex', gap: 10, padding: '12px 16px', background: n.leida ? 'white' : '#fafcff', borderBottom: '1px solid #f8fafc', cursor: n.leida ? 'default' : 'pointer', transition: 'background .1s' }}
                      onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
                      onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.background = n.leida ? 'white' : '#fafcff'; }}
                      onClick={() => { if (!n.leida) marcarLeida(n.id); }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: ico.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                        {ico.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                          <div style={{ fontSize: 12.5, fontWeight: n.leida ? 500 : 700, color: '#1e293b', fontFamily: F, lineHeight: 1.3 }}>{n.titulo}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: F, whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtTiempo(n.creadoEn)}</div>
                        </div>
                        {n.descripcion && <div style={{ fontSize: 11.5, color: '#64748b', fontFamily: F, marginTop: 2, lineHeight: 1.4 }}>{n.descripcion}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                        {n.codigoProceso && <span style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>{n.codigoProceso}</span>}
                        {n.fechaPublicacion && (<span style={{ fontSize: 10.5, color: '#64748b', fontFamily: F, whiteSpace: 'nowrap' }}>
                            {new Date(n.fechaPublicacion).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      </div>
                      {!n.leida && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1e5799', flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                <button onClick={cargarNotifs} style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>
                  Actualizar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botón opcional */}
        {onNewRequest && (
          <button className="licy-topbar-new-btn" type="button" onClick={onNewRequest}>
            <svg fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva solicitud
          </button>
        )}

        {/* User menu */}
        <div className="licy-user-wrap" ref={userRef}>
          <button type="button"
            className={`licy-topbar-user${userMenuOpen ? ' licy-topbar-user--active' : ''}`}
            onClick={() => { setUserMenuOpen(v => !v); setNotifOpen(false); }}>
            <div className="licy-topbar-user-av">{initials}</div>
            <div className="licy-topbar-user-text">
              <div className="licy-topbar-user-name">{nombreUsuario}</div>
              <div className="licy-topbar-user-role">{rolUsuario}</div>
            </div>
            <span className={`licy-topbar-user-chev${userMenuOpen ? ' licy-topbar-user-chev--open' : ''}`}>
              <svg fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" style={{ width: 12, height: 12 }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>

          {userMenuOpen && (
            <div className="licy-user-menu" role="menu">
              <button className="licy-user-menu-item" type="button" role="menuitem" onClick={() => { setUserMenuOpen(false); setPwModalOpen(true); }}>
                <span className="licy-user-menu-icon">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5.5 7V5.5a2.5 2.5 0 015 0V7"/><rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M8 10v1.5"/>
                  </svg>
                </span>
                Cambiar contraseña
              </button>
              <div className="licy-user-menu-divider" />
              <button className="licy-user-menu-item licy-user-menu-item--danger" type="button" role="menuitem"
                onClick={() => { setUserMenuOpen(false); setNotifOpen(false); onLogout?.(); }}>
                <span className="licy-user-menu-icon">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2H6"/><path d="M10 11l3-3-3-3"/><path d="M13 8H6"/>
                  </svg>
                </span>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {pwModalOpen && <LicyChangePasswordModal onClose={() => setPwModalOpen(false)} />}
    </>
  );
}
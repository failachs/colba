'use client';

// src/components/licycolba/LicyNotificationsPanel.tsx

import React, { useEffect, useRef, useCallback } from 'react';
import {
  LicyNotification,
  NotificationTab,
  NOTIFICATION_TAB_MAP,
} from '@/types/licycolba/notifications';

// ── Utilidades ──────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'Ahora mismo';
  if (m < 60)  return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `Hace ${h} hora${h > 1 ? 's' : ''}`;
  const d = Math.floor(h / 24);
  return `Hace ${d} día${d > 1 ? 's' : ''}`;
}

function filterByTab(
  notifications: LicyNotification[],
  tab: NotificationTab
): LicyNotification[] {
  if (tab === 'todas')    return notifications;
  if (tab === 'urgentes') return notifications.filter((n) => n.urgent);
  return notifications.filter((n) => NOTIFICATION_TAB_MAP[n.type] === tab);
}

// ── Iconos por tipo ─────────────────────────────────────────

function NotifIcon({ type, urgent }: { type: LicyNotification['type']; urgent?: boolean }) {
  const base = 'licy-notif-icon';

  if (urgent || type === 'proceso_por_vencer') {
    return (
      <span className={`${base} ${base}--red`}>
        <svg viewBox="0 0 20 20" fill="currentColor">
          <circle cx="10" cy="10" r="10" />
          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">!</text>
        </svg>
      </span>
    );
  }
  if (type === 'sync_error' || type === 'solicitud_rechazada') {
    return (
      <span className={`${base} ${base}--red`}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 3L18 17H2L10 3z" />
          <path d="M10 9v4M10 14.5v.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (type === 'proceso_gestionado' || type === 'sync_ok') {
    return (
      <span className={`${base} ${base}--green`}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="16" height="16" rx="4" fill="currentColor" stroke="none" opacity="0.15" />
          <path d="M5 10l4 4 6-6" stroke="currentColor" />
        </svg>
      </span>
    );
  }
  if (type === 'evaluacion_iniciada') {
    return (
      <span className={`${base} ${base}--orange`}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="4" y="2" width="12" height="16" rx="2" />
          <path d="M7 7h6M7 10h6M7 13h4" />
        </svg>
      </span>
    );
  }
  if (type === 'documento_por_vencer' || type === 'documento_pendiente') {
    return (
      <span className={`${base} ${base}--blue`}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M5 3h7l4 4v11a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
          <path d="M12 3v4h4" />
          <path d="M7 10h6M7 13h4" />
        </svg>
      </span>
    );
  }
  if (type === 'proceso_nuevo') {
    return (
      <span className={`${base} ${base}--blue`}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="10" cy="10" r="8" />
          <path d="M10 6v8M6 10h8" />
        </svg>
      </span>
    );
  }
  if (type === 'asignacion_pendiente') {
    return (
      <span className={`${base} ${base}--orange`}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="10" cy="7" r="3.5" />
          <path d="M3 18c0-4 3-6 7-6s7 2 7 6" />
        </svg>
      </span>
    );
  }
  // solicitud_creada / sistema / default
  return (
    <span className={`${base} ${base}--gray`}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 9v5M10 6.5v.5" />
      </svg>
    </span>
  );
}

// ── Props ───────────────────────────────────────────────────

interface LicyNotificationsPanelProps {
  notifications: LicyNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNotificationClick?: (n: LicyNotification) => void;
}

// ── Componente principal ────────────────────────────────────

const TABS: { key: NotificationTab; label: string }[] = [
  { key: 'todas',      label: 'Todas'      },
  { key: 'urgentes',   label: 'Urgentes'   },
  { key: 'procesos',   label: 'Procesos'   },
  { key: 'documentos', label: 'Documentos' },
];

export default function LicyNotificationsPanel({
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onNotificationClick,
}: LicyNotificationsPanelProps) {
  const [activeTab, setActiveTab] = React.useState<NotificationTab>('todas');
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visible = filterByTab(notifications, activeTab);

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleItemClick = useCallback(
    (n: LicyNotification) => {
      if (!n.read) onMarkRead(n.id);
      onNotificationClick?.(n);
    },
    [onMarkRead, onNotificationClick]
  );

  return (
    <div className="licy-notif-panel" ref={panelRef} role="dialog" aria-label="Panel de notificaciones">
      {/* Header */}
      <div className="licy-notif-header">
        <div className="licy-notif-header-left">
          <span className="licy-notif-title">Notificaciones</span>
          {unreadCount > 0 && (
            <span className="licy-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </div>
        <div className="licy-notif-header-right">
          {unreadCount > 0 && (
            <button className="licy-notif-mark-all" onClick={onMarkAllRead}>
              Marcar todas leídas
            </button>
          )}
          <button className="licy-notif-close" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="licy-notif-tabs">
        {TABS.map((t) => {
          const count = filterByTab(notifications, t.key).filter((n) => !n.read).length;
          return (
            <button
              key={t.key}
              className={`licy-notif-tab${activeTab === t.key ? ' licy-notif-tab--active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              {count > 0 && <span className="licy-notif-tab-dot" />}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <div className="licy-notif-list">
        {visible.length === 0 ? (
          <div className="licy-notif-empty">
            <svg viewBox="0 0 48 48" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round">
              <path d="M24 6C15 6 10 13 10 20v4l-4 6h36l-4-6v-4C38 13 33 6 24 6z" />
              <path d="M20 36a4 4 0 008 0" />
            </svg>
            <p>Sin notificaciones</p>
            <span>Todo está al día por aquí</span>
          </div>
        ) : (
          visible.map((n) => (
            <div
              key={n.id}
              className={`licy-notif-item${!n.read ? ' licy-notif-item--unread' : ''}${n.urgent ? ' licy-notif-item--urgent' : ''}`}
              onClick={() => handleItemClick(n)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleItemClick(n)}
            >
              <NotifIcon type={n.type} urgent={n.urgent} />
              <div className="licy-notif-item-body">
                <div className="licy-notif-item-title">{n.title}</div>
                <div className="licy-notif-item-desc">{n.description}</div>
                <div className="licy-notif-item-time">{timeAgo(n.createdAt)}</div>
              </div>
              {!n.read && <span className="licy-notif-dot" aria-label="No leída" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
// src/types/licycolba/notifications.ts

export type LicyNotificationType =
  | 'proceso_nuevo'
  | 'proceso_por_vencer'
  | 'documento_por_vencer'
  | 'documento_pendiente'
  | 'proceso_gestionado'
  | 'solicitud_creada'
  | 'solicitud_rechazada'
  | 'asignacion_pendiente'
  | 'evaluacion_iniciada'
  | 'sync_ok'
  | 'sync_error'
  | 'sistema';

export type LicyNotification = {
  id: string;
  type: LicyNotificationType;
  title: string;
  description: string;
  createdAt: string; // ISO string
  read: boolean;
  urgent?: boolean;
  module?: string;
  procesoId?: string;
  metadata?: Record<string, unknown>;
};

export type NotificationTab = 'todas' | 'urgentes' | 'procesos' | 'sistema' | 'documentos';

// Mapa de tipo → tab
export const NOTIFICATION_TAB_MAP: Record<LicyNotificationType, NotificationTab> = {
  proceso_nuevo:        'procesos',
  proceso_por_vencer:   'procesos',
  proceso_gestionado:   'procesos',
  documento_por_vencer: 'documentos',
  documento_pendiente:  'documentos',
  solicitud_creada:     'procesos',
  solicitud_rechazada:  'procesos',
  asignacion_pendiente: 'procesos',
  evaluacion_iniciada:  'procesos',
  sync_ok:              'sistema',
  sync_error:           'sistema',
  sistema:              'sistema',
};

// ── API futura ──────────────────────────────────────────────
// Reemplaza estas funciones cuando tengas backend
export async function fetchNotifications(): Promise<LicyNotification[]> {
  // TODO: GET /api/notifications
  return [];
}

export async function createNotification(
  _data: Omit<LicyNotification, 'id' | 'createdAt' | 'read'>
): Promise<LicyNotification | null> {
  // TODO: POST /api/notifications
  return null;
}

export async function markNotificationRead(_id: string): Promise<void> {
  // TODO: PATCH /api/notifications/:id/read
}

export async function markAllNotificationsRead(): Promise<void> {
  // TODO: PATCH /api/notifications/read-all
}
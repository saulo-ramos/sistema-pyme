/**
 * Datos de usuarios de prueba para el modo demo (sin backend real).
 * En producción estos datos vendrían de variables de entorno en tests/.env.test.
 */
import { DEMO_USER_ID, DEMO_TENANT_ID, DEMO_EMAIL, DEMO_PASSWORD } from '@/mocks/data';

export const USERS = {
  /** Admin del tenant demo — acceso total */
  adminA: {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    tenantId: DEMO_TENANT_ID,
  },

  /** Segundo tenant (para pruebas de aislamiento) */
  adminB: {
    email: 'demo-b@sistemapymes.cl',
    password: 'DemoB2024!',
    tenantId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  },

  /** Usuario sin tenant — edge case */
  noTenant: {
    email: 'notenant@sistemapymes.cl',
    password: 'NoTenant2024!',
    tenantId: null,
  },

  /** Usuario con rol 'vista' — solo lectura */
  viewer: {
    email: 'vista@sistemapymes.cl',
    password: 'Vista2024!',
    tenantId: DEMO_TENANT_ID,
  },
} as const;

export const TENANT_A_ID = DEMO_TENANT_ID;
export const TENANT_B_ID = 'b2c3d4e5-f6a7-8901-bcde-f23456789012';

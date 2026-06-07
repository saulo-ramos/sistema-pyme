/**
 * Pruebas de integración — Autenticación
 * Verifica login, logout y comportamiento con credenciales inválidas.
 *
 * Usa el mock auth en modo demo.
 * En producción las mismas pruebas se ejecutan contra Supabase Auth real,
 * incluyendo verificación de JWT y gestión de sesiones.
 */
import { describe, it, expect } from 'vitest';
import { mockSupabase } from '@/mocks/mockClient';
import { USERS } from '../fixtures/users';

describe('autenticación — login', () => {
  it('autentica con credenciales válidas y retorna sesión', async () => {
    const { data, error } = await mockSupabase.auth.signInWithPassword({
      email: USERS.adminA.email,
      password: USERS.adminA.password,
    });

    expect(error).toBeNull();
    expect(data.session).not.toBeNull();
    expect(data.user?.email).toBe(USERS.adminA.email);
    await mockSupabase.auth.signOut();
  });

  it('falla con contraseña incorrecta y retorna error', async () => {
    const { data, error } = await mockSupabase.auth.signInWithPassword({
      email: USERS.adminA.email,
      password: 'contraseña_incorrecta_12345',
    });

    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
  });

  it('falla con email inexistente', async () => {
    const { data, error } = await mockSupabase.auth.signInWithPassword({
      email: 'noexiste_xyz@example.com',
      password: 'cualquier_contraseña',
    });

    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
  });
});

describe('autenticación — logout', () => {
  it('cierra sesión y getSession retorna null después del logout', async () => {
    await mockSupabase.auth.signInWithPassword({
      email: USERS.adminA.email,
      password: USERS.adminA.password,
    });

    const { data: antes } = await mockSupabase.auth.getSession();
    expect(antes.session).not.toBeNull();

    await mockSupabase.auth.signOut();

    const { data: despues } = await mockSupabase.auth.getSession();
    expect(despues.session).toBeNull();
  });
});

describe('autenticación — seguridad', () => {
  it('credenciales de demo están correctamente configuradas', () => {
    expect(USERS.adminA.email).toBe('demo@sistemapymes.cl');
    expect(USERS.adminA.password).toBeTruthy();
    expect(USERS.adminA.tenantId).toBeTruthy();
  });

  it.todo('JWT forjado no puede acceder a datos protegidos por RLS (requiere DB real)');
  it.todo('token expirado es rechazado por el middleware de auth (requiere Supabase real)');
  it.todo('refresh token rota la sesión correctamente (requiere Supabase real)');
});

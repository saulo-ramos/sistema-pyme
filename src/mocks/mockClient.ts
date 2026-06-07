// Mock Supabase client for portfolio demo mode — no real backend required
import {
  INITIAL_MOCK_DB,
  DEMO_USER_ID,
  DEMO_TENANT_ID,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  movimientos_venta,
  tipo_documento,
} from './data';

// ─── In-memory database (mutable copy initialized from seed data) ──────────────

const mockDb: Record<string, any[]> = JSON.parse(JSON.stringify(INITIAL_MOCK_DB));

// ─── Helpers ───────────────────────────────────────────────────────────────────

function applyFilters(rows: any[], filters: Array<(row: any) => boolean>): any[] {
  return rows.filter((row) => filters.every((f) => f(row)));
}

function applyOrder(rows: any[], order: { column: string; ascending: boolean } | null): any[] {
  if (!order) return rows;
  const { column, ascending } = order;
  return [...rows].sort((a, b) => {
    const v1 = a[column] ?? '';
    const v2 = b[column] ?? '';
    if (v1 < v2) return ascending ? -1 : 1;
    if (v1 > v2) return ascending ? 1 : -1;
    return 0;
  });
}

// ─── Libro Ventas view (computed from movimientos_venta + tipo_documento) ───────

function computeLibroVentas(tenantId: string) {
  const ventas = mockDb.movimientos_venta.filter((m) => m.tenant_id === tenantId);
  const tiposMap: Record<number, string> = {};
  (mockDb.tipo_documento || tipo_documento).forEach((t: any) => { tiposMap[t.id] = t.nombre; });

  return ventas.map((m) => ({
    tenant_id: m.tenant_id,
    periodo: `${m.anio}-${String(m.mes).padStart(2, '0')}`,
    fecha: m.fecha_docto,
    nro_documento: m.folio,
    rut: m.rut_cliente,
    nombre_cliente: m.razon_social,
    tipo_documento: m.tipo_doc_id ? tiposMap[m.tipo_doc_id] ?? null : null,
    exento: m.monto_exento,
    neto: m.monto_neto,
    iva: m.monto_iva,
    otro_impto: m.otro_impto,
    total: m.monto_total,
  }));
}

function computeLibroCompras(tenantId: string) {
  const compras = mockDb.movimientos_compra.filter((m) => m.tenant_id === tenantId);
  const tiposMap: Record<number, string> = {};
  (mockDb.tipo_documento || tipo_documento).forEach((t: any) => { tiposMap[t.id] = t.nombre; });

  return compras.map((m) => ({
    tenant_id: m.tenant_id,
    periodo: `${m.anio}-${String(m.mes).padStart(2, '0')}`,
    fecha: m.fecha_docto,
    nro_documento: m.folio,
    rut: m.rut_proveedor,
    nombre_proveedor: m.razon_social,
    tipo_documento: m.tipo_doc_id ? tiposMap[m.tipo_doc_id] ?? null : null,
    exento: m.monto_exento,
    neto: m.monto_neto,
    iva: m.monto_iva,
    otro_impto: m.otro_impto,
    total: m.monto_total,
  }));
}

function computeLibroHonorarios(tenantId: string) {
  const rows = mockDb.movimientos_honorarios.filter((m) => m.tenant_id === tenantId);
  return rows.map((m) => ({
    tenant_id: m.tenant_id,
    periodo: `${m.anio}-${String(m.mes).padStart(2, '0')}`,
    fecha: m.fecha_docto,
    nro_documento: m.folio,
    rut: m.rut_prestador,
    nombre_prestador: m.nombre_prestador,
    tipo_documento: m.tipo_documento,
    bruto: m.monto_bruto,
    retencion: m.monto_retenido,
    pagado: m.monto_pagado,
    estado: m.estado,
  }));
}

function computeLibroRendiciones(tenantId: string) {
  return mockDb.rendiciones
    .filter((r) => r.tenant_id === tenantId)
    .map((r) => ({
      ...r,
      cantidad_items: mockDb.rendicion_items.filter((i) => i.rendicion_id === r.id).length,
    }));
}

// ─── Views resolver ────────────────────────────────────────────────────────────

function resolveView(viewName: string, filters: Array<(row: any) => boolean>): any[] {
  const tenantFilter = filters.find((_, i) => i === 0);
  const tenantId = tenantFilter ? DEMO_TENANT_ID : DEMO_TENANT_ID;

  switch (viewName) {
    case 'libro_ventas':    return computeLibroVentas(tenantId);
    case 'libro_compras':   return computeLibroCompras(tenantId);
    case 'libro_honorarios': return computeLibroHonorarios(tenantId);
    case 'libro_rendiciones': return computeLibroRendiciones(tenantId);
    default: return [];
  }
}

const VIEWS = new Set(['libro_ventas', 'libro_compras', 'libro_honorarios', 'libro_rendiciones']);

// ─── Mock Query Builder ────────────────────────────────────────────────────────

type Op = 'select' | 'insert' | 'update' | 'delete';

class MockQueryBuilder {
  private _table: string;
  private _filters: Array<(row: any) => boolean> = [];
  private _order: { column: string; ascending: boolean } | null = null;
  private _op: Op = 'select';
  private _insertData: any = null;
  private _updateData: any = null;
  private _isSingle = false;
  private _isMaybe = false;
  private _selectCols = '*';
  private _limitN: number | null = null;
  // Flag: .select() was chained after insert/update (return the written rows)
  private _withReturnSelect = false;

  constructor(table: string) {
    this._table = table;
  }

  select(cols = '*') {
    if (this._op === 'insert' || this._op === 'update' || this._op === 'delete') {
      // Supabase pattern: insert/update/delete().select() — return the affected rows
      this._withReturnSelect = true;
      this._selectCols = cols;
      return this;
    }
    this._op = 'select';
    this._selectCols = cols;
    return this;
  }

  insert(data: any | any[]) {
    this._op = 'insert';
    this._insertData = data;
    return this;
  }

  update(data: any) {
    this._op = 'update';
    this._updateData = data;
    return this;
  }

  delete() {
    this._op = 'delete';
    return this;
  }

  upsert(data: any) {
    this._op = 'insert';
    this._insertData = data;
    return this;
  }

  eq(column: string, value: any) {
    this._filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: any) {
    this._filters.push((row) => row[column] !== value);
    return this;
  }

  ilike(column: string, pattern: string) {
    const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
    this._filters.push((row) => regex.test(String(row[column] ?? '')));
    return this;
  }

  in(column: string, values: any[]) {
    this._filters.push((row) => values.includes(row[column]));
    return this;
  }

  order(column: string, opts: { ascending?: boolean } = {}) {
    this._order = { column, ascending: opts.ascending !== false };
    return this;
  }

  limit(n: number) {
    this._limitN = n;
    return this;
  }

  range(_from: number, _to: number) {
    return this;
  }

  single() {
    this._isSingle = true;
    return this._execute();
  }

  maybeSingle() {
    this._isMaybe = true;
    return this._execute();
  }

  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    return this._execute().then(resolve, reject);
  }

  private async _execute(): Promise<{ data: any; error: any }> {
    try {
      const isView = VIEWS.has(this._table);

      switch (this._op) {
        case 'select': {
          let rows: any[];
          if (isView) {
            rows = applyFilters(resolveView(this._table, this._filters), this._filters);
          } else {
            rows = applyFilters([...(mockDb[this._table] || [])], this._filters);
          }
          rows = applyOrder(rows, this._order);
          if (this._limitN !== null) rows = rows.slice(0, this._limitN);

          if (this._isSingle) {
            if (rows.length === 0) return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
            return { data: rows[0], error: null };
          }
          if (this._isMaybe) {
            return { data: rows[0] ?? null, error: null };
          }
          return { data: rows, error: null };
        }

        case 'insert': {
          const items = Array.isArray(this._insertData) ? this._insertData : [this._insertData];
          const inserted: any[] = [];
          if (!mockDb[this._table]) mockDb[this._table] = [];

          for (const item of items) {
            if (!item.tenant_id && this._table !== 'tipo_documento') {
              return { data: null, error: { message: 'tenant_id is required', code: '23502' } };
            }
            const newRow = {
              activo: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...item,
              id: item.id ?? crypto.randomUUID(),
            };
            mockDb[this._table].push(newRow);
            inserted.push(newRow);
          }

          // .insert().select().single() — return the inserted row(s)
          if (this._withReturnSelect || this._isSingle || this._isMaybe) {
            if (this._isSingle || this._isMaybe) {
              return { data: inserted[0] ?? null, error: null };
            }
            return { data: inserted, error: null };
          }
          return { data: null, error: null };
        }

        case 'update': {
          if (!mockDb[this._table]) return { data: null, error: null };
          const updated: any[] = [];
          mockDb[this._table] = mockDb[this._table].map((row) => {
            if (this._filters.length === 0 || this._filters.every((f) => f(row))) {
              const updatedRow = { ...row, ...this._updateData, updated_at: new Date().toISOString() };
              updated.push(updatedRow);
              return updatedRow;
            }
            return row;
          });

          // .update().select().single() — return the updated row(s)
          if (this._withReturnSelect || this._isSingle || this._isMaybe) {
            if (this._isSingle || this._isMaybe) {
              return { data: updated[0] ?? null, error: null };
            }
            return { data: updated, error: null };
          }
          return { data: null, error: null };
        }

        case 'delete': {
          if (!mockDb[this._table]) return { data: null, error: null };
          const deleted: any[] = [];
          mockDb[this._table] = mockDb[this._table].filter((row) => {
            const shouldDelete = this._filters.every((f) => f(row));
            if (shouldDelete) deleted.push(row);
            return !shouldDelete;
          });
          if (this._withReturnSelect) return { data: deleted, error: null };
          return { data: null, error: null };
        }

        default:
          return { data: null, error: { message: 'Unknown operation' } };
      }
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  }
}

// ─── Mock Auth ─────────────────────────────────────────────────────────────────

const DEMO_SESSION_KEY = 'sp_demo_session';

// Graceful storage wrapper — falls back to in-memory when localStorage is unavailable (test env)
const memoryStorage: Record<string, string> = {};
const safeStorage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return memoryStorage[key] ?? null; }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { memoryStorage[key] = value; }
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch { delete memoryStorage[key]; }
  },
};

function createDemoSession() {
  return {
    access_token: 'demo-access-token-not-real',
    refresh_token: 'demo-refresh-token-not-real',
    expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
    user: {
      id: DEMO_USER_ID,
      email: DEMO_EMAIL,
      role: 'authenticated',
      aud: 'authenticated',
      created_at: '2024-01-15T00:00:00.000Z',
      app_metadata: {},
      user_metadata: {},
    },
  };
}

let _authListeners: Array<(event: string, session: any) => void> = [];

const mockAuth = {
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      const session = createDemoSession();
      safeStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
      _authListeners.forEach((cb) => cb('SIGNED_IN', session));
      return { data: { user: session.user, session }, error: null };
    }
    return { data: { user: null, session: null }, error: { message: 'Email o contraseña incorrectos.' } };
  },

  signOut: async () => {
    safeStorage.removeItem(DEMO_SESSION_KEY);
    _authListeners.forEach((cb) => cb('SIGNED_OUT', null));
    return { error: null };
  },

  getSession: async () => {
    const stored = safeStorage.getItem(DEMO_SESSION_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      return { data: { session }, error: null };
    }
    return { data: { session: null }, error: null };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    _authListeners.push(callback);
    const stored = safeStorage.getItem(DEMO_SESSION_KEY);
    setTimeout(() => {
      if (stored) {
        callback('SIGNED_IN', JSON.parse(stored));
      } else {
        callback('SIGNED_OUT', null);
      }
    }, 0);
    const subscription = {
      unsubscribe: () => {
        _authListeners = _authListeners.filter((l) => l !== callback);
      },
    };
    return { data: { subscription } };
  },

  updateUser: async (_updates: any) => ({ data: { user: null }, error: null }),
};

// ─── Mock Storage ──────────────────────────────────────────────────────────────

const mockStorage = {
  from: (_bucket: string) => ({
    upload: async (_path: string, _file: File, _opts?: any) => ({ data: { path: _path }, error: null }),
    getPublicUrl: (path: string) => ({ data: { publicUrl: `/mock-storage/${path}` } }),
    list: async (_path?: string) => ({ data: [], error: null }),
    remove: async (_paths: string[]) => ({ data: [], error: null }),
    download: async (_path: string) => ({ data: null, error: null }),
  }),
};

// ─── Mock RPC ─────────────────────────────────────────────────────────────────

const mockRpc = async (fn: string, _args?: any) => {
  if (fn === 'my_tenant_id') return { data: DEMO_TENANT_ID, error: null };
  if (fn === 'validar_rut') return { data: true, error: null };
  return { data: null, error: null };
};

// ─── Exported mock client ──────────────────────────────────────────────────────

export const mockSupabase = {
  from: (table: string) => new MockQueryBuilder(table),
  auth: mockAuth,
  storage: mockStorage,
  rpc: mockRpc,
  channel: (_name: string) => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
  }),
  removeChannel: (_channel: any) => {},
};

export { mockDb };

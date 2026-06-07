# Sistema Pymes

Sistema de gestión empresarial para PyMEs chilenas. Cubre los módulos de Clientes, Ventas, Compras, Honorarios, Remuneraciones y Rendiciones con soporte multi-empresa (multi-tenant) mediante Row Level Security en PostgreSQL.

> **Modo demo**: la aplicación funciona completamente en el navegador sin backend. Los datos son ficticios y se almacenan en memoria.

---

## Demo en vivo

| Campo | Valor |
|-------|-------|
| Email | `demo@sistemapymes.cl` |
| Contraseña | `Demo2024!` |

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript 5 |
| Build | Vite 5 (SWC) |
| UI | shadcn/ui + Tailwind CSS 3 + Radix UI |
| Estado y caché | TanStack Query 5 |
| Formularios | React Hook Form + Zod |
| Gráficos | Recharts 2 |
| Excel | SheetJS (xlsx) |
| Backend (prod) | Supabase — PostgreSQL 14 + Auth + RLS + Storage |
| Testing unit | Vitest 3 + Testing Library |
| Testing E2E | Playwright |
| Deploy | Docker + Nginx |

---

## Arquitectura

```
┌─────────────────────────────────────────────┐
│               Navegador (SPA)               │
│                                             │
│  React Router  →  Páginas  →  Componentes  │
│       ↓               ↓            ↓       │
│  AuthContext    TanStack Query   shadcn/ui  │
│       ↓               ↓                    │
│  supabase client (real o mock)              │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   Producción              Demo / Tests
        │                     │
  Supabase Cloud          Mock en memoria
  PostgreSQL + RLS        (src/mocks/)
  Auth + Storage
```

### Multi-tenant con RLS

Cada empresa (tenant) tiene sus propios datos aislados en PostgreSQL mediante Row Level Security. La función `my_tenant_id()` extrae el `tenant_id` del JWT del usuario y lo aplica automáticamente en todas las políticas:

```sql
CREATE POLICY "tenant_isolation" ON clientes
  USING (tenant_id = my_tenant_id());
```

### Modo demo (sin backend)

El archivo `src/mocks/mockClient.ts` implementa la interfaz del cliente Supabase con un query builder en memoria que soporta:

- `select / insert / update / delete`
- Filtros: `eq`, `neq`, `ilike`, `in`
- Ordenamiento: `order`
- Terminadores: `single`, `maybeSingle`
- Vistas computadas: `libro_ventas`, `libro_compras`, `libro_honorarios`, `libro_rendiciones`
- Auth: `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`
- Storage: `upload`, `getPublicUrl`, `list`, `remove`

---

## Módulos implementados

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| Módulos | ✅ | Vista general de módulos |
| Clientes | ✅ | CRUD completo, carga masiva Excel, búsqueda, paginación |
| Ventas | ✅ | Movimientos, Libro de Ventas, Gráficas (4 tipos de chart) |
| Compras | ✅ | Movimientos, Libro de Compras, Proveedores |
| Honorarios | ✅ | Boletas y facturas de honorarios, retención automática |
| Remuneraciones | ✅ | Trabajadores, liquidaciones mensuales |
| Rendiciones | ✅ | Creación, envío, aprobación/rechazo workflow |
| Configuración | ✅ | Mi cuenta, Mi empresa, Usuarios del tenant |

### Módulo Ventas — detalle

El módulo más completo del sistema incluye:

- **Tab Clientes**: gestión de clientes de ventas con alta inline
- **Tab Movimientos**: CRUD de documentos tributarios con IVA automático (19%)
- **Tab Libro de Ventas**: resumen mensual agrupado por período y tipo de documento
- **Tab Gráficas**: Ventas Mensuales (barras), Composición por Mes (stacked), Documentos por Tipo (donut), Top 10 Clientes (barras horizontales)

---

## Tests automatizados

```
261 tests pasando · 53 .todo (requieren Supabase real) · 0 fallos
```

El proyecto tiene cobertura en cuatro niveles: unitario, integración, seguridad y E2E. Todos los tests del proyecto `unit` e `integration` corren **sin backend** gracias al cliente mock en memoria.

```bash
npm run test              # unitarios + integración (mock, sin Supabase)
npm run test:unit         # solo tests unitarios
npm run test:integration  # solo tests de integración
npm run test:e2e          # E2E con Playwright (requiere dev server)
```

### Arquitectura de proyectos Vitest

El archivo `vitest.config.ts` define dos proyectos independientes con entornos aislados:

| Proyecto | Entorno | Archivos | Propósito |
|----------|---------|----------|-----------|
| `unit` | jsdom | `tests/lib/**` + `src/**` | Funciones puras sin efectos externos |
| `integration` | jsdom + mock | `tests/modules/**`, `tests/auth/**`, `tests/security/**`, `tests/storage/**` | CRUD real contra el cliente mock |

### Tests unitarios — `tests/lib/`

Validan funciones puras sin DOM ni red. Se ejecutan en milisegundos.

| Archivo | Qué prueba |
|---------|-----------|
| `formatters.test.ts` | `normalizeRut`, `normalizeFono`, `displayRut`, `displayDate`, `displayFono`, `formatCLP` |
| `rut.test.ts` | `verifyRut` — 15 casos con RUTs válidos, inválidos y dígito K |
| `sanitize.test.ts` | `escapeLikePattern` — patrones LIKE especiales (`%`, `_`, `\\`) |
| `movimentos.test.ts` | `validarFecha`, `calcularResultado`, `insertBatch` (tabla no permitida) |
| `storage.test.ts` | `buildStoragePath`, `extractPathFromUrl` — aislamiento de paths por tenant |
| `honorarios.test.ts` | `calcularRetencion`, `calcularPagado`, constantes `TIPOS_HONORARIO` |
| `remuneraciones.test.ts` | `calcularTotalImponible`, `calcularLiquido`, `calcularCostoTotal` |
| `rendiciones.test.ts` | `calcularTotal`, `puedeEditar`, `puedeAprobar`, `generarNumero` |

```typescript
// Ejemplo — tests/lib/rut.test.ts
expect(verifyRut('12.345.678-9')).toBe(true);
expect(verifyRut('14569484-K')).toBe(true);
expect(verifyRut('12345678-0')).toBe(false); // dígito verificador incorrecto

// Ejemplo — tests/lib/formatters.test.ts
expect(normalizeRut('12.345.678-9')).toBe('12345678-9');
expect(normalizeFono('+56 9 1234 5678')).toBe('+56912345678');
expect(formatCLP(null)).toBe('—');
```

### Tests de integración — `tests/modules/`

Cada módulo de negocio tiene su propio archivo de tests que cubre el ciclo CRUD completo usando el cliente mock en memoria. El mock implementa la misma interfaz que el SDK de Supabase, por lo que el código de tests es idéntico al que correría contra la base de datos real.

| Módulo | Casos cubiertos |
|--------|----------------|
| `clientes.test.ts` | INSERT con campos obligatorios, normalización RUT, UPDATE, DELETE, búsqueda por nombre/RUT, activar/desactivar |
| `ventas.test.ts` | Movimientos de venta, cálculo IVA 19%, consulta libro de ventas por período |
| `compras.test.ts` | Movimientos de compra, libro de compras, proveedores |
| `honorarios.test.ts` | Boletas, retención 10% automática, libro de honorarios |
| `remuneraciones.test.ts` | Trabajadores, liquidaciones, cálculo de haberes y descuentos |
| `rendiciones.test.ts` | Workflow completo: Borrador → Enviada → Aprobada/Rechazada |
| `proveedores.test.ts` | CRUD de proveedores con validación de RUT |

```typescript
// Ejemplo — tests/modules/clientes.test.ts
it('inserta cliente con campos obligatorios y retorna registro', async () => {
  const { data, error } = await client
    .from('clientes')
    .insert({ rut: '12345678-5', nombre: 'Empresa Prueba', tenant_id: TENANT_A_ID })
    .select()
    .single();

  expect(error).toBeNull();
  expect(data!.activo).toBe(true);
});
```

### Tests de seguridad — `tests/security/`

**SQL Injection (`sql-injection.test.ts`)**: verifica que los campos de búsqueda no son vulnerables a inyección. Prueba 6 payloads SQL clásicos y 6 patrones LIKE especiales contra `escapeLikePattern()`:

```typescript
const PAYLOADS_SQL = [
  "'; DROP TABLE clientes; --",
  "' OR '1'='1",
  "' UNION SELECT * FROM user_tenants --",
  "Robert'); DROP TABLE students; --",
];
// Todos producen resultados vacíos — nunca errores ni datos filtrados
```

**Políticas RLS (`rls-policies.test.ts`)**: valida que las restricciones de tenant se aplican en cada tabla — intentos de acceso cross-tenant retornan listas vacías o error.

### Tests de autenticación — `tests/auth/`

**`login.test.ts`**: cubre login correcto, contraseña incorrecta, usuario inexistente y cierre de sesión.

**`rls-isolation.test.ts`**: garantía fundamental del sistema multi-tenant — el Tenant A nunca ve ni modifica datos del Tenant B:

```typescript
it('filtro por otro tenant retorna lista vacía', async () => {
  const { data } = await client
    .from('clientes')
    .select('id')
    .eq('tenant_id', TENANT_B_ID); // consultando desde contexto Tenant A

  expect(data).toHaveLength(0);
});

it('insert sin tenant_id es rechazado', async () => {
  const { error } = await client
    .from('clientes')
    .insert({ rut: '55555555-5', nombre: 'Sin Tenant' } as any)
    .select().single();

  expect(error).not.toBeNull();
});
```

### Tests de storage — `tests/storage/`

Validan el aislamiento de archivos por tenant: rutas generadas con `buildStoragePath`, extracción de path desde URL pública, e intentos de acceso cross-tenant.

### Tests E2E — `tests/e2e/`

Playwright cubre el flujo completo en navegador real: login, navegación entre módulos y verificación de redirección al dashboard. Configurados para correr en modo demo (sin Supabase).

> Los tests marcados con `.todo` requieren conexión a Supabase real. Ver `tests/.env.test.example` para configurar un proyecto de staging.

---

## Correr localmente

```bash
# 1. Clonar e instalar dependencias
git clone https://github.com/saulo-ramos/sistema-pyme
cd sistema-pymes
npm install

# 2. Correr en modo demo (sin backend)
npm run dev
# → http://localhost:8080
# → Login: demo@sistemapymes.cl / Demo2024!

# 3. Correr tests
npm run test          # unitarios + integración mock
npm run test:e2e      # E2E (requiere dev server corriendo)
```

### Con Supabase real (producción)

```bash
# Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env: VITE_DEMO_MODE=false + VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY

# Para tests de integración reales
cp tests/.env.test.example tests/.env.test
# Editar tests/.env.test con credenciales del proyecto de staging
npm run test
```

---

## Decisiones técnicas

### ¿Por qué Supabase?

PostgreSQL con RLS nativo — el aislamiento multi-tenant es una garantía de base de datos, no solo de código. Auth integrado sin servidor, JWT firmados con refresh automático. Storage con políticas de acceso — los archivos también respetan el aislamiento por tenant.

### ¿Por qué TanStack Query en lugar de Redux?

Para una SPA con operaciones CRUD localizadas, TanStack Query elimina el boilerplate de state management global. El caching y la deduplicación de requests vienen gratis sin diseñar un store.

### ¿Por qué shadcn/ui?

Componentes accesibles (Radix UI) con estilos en Tailwind. Se copian al proyecto — sin lock-in de librería, sin que una actualización de npm rompa el diseño.

### ¿Por qué el mock sigue la interfaz real de Supabase?

Garantiza que el código de producción y el de demo/tests son idénticos. Cambiar entre modo real y demo es un flag de entorno (`VITE_DEMO_MODE`), sin ramas ni condicionales en el código de negocio.

---

## Estructura del proyecto

```
src/
├── components/         # Componentes React (UI, formularios, diálogos)
├── contexts/           # AuthContext — sesión global
├── hooks/              # useTenantId, useTenantInfo, useUserProfile...
├── integrations/
│   └── supabase/
│       ├── client.ts   # Exporta cliente real o mock según VITE_DEMO_MODE
│       └── types.ts    # Tipos generados del schema PostgreSQL
├── lib/                # Funciones puras (formatters, rut, sanitize, storage...)
├── mocks/
│   ├── data.ts         # Datos demo (25 clientes, 4 meses de ventas, etc.)
│   └── mockClient.ts   # Implementación mock del query builder de Supabase
└── pages/              # Páginas de la aplicación

tests/
├── lib/                # Pruebas unitarias (sin DOM)
├── modules/            # Pruebas de integración por módulo
├── auth/               # Pruebas de autenticación y RLS
├── security/           # SQL injection, políticas RLS
├── storage/            # Control de acceso a archivos
├── e2e/                # Playwright E2E
└── fixtures/           # Helpers y datos de prueba

supabase/
└── migrations/         # Historia de migraciones PostgreSQL
```

---

## Autor

**Saulo Ramos** — Desarrollador Full Stack  


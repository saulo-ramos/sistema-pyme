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
| Dashboard | ✅ | Vista general de módulos |
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

```bash
npm run test          # pruebas unitarias + integración (mock)
npm run test:e2e      # E2E con Playwright
```

### Cobertura

| Tipo | Archivos | Qué prueba |
|------|----------|-----------|
| **Unitarios** | `tests/lib/*.test.ts` | Funciones puras: formatters, validación RUT chileno, sanitize, lógica de honorarios/remuneraciones/rendiciones |
| **Integración** | `tests/modules/*.test.ts` | CRUD de todos los módulos con mock en memoria |
| **Auth** | `tests/auth/*.test.ts` | Login, logout, aislamiento RLS por tenant |
| **Seguridad** | `tests/security/*.test.ts` | SQL injection (escapeLikePattern), políticas RLS |
| **Storage** | `tests/storage/*.test.ts` | Caminos de archivos, aislamiento por tenant |
| **E2E** | `tests/e2e/*.spec.ts` | Flujo completo de login y navegación |

> Los tests marcados con `.todo` requieren conexión a Supabase real (ver `tests/.env.test.example`).

### Validación de RUT chileno

```typescript
// tests/lib/rut.test.ts — 15 casos de prueba
import { verifyRut } from '@/lib/rut';

expect(verifyRut('12.345.678-9')).toBe(true);
expect(verifyRut('14569484-K')).toBe(true);
expect(verifyRut('12345678-0')).toBe(false); // dígito verificador incorrecto
```

---

## Correr localmente

```bash
# 1. Clonar e instalar dependencias
git clone https://github.com/tuusuario/sistema-pymes
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

**Saulo Vergara** — Desarrollador Full Stack  


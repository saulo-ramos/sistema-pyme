// Mock data for portfolio demo mode — no real backend required

export const DEMO_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
export const DEMO_TENANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
export const DEMO_EMAIL = 'demo@sistemapymes.cl';
export const DEMO_PASSWORD = 'Demo2024!';

// ─── Tenant ────────────────────────────────────────────────────────────────────

export const tenants = [
  {
    id: DEMO_TENANT_ID,
    nombre: 'Tecnología y Servicios Demo SpA',
    razon_social: 'Tecnología y Servicios Demo SpA',
    rut: '76543210-K',
    direccion: 'Av. Providencia 1234, Piso 5',
    comuna: 'Providencia',
    ciudad: 'Santiago',
    region: 'Metropolitana de Santiago',
    fono: '+56229876543',
    email: 'contacto@techdemo.cl',
    sitio_web: 'https://techdemo.cl',
    giro_principal: 'Desarrollo de software y consultoría tecnológica',
    logo_url: null,
    subdominio: 'techdemo',
    activo: true,
    contacto: 'Carlos Administrador',
    created_at: '2024-01-15T00:00:00.000Z',
  },
];

// ─── User tenants ───────────────────────────────────────────────────────────────

export const user_tenants = [
  {
    user_id: DEMO_USER_ID,
    tenant_id: DEMO_TENANT_ID,
    role: 'admin',
    created_at: '2024-01-15T00:00:00.000Z',
  },
];

// ─── User profiles ──────────────────────────────────────────────────────────────

export const user_profiles = [
  {
    id: DEMO_USER_ID,
    tenant_id: DEMO_TENANT_ID,
    nombre: 'Carlos Administrador',
    cargo: 'Gerente de Operaciones',
    fono: '+56912345678',
    foto_url: null,
    activo: true,
    ultimo_acceso: new Date().toISOString(),
    created_at: '2024-01-15T00:00:00.000Z',
    updated_at: new Date().toISOString(),
  },
];

// ─── Tipos de documento ─────────────────────────────────────────────────────────

export const tipo_documento = [
  { id: 33,  nombre: 'Factura Electrónica',               abreviacion: 'FE',   activo: true },
  { id: 34,  nombre: 'Factura No Afecta o Exenta Elect.', abreviacion: 'FNE',  activo: true },
  { id: 39,  nombre: 'Boleta Electrónica',                abreviacion: 'BE',   activo: true },
  { id: 41,  nombre: 'Boleta No Afecta o Exenta Elect.',  abreviacion: 'BNE',  activo: true },
  { id: 46,  nombre: 'Liquidación Factura Elect.',        abreviacion: 'LFE',  activo: true },
  { id: 52,  nombre: 'Guía de Despacho Electrónica',      abreviacion: 'GDE',  activo: true },
  { id: 56,  nombre: 'Nota de Débito Electrónica',        abreviacion: 'NDE',  activo: true },
  { id: 61,  nombre: 'Nota de Crédito Electrónica',       abreviacion: 'NCE',  activo: true },
];

// ─── Clientes (25 empresas chilenas realistas) ─────────────────────────────────

export const clientes = [
  { id: 'c01', tenant_id: DEMO_TENANT_ID, rut: '76354771-K', nombre: 'Constructora Andina SpA',            productos_servicios: 'Construcción civil', vencimiento: 30, correo: 'admin@constructoraandina.cl', fono: '+56225551001', activo: true, created_at: '2024-01-20T00:00:00Z', updated_at: '2024-01-20T00:00:00Z' },
  { id: 'c02', tenant_id: DEMO_TENANT_ID, rut: '96874030-K', nombre: 'Distribuidora Central Ltda.',        productos_servicios: 'Distribución de alimentos', vencimiento: 60, correo: 'finanzas@distcentral.cl', fono: '+56225552002', activo: true, created_at: '2024-01-21T00:00:00Z', updated_at: '2024-01-21T00:00:00Z' },
  { id: 'c03', tenant_id: DEMO_TENANT_ID, rut: '78900898-1', nombre: 'Exportadora Pacífico SA',            productos_servicios: 'Exportación de frutas', vencimiento: 0, correo: 'ventas@expacifico.cl', fono: '+56225553003', activo: true, created_at: '2024-01-22T00:00:00Z', updated_at: '2024-01-22T00:00:00Z' },
  { id: 'c04', tenant_id: DEMO_TENANT_ID, rut: '81812834-7', nombre: 'Clínica Santa Rosa SpA',             productos_servicios: 'Servicios médicos', vencimiento: 30, correo: 'administracion@clinicasantarosa.cl', fono: '+56225554004', activo: true, created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
  { id: 'c05', tenant_id: DEMO_TENANT_ID, rut: '56789012-0', nombre: 'Hotelería del Sur Ltda.',            productos_servicios: 'Hotelería y turismo', vencimiento: 15, correo: 'reservas@hotelsur.cl', fono: '+56225555005', activo: true, created_at: '2024-02-05T00:00:00Z', updated_at: '2024-02-05T00:00:00Z' },
  { id: 'c06', tenant_id: DEMO_TENANT_ID, rut: '77777770-K', nombre: 'Inmobiliaria Los Alamos SA',         productos_servicios: 'Venta de propiedades', vencimiento: 90, correo: 'contacto@losalamos.cl', fono: '+56225556006', activo: true, created_at: '2024-02-10T00:00:00Z', updated_at: '2024-02-10T00:00:00Z' },
  { id: 'c07', tenant_id: DEMO_TENANT_ID, rut: '66666660-2', nombre: 'Minera Atacama SpA',                 productos_servicios: 'Extracción de cobre', vencimiento: 0, correo: 'compras@mineraatacama.cl', fono: '+56225557007', activo: true, created_at: '2024-02-15T00:00:00Z', updated_at: '2024-02-15T00:00:00Z' },
  { id: 'c08', tenant_id: DEMO_TENANT_ID, rut: '55555556-7', nombre: 'Consultora BPO Partners Ltda.',      productos_servicios: 'Consultoría empresarial', vencimiento: 30, correo: 'info@bpopartners.cl', fono: '+56225558008', activo: true, created_at: '2024-02-20T00:00:00Z', updated_at: '2024-02-20T00:00:00Z' },
  { id: 'c09', tenant_id: DEMO_TENANT_ID, rut: '44444448-9', nombre: 'Agrícola Valle Verde SpA',           productos_servicios: 'Producción agrícola', vencimiento: 60, correo: 'ventas@valleverde.cl', fono: '+56225559009', activo: true, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z' },
  { id: 'c10', tenant_id: DEMO_TENANT_ID, rut: '33333331-4', nombre: 'Retail Fashion Group SA',            productos_servicios: 'Comercio de vestuario', vencimiento: 30, correo: 'finanzas@fashiongroup.cl', fono: '+56225550010', activo: true, created_at: '2024-03-05T00:00:00Z', updated_at: '2024-03-05T00:00:00Z' },
  { id: 'c11', tenant_id: DEMO_TENANT_ID, rut: '22222220-6', nombre: 'Logística Express Ltda.',            productos_servicios: 'Transporte y logística', vencimiento: 15, correo: 'operaciones@logexpress.cl', fono: '+56225551011', activo: true, created_at: '2024-03-10T00:00:00Z', updated_at: '2024-03-10T00:00:00Z' },
  { id: 'c12', tenant_id: DEMO_TENANT_ID, rut: '11111111-1', nombre: 'Editorial Conocimiento SA',          productos_servicios: 'Edición y publicación', vencimiento: 0, correo: 'comercial@editorial.cl', fono: '+56225552012', activo: true, created_at: '2024-03-15T00:00:00Z', updated_at: '2024-03-15T00:00:00Z' },
  { id: 'c13', tenant_id: DEMO_TENANT_ID, rut: '99999996-3', nombre: 'Pesquera Austral SpA',               productos_servicios: 'Procesamiento de mariscos', vencimiento: 30, correo: 'admin@pesqueraaustral.cl', fono: '+56225553013', activo: true, created_at: '2024-03-20T00:00:00Z', updated_at: '2024-03-20T00:00:00Z' },
  { id: 'c14', tenant_id: DEMO_TENANT_ID, rut: '88888880-5', nombre: 'Viñedos del Maipo Ltda.',            productos_servicios: 'Producción vitivinícola', vencimiento: 60, correo: 'ventas@vinedosmaipo.cl', fono: '+56225554014', activo: true, created_at: '2024-04-01T00:00:00Z', updated_at: '2024-04-01T00:00:00Z' },
  { id: 'c15', tenant_id: DEMO_TENANT_ID, rut: '12345678-5', nombre: 'Servicios Industriales Norte SA',    productos_servicios: 'Mantención industrial', vencimiento: 30, correo: 'contratos@sinorte.cl', fono: '+56225555015', activo: true, created_at: '2024-04-05T00:00:00Z', updated_at: '2024-04-05T00:00:00Z' },
  { id: 'c16', tenant_id: DEMO_TENANT_ID, rut: '76876543-2', nombre: 'Telecomunicaciones Sur SpA',         productos_servicios: 'Servicios de conectividad', vencimiento: 0, correo: 'facturación@telecsur.cl', fono: '+56225556016', activo: true, created_at: '2024-04-10T00:00:00Z', updated_at: '2024-04-10T00:00:00Z' },
  { id: 'c17', tenant_id: DEMO_TENANT_ID, rut: '76109876-5', nombre: 'Farmacia Bienestar Ltda.',           productos_servicios: 'Productos farmacéuticos', vencimiento: 15, correo: 'compras@farmabienestar.cl', fono: '+56225557017', activo: true, created_at: '2024-04-15T00:00:00Z', updated_at: '2024-04-15T00:00:00Z' },
  { id: 'c18', tenant_id: DEMO_TENANT_ID, rut: '76543212-3', nombre: 'Escuela de Idiomas Global SpA',      productos_servicios: 'Enseñanza de idiomas', vencimiento: 30, correo: 'admin@idiomglobal.cl', fono: '+56225558018', activo: true, created_at: '2024-04-20T00:00:00Z', updated_at: '2024-04-20T00:00:00Z' },
  { id: 'c19', tenant_id: DEMO_TENANT_ID, rut: '76321098-7', nombre: 'Centro Deportivo Olimpo SA',         productos_servicios: 'Instalaciones deportivas', vencimiento: 60, correo: 'reservas@olimpo.cl', fono: '+56225559019', activo: true, created_at: '2024-05-01T00:00:00Z', updated_at: '2024-05-01T00:00:00Z' },
  { id: 'c20', tenant_id: DEMO_TENANT_ID, rut: '76112233-1', nombre: 'Automotora Nacional SpA',            productos_servicios: 'Venta de automóviles', vencimiento: 0, correo: 'ventas@autonacional.cl', fono: '+56225550020', activo: true, created_at: '2024-05-05T00:00:00Z', updated_at: '2024-05-05T00:00:00Z' },
  { id: 'c21', tenant_id: DEMO_TENANT_ID, rut: '76445566-K', nombre: 'Seguros Confianza Ltda.',            productos_servicios: 'Seguros corporativos', vencimiento: 30, correo: 'clientes@segurosconfianza.cl', fono: '+56225551021', activo: true, created_at: '2024-05-10T00:00:00Z', updated_at: '2024-05-10T00:00:00Z' },
  { id: 'c22', tenant_id: DEMO_TENANT_ID, rut: '76778899-4', nombre: 'Catering Sabores del Norte SpA',     productos_servicios: 'Catering empresarial', vencimiento: 15, correo: 'pedidos@saboresnorte.cl', fono: '+56225552022', activo: true, created_at: '2024-05-15T00:00:00Z', updated_at: '2024-05-15T00:00:00Z' },
  { id: 'c23', tenant_id: DEMO_TENANT_ID, rut: '76998877-2', nombre: 'Arquitectura e Ingeniería ABI SA',   productos_servicios: 'Proyectos de arquitectura', vencimiento: 90, correo: 'proyectos@abiarch.cl', fono: '+56225553023', activo: true, created_at: '2024-05-20T00:00:00Z', updated_at: '2024-05-20T00:00:00Z' },
  { id: 'c24', tenant_id: DEMO_TENANT_ID, rut: '76123456-6', nombre: 'Multimedia Creativa SpA',            productos_servicios: 'Producción audiovisual', vencimiento: 30, correo: 'produccion@multicreativa.cl', fono: '+56225554024', activo: false, created_at: '2024-06-01T00:00:00Z', updated_at: '2024-09-01T00:00:00Z' },
  { id: 'c25', tenant_id: DEMO_TENANT_ID, rut: '76654321-8', nombre: 'Laboratorio Análisis Clínico SpA',   productos_servicios: 'Análisis clínicos', vencimiento: 30, correo: 'factura@labclinico.cl', fono: '+56225555025', activo: false, created_at: '2024-06-10T00:00:00Z', updated_at: '2024-10-01T00:00:00Z' },
];

// ─── Movimientos de Venta (4 meses: Marzo–Junio 2026) ──────────────────────────

export const movimientos_venta = [
  // MARZO 2026
  { id: 'mv001', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 1001, rut_cliente: '76354771-K', razon_social: 'Constructora Andina SpA',         fecha_docto: '2026-03-03', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 1500000, monto_iva: 285000, otro_impto: null, monto_total: 1785000, nro: 1, resultado: 0, documento_url: null, created_at: '2026-03-03T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Consultoría tecnológica' },
  { id: 'mv002', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 1002, rut_cliente: '96874030-K', razon_social: 'Distribuidora Central Ltda.',       fecha_docto: '2026-03-05', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 800000, monto_iva: 152000, otro_impto: null, monto_total: 952000, nro: 2, resultado: 0, documento_url: null, created_at: '2026-03-05T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Soporte técnico mensual' },
  { id: 'mv003', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 1003, rut_cliente: '78900898-1', razon_social: 'Exportadora Pacífico SA',            fecha_docto: '2026-03-08', tipo_doc_id: 39, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: null, monto_iva: null, otro_impto: null, monto_total: 250000, nro: 3, resultado: 0, documento_url: null, created_at: '2026-03-08T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Capacitación' },
  { id: 'mv004', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 1004, rut_cliente: '81812834-7', razon_social: 'Clínica Santa Rosa SpA',             fecha_docto: '2026-03-10', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 2200000, monto_iva: 418000, otro_impto: null, monto_total: 2618000, nro: 4, resultado: 0, documento_url: null, created_at: '2026-03-10T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Desarrollo de sistema HIS' },
  { id: 'mv005', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 1005, rut_cliente: '56789012-0', razon_social: 'Hotelería del Sur Ltda.',            fecha_docto: '2026-03-12', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 650000, monto_iva: 123500, otro_impto: null, monto_total: 773500, nro: 5, resultado: 0, documento_url: null, created_at: '2026-03-12T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Licencia de software' },
  { id: 'mv006', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 1006, rut_cliente: '77777770-K', razon_social: 'Inmobiliaria Los Alamos SA',         fecha_docto: '2026-03-15', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 3500000, monto_iva: 665000, otro_impto: null, monto_total: 4165000, nro: 6, resultado: 0, documento_url: null, created_at: '2026-03-15T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Sistema de gestión inmobiliaria' },
  { id: 'mv007', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 1007, rut_cliente: '66666660-2', razon_social: 'Minera Atacama SpA',                 fecha_docto: '2026-03-18', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 5000000, monto_iva: 950000, otro_impto: null, monto_total: 5950000, nro: 7, resultado: 0, documento_url: null, created_at: '2026-03-18T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Plataforma ERP minería' },
  { id: 'mv008', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 1008, rut_cliente: '55555556-7', razon_social: 'Consultora BPO Partners Ltda.',      fecha_docto: '2026-03-22', tipo_doc_id: 39, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: null, monto_iva: null, otro_impto: null, monto_total: 180000, nro: 8, resultado: 0, documento_url: null, created_at: '2026-03-22T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Taller de capacitación' },
  { id: 'mv009', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 1009, rut_cliente: '44444448-9', razon_social: 'Agrícola Valle Verde SpA',           fecha_docto: '2026-03-25', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 1200000, monto_iva: 228000, otro_impto: null, monto_total: 1428000, nro: 9, resultado: 0, documento_url: null, created_at: '2026-03-25T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Software de trazabilidad' },
  { id: 'mv010', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 1010, rut_cliente: '33333331-4', razon_social: 'Retail Fashion Group SA',            fecha_docto: '2026-03-28', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 900000, monto_iva: 171000, otro_impto: null, monto_total: 1071000, nro: 10, resultado: 0, documento_url: null, created_at: '2026-03-28T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Integración de e-commerce' },

  // ABRIL 2026
  { id: 'mv011', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 1011, rut_cliente: '22222220-6', razon_social: 'Logística Express Ltda.',            fecha_docto: '2026-04-02', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 750000, monto_iva: 142500, otro_impto: null, monto_total: 892500, nro: 11, resultado: 0, documento_url: null, created_at: '2026-04-02T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Sistema de tracking' },
  { id: 'mv012', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 1012, rut_cliente: '11111111-1', razon_social: 'Editorial Conocimiento SA',          fecha_docto: '2026-04-05', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 500000, monto_iva: 95000, otro_impto: null, monto_total: 595000, nro: 12, resultado: 0, documento_url: null, created_at: '2026-04-05T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Plataforma editorial digital' },
  { id: 'mv013', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 1013, rut_cliente: '99999996-3', razon_social: 'Pesquera Austral SpA',               fecha_docto: '2026-04-08', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 1800000, monto_iva: 342000, otro_impto: null, monto_total: 2142000, nro: 13, resultado: 0, documento_url: null, created_at: '2026-04-08T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Sistema de control de producción' },
  { id: 'mv014', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 1014, rut_cliente: '88888880-5', razon_social: 'Viñedos del Maipo Ltda.',            fecha_docto: '2026-04-12', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 1100000, monto_iva: 209000, otro_impto: null, monto_total: 1309000, nro: 14, resultado: 0, documento_url: null, created_at: '2026-04-12T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'App bodega y despacho' },
  { id: 'mv015', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 1015, rut_cliente: '12345678-5', razon_social: 'Servicios Industriales Norte SA',    fecha_docto: '2026-04-15', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 2800000, monto_iva: 532000, otro_impto: null, monto_total: 3332000, nro: 15, resultado: 0, documento_url: null, created_at: '2026-04-15T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'SCADA industrial' },
  { id: 'mv016', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 1016, rut_cliente: '76876543-2', razon_social: 'Telecomunicaciones Sur SpA',         fecha_docto: '2026-04-18', tipo_doc_id: 34, tipo_venta: 'Ventas del giro', monto_exento: 950000, monto_neto: null, monto_iva: null, otro_impto: null, monto_total: 950000, nro: 16, resultado: 0, documento_url: null, created_at: '2026-04-18T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Consultoría exenta' },
  { id: 'mv017', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 1017, rut_cliente: '76109876-5', razon_social: 'Farmacia Bienestar Ltda.',           fecha_docto: '2026-04-22', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 600000, monto_iva: 114000, otro_impto: null, monto_total: 714000, nro: 17, resultado: 0, documento_url: null, created_at: '2026-04-22T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Software POS' },
  { id: 'mv018', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 1018, rut_cliente: '76543212-3', razon_social: 'Escuela de Idiomas Global SpA',      fecha_docto: '2026-04-25', tipo_doc_id: 39, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: null, monto_iva: null, otro_impto: null, monto_total: 320000, nro: 18, resultado: 0, documento_url: null, created_at: '2026-04-25T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Plataforma e-learning' },
  { id: 'mv019', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 1019, rut_cliente: '76321098-7', razon_social: 'Centro Deportivo Olimpo SA',         fecha_docto: '2026-04-28', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 480000, monto_iva: 91200, otro_impto: null, monto_total: 571200, nro: 19, resultado: 0, documento_url: null, created_at: '2026-04-28T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'App deportiva' },
  { id: 'mv020', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 1020, rut_cliente: '76112233-1', razon_social: 'Automotora Nacional SpA',            fecha_docto: '2026-04-30', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 1600000, monto_iva: 304000, otro_impto: null, monto_total: 1904000, nro: 20, resultado: 0, documento_url: null, created_at: '2026-04-30T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'CRM automotriz' },

  // MAYO 2026
  { id: 'mv021', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 5, folio: 1021, rut_cliente: '76445566-K', razon_social: 'Seguros Confianza Ltda.',            fecha_docto: '2026-05-03', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 2000000, monto_iva: 380000, otro_impto: null, monto_total: 2380000, nro: 21, resultado: 0, documento_url: null, created_at: '2026-05-03T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Portal de pólizas' },
  { id: 'mv022', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 5, folio: 1022, rut_cliente: '76778899-4', razon_social: 'Catering Sabores del Norte SpA',     fecha_docto: '2026-05-07', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 350000, monto_iva: 66500, otro_impto: null, monto_total: 416500, nro: 22, resultado: 0, documento_url: null, created_at: '2026-05-07T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'App de pedidos' },
  { id: 'mv023', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 5, folio: 1023, rut_cliente: '76998877-2', razon_social: 'Arquitectura e Ingeniería ABI SA',   fecha_docto: '2026-05-10', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 4200000, monto_iva: 798000, otro_impto: null, monto_total: 4998000, nro: 23, resultado: 0, documento_url: null, created_at: '2026-05-10T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Software BIM' },
  { id: 'mv024', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 5, folio: 1024, rut_cliente: '76354771-K', razon_social: 'Constructora Andina SpA',            fecha_docto: '2026-05-14', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 1800000, monto_iva: 342000, otro_impto: null, monto_total: 2142000, nro: 24, resultado: 0, documento_url: null, created_at: '2026-05-14T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Mantenimiento plataforma' },
  { id: 'mv025', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 5, folio: 1025, rut_cliente: '66666660-2', razon_social: 'Minera Atacama SpA',                 fecha_docto: '2026-05-18', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 6000000, monto_iva: 1140000, otro_impto: null, monto_total: 7140000, nro: 25, resultado: 0, documento_url: null, created_at: '2026-05-18T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Ampliación ERP' },
  { id: 'mv026', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 5, folio: 1026, rut_cliente: '81812834-7', razon_social: 'Clínica Santa Rosa SpA',             fecha_docto: '2026-05-22', tipo_doc_id: 34, tipo_venta: 'Ventas del giro', monto_exento: 1200000, monto_neto: null, monto_iva: null, otro_impto: null, monto_total: 1200000, nro: 26, resultado: 0, documento_url: null, created_at: '2026-05-22T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Servicio exento teleconsulta' },
  { id: 'mv027', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 5, folio: 1027, rut_cliente: '76543212-3', razon_social: 'Escuela de Idiomas Global SpA',      fecha_docto: '2026-05-25', tipo_doc_id: 39, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: null, monto_iva: null, otro_impto: null, monto_total: 450000, nro: 27, resultado: 0, documento_url: null, created_at: '2026-05-25T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Suscripción plataforma' },
  { id: 'mv028', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 5, folio: 1028, rut_cliente: '96874030-K', razon_social: 'Distribuidora Central Ltda.',       fecha_docto: '2026-05-28', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 950000, monto_iva: 180500, otro_impto: null, monto_total: 1130500, nro: 28, resultado: 0, documento_url: null, created_at: '2026-05-28T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Renovación soporte' },

  // JUNIO 2026
  { id: 'mv029', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 6, folio: 1029, rut_cliente: '77777770-K', razon_social: 'Inmobiliaria Los Alamos SA',         fecha_docto: '2026-06-03', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 4500000, monto_iva: 855000, otro_impto: null, monto_total: 5355000, nro: 29, resultado: 0, documento_url: null, created_at: '2026-06-03T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Módulo reporting' },
  { id: 'mv030', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 6, folio: 1030, rut_cliente: '12345678-5', razon_social: 'Servicios Industriales Norte SA',    fecha_docto: '2026-06-06', tipo_doc_id: 33, tipo_venta: 'Ventas del giro', monto_exento: null, monto_neto: 3200000, monto_iva: 608000, otro_impto: null, monto_total: 3808000, nro: 30, resultado: 0, documento_url: null, created_at: '2026-06-06T10:00:00Z', fecha_acuse: null, fecha_recepcion: null, fecha_reclamo: null, producto_servicio: 'Integración IoT' },
];

// ─── Proveedores ─────────────────────────────────────────────────────────────────

export const proveedores = [
  { id: 'p01', tenant_id: DEMO_TENANT_ID, rut: '76200001-1', nombre: 'Proveedor Cloud AWS Partners SpA',    productos_servicios: 'Servicios cloud', vencimiento: 30, correo: 'factura@awspartners.cl', fono: '+56225560001', activo: true, created_at: '2024-01-20T00:00:00Z', updated_at: '2024-01-20T00:00:00Z' },
  { id: 'p02', tenant_id: DEMO_TENANT_ID, rut: '76200002-K', nombre: 'Licencias Microsoft Chile Ltda.',     productos_servicios: 'Licencias de software', vencimiento: 0, correo: 'ventas@mschile.cl', fono: '+56225560002', activo: true, created_at: '2024-01-21T00:00:00Z', updated_at: '2024-01-21T00:00:00Z' },
  { id: 'p03', tenant_id: DEMO_TENANT_ID, rut: '76200003-8', nombre: 'Arriendo Oficinas Providencia SA',    productos_servicios: 'Arriendo de oficinas', vencimiento: 0, correo: 'arriendos@providencia.cl', fono: '+56225560003', activo: true, created_at: '2024-01-22T00:00:00Z', updated_at: '2024-01-22T00:00:00Z' },
  { id: 'p04', tenant_id: DEMO_TENANT_ID, rut: '76200004-6', nombre: 'Telefonía Empresarial Entel SA',      productos_servicios: 'Telefonía e internet', vencimiento: 0, correo: 'empresas@entel.cl', fono: '+56225560004', activo: true, created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
  { id: 'p05', tenant_id: DEMO_TENANT_ID, rut: '76200005-4', nombre: 'Suministros de Oficina SpA',          productos_servicios: 'Materiales de oficina', vencimiento: 30, correo: 'pedidos@suministros.cl', fono: '+56225560005', activo: true, created_at: '2024-02-05T00:00:00Z', updated_at: '2024-02-05T00:00:00Z' },
];

// ─── Movimientos de Compra (3 meses) ───────────────────────────────────────────

export const movimientos_compra = [
  { id: 'mc001', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 5001, rut_proveedor: '76200001-1', razon_social: 'Proveedor Cloud AWS Partners SpA', fecha_docto: '2026-03-01', tipo_doc_id: 33, tipo_compra: 'Compras del giro', monto_exento: null, monto_neto: 800000,  monto_iva: 152000, otro_impto: null, monto_total: 952000,  nro: 1, resultado: 0, documento_url: null, created_at: '2026-03-01T09:00:00Z', fecha_acuse: null, fecha_recepcion: '2026-03-01T00:00:00Z', fecha_reclamo: null, producto_servicio: 'Servicios cloud marzo' },
  { id: 'mc002', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 5002, rut_proveedor: '76200002-K', razon_social: 'Licencias Microsoft Chile Ltda.', fecha_docto: '2026-03-05', tipo_doc_id: 33, tipo_compra: 'Compras del giro', monto_exento: null, monto_neto: 350000,  monto_iva: 66500,  otro_impto: null, monto_total: 416500,  nro: 2, resultado: 0, documento_url: null, created_at: '2026-03-05T09:00:00Z', fecha_acuse: null, fecha_recepcion: '2026-03-05T00:00:00Z', fecha_reclamo: null, producto_servicio: 'Microsoft 365 marzo' },
  { id: 'mc003', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 5003, rut_proveedor: '76200003-8', razon_social: 'Arriendo Oficinas Providencia SA', fecha_docto: '2026-03-01', tipo_doc_id: 33, tipo_compra: 'Compras del giro', monto_exento: null, monto_neto: 1200000, monto_iva: 228000, otro_impto: null, monto_total: 1428000, nro: 3, resultado: 0, documento_url: null, created_at: '2026-03-01T09:00:00Z', fecha_acuse: null, fecha_recepcion: '2026-03-01T00:00:00Z', fecha_reclamo: null, producto_servicio: 'Arriendo marzo' },
  { id: 'mc004', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 5004, rut_proveedor: '76200001-1', razon_social: 'Proveedor Cloud AWS Partners SpA', fecha_docto: '2026-04-01', tipo_doc_id: 33, tipo_compra: 'Compras del giro', monto_exento: null, monto_neto: 850000,  monto_iva: 161500, otro_impto: null, monto_total: 1011500, nro: 4, resultado: 0, documento_url: null, created_at: '2026-04-01T09:00:00Z', fecha_acuse: null, fecha_recepcion: '2026-04-01T00:00:00Z', fecha_reclamo: null, producto_servicio: 'Servicios cloud abril' },
  { id: 'mc005', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 5005, rut_proveedor: '76200004-6', razon_social: 'Telefonía Empresarial Entel SA',   fecha_docto: '2026-04-05', tipo_doc_id: 33, tipo_compra: 'Compras del giro', monto_exento: null, monto_neto: 180000,  monto_iva: 34200,  otro_impto: null, monto_total: 214200,  nro: 5, resultado: 0, documento_url: null, created_at: '2026-04-05T09:00:00Z', fecha_acuse: null, fecha_recepcion: '2026-04-05T00:00:00Z', fecha_reclamo: null, producto_servicio: 'Telefonía abril' },
  { id: 'mc006', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 5, folio: 5006, rut_proveedor: '76200003-8', razon_social: 'Arriendo Oficinas Providencia SA', fecha_docto: '2026-05-01', tipo_doc_id: 33, tipo_compra: 'Compras del giro', monto_exento: null, monto_neto: 1200000, monto_iva: 228000, otro_impto: null, monto_total: 1428000, nro: 6, resultado: 0, documento_url: null, created_at: '2026-05-01T09:00:00Z', fecha_acuse: null, fecha_recepcion: '2026-05-01T00:00:00Z', fecha_reclamo: null, producto_servicio: 'Arriendo mayo' },
];

// ─── Prestadores ────────────────────────────────────────────────────────────────

export const prestadores = [
  { id: 'pr01', tenant_id: DEMO_TENANT_ID, rut: '15432100-K', nombre: 'María González Rojas',        sociedad_prof: false, fono: '+56912000001', correo: 'mgonzalez@gmail.com', activo: true, created_at: '2024-01-20T00:00:00Z', updated_at: '2024-01-20T00:00:00Z' },
  { id: 'pr02', tenant_id: DEMO_TENANT_ID, rut: '14321009-5', nombre: 'Andrés Morales Díaz',         sociedad_prof: false, fono: '+56912000002', correo: 'amorales@gmail.com', activo: true, created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
  { id: 'pr03', tenant_id: DEMO_TENANT_ID, rut: '76300001-2', nombre: 'Consultoría JR SpA',          sociedad_prof: true, fono: '+56225600001', correo: 'contacto@consultoriajr.cl', activo: true, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z' },
  { id: 'pr04', tenant_id: DEMO_TENANT_ID, rut: '13210098-3', nombre: 'Isabel Pérez Contreras',      sociedad_prof: false, fono: '+56912000003', correo: 'iperez@gmail.com', activo: true, created_at: '2024-03-15T00:00:00Z', updated_at: '2024-03-15T00:00:00Z' },
];

// ─── Movimientos de Honorarios ─────────────────────────────────────────────────

export const movimientos_honorarios = [
  { id: 'mh001', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 3001, rut_prestador: '15432100-K', nombre_prestador: 'María González Rojas',   tipo_documento: 'Boleta de Honorarios', sociedad_prof: null, fecha_docto: '2026-03-15', monto_bruto: 1500000, monto_retenido: 135000, monto_pagado: 1365000, estado: 'pagado', nro: 1, producto_servicio: 'Diseño UX/UI', documento_url: null, fecha_anulacion: null, created_at: '2026-03-15T10:00:00Z', updated_at: '2026-03-15T10:00:00Z' },
  { id: 'mh002', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, folio: 3002, rut_prestador: '14321009-5', nombre_prestador: 'Andrés Morales Díaz',      tipo_documento: 'Boleta de Honorarios', sociedad_prof: null, fecha_docto: '2026-03-20', monto_bruto: 900000,  monto_retenido: 81000,  monto_pagado: 819000,  estado: 'pagado', nro: 2, producto_servicio: 'DevOps', documento_url: null, fecha_anulacion: null, created_at: '2026-03-20T10:00:00Z', updated_at: '2026-03-20T10:00:00Z' },
  { id: 'mh003', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 3003, rut_prestador: '15432100-K', nombre_prestador: 'María González Rojas',   tipo_documento: 'Boleta de Honorarios', sociedad_prof: null, fecha_docto: '2026-04-15', monto_bruto: 1500000, monto_retenido: 135000, monto_pagado: 1365000, estado: 'pagado', nro: 3, producto_servicio: 'Diseño UX/UI', documento_url: null, fecha_anulacion: null, created_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'mh004', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, folio: 3004, rut_prestador: '76300001-2', nombre_prestador: 'Consultoría JR SpA',      tipo_documento: 'Factura de Honorarios', sociedad_prof: 'Consultoría JR SpA', fecha_docto: '2026-04-20', monto_bruto: 2000000, monto_retenido: 0, monto_pagado: 2000000, estado: 'pagado', nro: 4, producto_servicio: 'Consultoría estratégica', documento_url: null, fecha_anulacion: null, created_at: '2026-04-20T10:00:00Z', updated_at: '2026-04-20T10:00:00Z' },
  { id: 'mh005', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 5, folio: 3005, rut_prestador: '13210098-3', nombre_prestador: 'Isabel Pérez Contreras',  tipo_documento: 'Boleta de Honorarios', sociedad_prof: null, fecha_docto: '2026-05-10', monto_bruto: 700000,  monto_retenido: 63000,  monto_pagado: 637000,  estado: 'emitido', nro: 5, producto_servicio: 'Testing QA', documento_url: null, fecha_anulacion: null, created_at: '2026-05-10T10:00:00Z', updated_at: '2026-05-10T10:00:00Z' },
];

// ─── Trabajadores ──────────────────────────────────────────────────────────────

export const trabajadores = [
  { id: 'tr01', tenant_id: DEMO_TENANT_ID, rut: '17654321-3', nombre: 'Juan Pablo Soto', cargo: 'Desarrollador Senior', fono: '+56912100001', correo: 'jpsoto@techdemo.cl', fecha_ingreso: '2022-03-01', activo: true, created_at: '2022-03-01T00:00:00Z', updated_at: '2022-03-01T00:00:00Z' },
  { id: 'tr02', tenant_id: DEMO_TENANT_ID, rut: '18765432-1', nombre: 'Valentina Cruz',  cargo: 'Project Manager',    fono: '+56912100002', correo: 'vcruz@techdemo.cl',  fecha_ingreso: '2023-01-15', activo: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 'tr03', tenant_id: DEMO_TENANT_ID, rut: '19876543-2', nombre: 'Felipe Herrera',  cargo: 'Analista de Datos',  fono: '+56912100003', correo: 'fherrera@techdemo.cl', fecha_ingreso: '2023-06-01', activo: true, created_at: '2023-06-01T00:00:00Z', updated_at: '2023-06-01T00:00:00Z' },
];

// ─── Movimientos de Remuneraciones ────────────────────────────────────────────

export const movimientos_remuneracion = [
  { id: 'mr001', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, trabajador_id: 'tr01', rut_trabajador: '17654321-3', nombre_trabajador: 'Juan Pablo Soto', sueldo_base: 1800000, gratificacion: 150000, descuentos_legales: 234000, otros_descuentos: 0, liquido: 1716000, estado: 'pagado', fecha_pago: '2026-03-31', created_at: '2026-03-31T10:00:00Z', updated_at: '2026-03-31T10:00:00Z' },
  { id: 'mr002', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, trabajador_id: 'tr02', rut_trabajador: '18765432-1', nombre_trabajador: 'Valentina Cruz',  sueldo_base: 2200000, gratificacion: 183333, descuentos_legales: 286000, otros_descuentos: 0, liquido: 2097333, estado: 'pagado', fecha_pago: '2026-03-31', created_at: '2026-03-31T10:00:00Z', updated_at: '2026-03-31T10:00:00Z' },
  { id: 'mr003', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 3, trabajador_id: 'tr03', rut_trabajador: '19876543-2', nombre_trabajador: 'Felipe Herrera',  sueldo_base: 1500000, gratificacion: 125000, descuentos_legales: 195000, otros_descuentos: 0, liquido: 1430000, estado: 'pagado', fecha_pago: '2026-03-31', created_at: '2026-03-31T10:00:00Z', updated_at: '2026-03-31T10:00:00Z' },
  { id: 'mr004', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, trabajador_id: 'tr01', rut_trabajador: '17654321-3', nombre_trabajador: 'Juan Pablo Soto', sueldo_base: 1800000, gratificacion: 150000, descuentos_legales: 234000, otros_descuentos: 0, liquido: 1716000, estado: 'pagado', fecha_pago: '2026-04-30', created_at: '2026-04-30T10:00:00Z', updated_at: '2026-04-30T10:00:00Z' },
  { id: 'mr005', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, trabajador_id: 'tr02', rut_trabajador: '18765432-1', nombre_trabajador: 'Valentina Cruz',  sueldo_base: 2200000, gratificacion: 183333, descuentos_legales: 286000, otros_descuentos: 0, liquido: 2097333, estado: 'pagado', fecha_pago: '2026-04-30', created_at: '2026-04-30T10:00:00Z', updated_at: '2026-04-30T10:00:00Z' },
  { id: 'mr006', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 4, trabajador_id: 'tr03', rut_trabajador: '19876543-2', nombre_trabajador: 'Felipe Herrera',  sueldo_base: 1500000, gratificacion: 125000, descuentos_legales: 195000, otros_descuentos: 0, liquido: 1430000, estado: 'pagado', fecha_pago: '2026-04-30', created_at: '2026-04-30T10:00:00Z', updated_at: '2026-04-30T10:00:00Z' },
  { id: 'mr007', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 5, trabajador_id: 'tr01', rut_trabajador: '17654321-3', nombre_trabajador: 'Juan Pablo Soto', sueldo_base: 1800000, gratificacion: 150000, descuentos_legales: 234000, otros_descuentos: 0, liquido: 1716000, estado: 'pagado', fecha_pago: '2026-05-30', created_at: '2026-05-30T10:00:00Z', updated_at: '2026-05-30T10:00:00Z' },
  { id: 'mr008', tenant_id: DEMO_TENANT_ID, anio: 2026, mes: 5, trabajador_id: 'tr02', rut_trabajador: '18765432-1', nombre_trabajador: 'Valentina Cruz',  sueldo_base: 2200000, gratificacion: 183333, descuentos_legales: 286000, otros_descuentos: 0, liquido: 2097333, estado: 'pagado', fecha_pago: '2026-05-30', created_at: '2026-05-30T10:00:00Z', updated_at: '2026-05-30T10:00:00Z' },
];

// ─── Rendiciones ───────────────────────────────────────────────────────────────

export const rendiciones = [
  { id: 'rd001', tenant_id: DEMO_TENANT_ID, numero: 'RD-2026-001', titulo: 'Gastos viaje cliente Antofagasta', descripcion: 'Pasajes, hotel y alimentación', estado: 'aprobado', total: 385000, solicitante_id: DEMO_USER_ID, solicitante_nombre: 'Carlos Administrador', aprobado_por: DEMO_USER_ID, aprobado_por_nombre: 'Carlos Administrador', fecha_creacion: '2026-03-10', fecha_envio: '2026-03-11', fecha_aprobacion: '2026-03-13', motivo_rechazo: null, created_at: '2026-03-10T10:00:00Z', updated_at: '2026-03-13T10:00:00Z' },
  { id: 'rd002', tenant_id: DEMO_TENANT_ID, numero: 'RD-2026-002', titulo: 'Materiales capacitación equipo',   descripcion: 'Materiales y coffee break', estado: 'pendiente', total: 125000, solicitante_id: DEMO_USER_ID, solicitante_nombre: 'Carlos Administrador', aprobado_por: null, aprobado_por_nombre: null, fecha_creacion: '2026-04-15', fecha_envio: '2026-04-15', fecha_aprobacion: null, motivo_rechazo: null, created_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'rd003', tenant_id: DEMO_TENANT_ID, numero: 'RD-2026-003', titulo: 'Equipamiento home office',          descripcion: 'Monitor y teclado para teletrabajo', estado: 'rechazado', total: 280000, solicitante_id: DEMO_USER_ID, solicitante_nombre: 'Carlos Administrador', aprobado_por: DEMO_USER_ID, aprobado_por_nombre: 'Carlos Administrador', fecha_creacion: '2026-05-02', fecha_envio: '2026-05-03', fecha_aprobacion: '2026-05-05', motivo_rechazo: 'Supera monto máximo permitido', created_at: '2026-05-02T10:00:00Z', updated_at: '2026-05-05T10:00:00Z' },
];

// ─── Rendicion Items ───────────────────────────────────────────────────────────

export const rendicion_items = [
  { id: 'ri001', tenant_id: DEMO_TENANT_ID, rendicion_id: 'rd001', fecha_gasto: '2026-03-10', categoria: 'Transporte', comercio: 'LATAM Airlines', rut_comercio: '88888002-0', descripcion: 'Pasaje ida y vuelta SCL-ANF', monto: 185000, documento_url: null, orden: 1, created_at: '2026-03-10T10:00:00Z', updated_at: '2026-03-10T10:00:00Z' },
  { id: 'ri002', tenant_id: DEMO_TENANT_ID, rendicion_id: 'rd001', fecha_gasto: '2026-03-11', categoria: 'Alojamiento', comercio: 'Hotel Antofagasta', rut_comercio: null, descripcion: 'Hotel 2 noches', monto: 160000, documento_url: null, orden: 2, created_at: '2026-03-10T10:00:00Z', updated_at: '2026-03-10T10:00:00Z' },
  { id: 'ri003', tenant_id: DEMO_TENANT_ID, rendicion_id: 'rd001', fecha_gasto: '2026-03-11', categoria: 'Alimentación', comercio: 'Restaurant El Rincón', rut_comercio: null, descripcion: 'Almuerzo con cliente', monto: 40000, documento_url: null, orden: 3, created_at: '2026-03-10T10:00:00Z', updated_at: '2026-03-10T10:00:00Z' },
  { id: 'ri004', tenant_id: DEMO_TENANT_ID, rendicion_id: 'rd002', fecha_gasto: '2026-04-15', categoria: 'Materiales', comercio: 'Librería Universitaria', rut_comercio: null, descripcion: 'Materiales capacitación', monto: 85000, documento_url: null, orden: 1, created_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'ri005', tenant_id: DEMO_TENANT_ID, rendicion_id: 'rd002', fecha_gasto: '2026-04-15', categoria: 'Alimentación', comercio: 'Catering Express', rut_comercio: null, descripcion: 'Coffee break', monto: 40000, documento_url: null, orden: 2, created_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
];

// ─── Documentos ────────────────────────────────────────────────────────────────

export const documentos: any[] = [];

// ─── Configuracion ──────────────────────────────────────────────────────────────

export const configuracion = [
  { tenant_id: DEMO_TENANT_ID, clave: 'moneda', valor: 'CLP', created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z' },
  { tenant_id: DEMO_TENANT_ID, clave: 'iva', valor: '19', created_at: '2024-01-15T00:00:00Z', updated_at: '2024-01-15T00:00:00Z' },
];

// ─── Libro Ventas view (computed dynamically in mock client) ────────────────────
// This is a DB view — computed on-the-fly from movimientos_venta in the mock client

// ─── All tables registry ───────────────────────────────────────────────────────

export const INITIAL_MOCK_DB: Record<string, any[]> = {
  tenants,
  user_tenants,
  user_profiles,
  tipo_documento,
  clientes,
  movimientos_venta,
  proveedores,
  movimientos_compra,
  prestadores,
  movimientos_honorarios,
  trabajadores,
  movimientos_remuneracion,
  rendiciones,
  rendicion_items,
  documentos,
  configuracion,
};

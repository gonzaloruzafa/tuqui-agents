/**
 * Odoo Semantic Schema Layer
 * 
 * Este archivo define el mapeo entre conceptos de negocio en lenguaje natural
 * y los modelos técnicos de Odoo. El LLM usará esta información para:
 * 1. Entender qué datos puede consultar
 * 2. Saber qué campos están disponibles
 * 3. Conocer las relaciones entre entidades
 * 
 * IMPORTANTE: Solo exponemos los campos que queremos que el LLM pueda usar.
 * Esto evita que intente adivinar nombres de campos o tablas.
 */

export interface OdooField {
  name: string           // Nombre técnico del campo en Odoo
  label: string          // Nombre amigable para el LLM
  type: 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime' | 'many2one' | 'one2many' | 'selection'
  description: string    // Descripción para el LLM
  selection?: Record<string, string>  // Para campos selection: valor técnico → descripción
  relation?: string      // Para many2one/one2many: modelo relacionado
  searchable?: boolean   // Si se puede usar en domain (default: true)
  filterable?: boolean   // Si se puede filtrar (default: true)
}

export interface OdooModel {
  name: string           // Nombre técnico del modelo en Odoo (ej: 'sale.order')
  label: string          // Nombre amigable (ej: 'Orden de Venta')
  description: string    // Descripción del concepto de negocio
  fields: OdooField[]    // Campos disponibles
  commonFilters?: string[] // Filtros comunes sugeridos
}

// ============================================================================
// DEFINICIÓN DE MODELOS DE ODOO
// ============================================================================

export const ODOO_MODELS: Record<string, OdooModel> = {
  // ---------------------------------------------------------------------------
  // VENTAS
  // ---------------------------------------------------------------------------
  'sale.order': {
    name: 'sale.order',
    label: 'Orden de Venta / Pedido',
    description: 'Representa una venta o cotización. Contiene información del cliente, productos vendidos, totales y estado.',
    fields: [
      { name: 'id', label: 'ID', type: 'integer', description: 'Identificador único' },
      { name: 'name', label: 'Número de Orden', type: 'string', description: 'Código único de la orden (ej: S00001)' },
      { name: 'partner_id', label: 'Cliente', type: 'many2one', relation: 'res.partner', description: 'Cliente asociado. Devuelve [id, nombre]' },
      { name: 'date_order', label: 'Fecha de Orden', type: 'datetime', description: 'Fecha y hora de creación. Formato: YYYY-MM-DD HH:MM:SS' },
      { name: 'amount_untaxed', label: 'Subtotal', type: 'float', description: 'Monto sin impuestos' },
      { name: 'amount_tax', label: 'Impuestos', type: 'float', description: 'Total de impuestos' },
      { name: 'amount_total', label: 'Total', type: 'float', description: 'Monto total con impuestos' },
      { name: 'state', label: 'Estado', type: 'selection', description: 'Estado de la orden', selection: {
        'draft': 'Cotización (borrador)',
        'sent': 'Cotización Enviada',
        'sale': 'Orden Confirmada',
        'done': 'Completada/Bloqueada',
        'cancel': 'Cancelada'
      }},
      { name: 'user_id', label: 'Vendedor', type: 'many2one', relation: 'res.users', description: 'Vendedor responsable' },
      { name: 'team_id', label: 'Equipo de Ventas', type: 'many2one', relation: 'crm.team', description: 'Equipo comercial' },
      { name: 'invoice_status', label: 'Estado Facturación', type: 'selection', description: 'Estado de facturación', selection: {
        'upselling': 'Oportunidad de Upselling',
        'invoiced': 'Completamente Facturado',
        'to invoice': 'Para Facturar',
        'no': 'Nada que Facturar'
      }},
      { name: 'order_line', label: 'Líneas de Pedido', type: 'one2many', relation: 'sale.order.line', description: 'Productos de la orden', searchable: false },
      { name: 'create_date', label: 'Fecha de Creación', type: 'datetime', description: 'Fecha de creación del registro' },
      { name: 'currency_id', label: 'Moneda', type: 'many2one', relation: 'res.currency', description: 'Moneda de la transacción' },
    ],
    commonFilters: [
      "Ventas confirmadas: [['state', 'in', ['sale', 'done']]]",
      "Ventas de hoy: [['date_order', '>=', 'HOY 00:00:00'], ['date_order', '<=', 'HOY 23:59:59']]",
      "Por cliente: [['partner_id', '=', ID_CLIENTE]]"
    ]
  },

  'sale.order.line': {
    name: 'sale.order.line',
    label: 'Línea de Orden de Venta',
    description: 'Detalle de productos en una orden de venta. Cada línea representa un producto con su cantidad y precio.',
    fields: [
      { name: 'id', label: 'ID', type: 'integer', description: 'Identificador único' },
      { name: 'order_id', label: 'Orden de Venta', type: 'many2one', relation: 'sale.order', description: 'Orden a la que pertenece. Devuelve [id, nombre]' },
      { name: 'product_id', label: 'Producto', type: 'many2one', relation: 'product.product', description: 'Producto vendido. Devuelve [id, nombre]' },
      { name: 'name', label: 'Descripción', type: 'string', description: 'Descripción del producto en la línea' },
      { name: 'product_uom_qty', label: 'Cantidad', type: 'float', description: 'Cantidad ordenada' },
      { name: 'qty_delivered', label: 'Cantidad Entregada', type: 'float', description: 'Cantidad ya entregada' },
      { name: 'qty_invoiced', label: 'Cantidad Facturada', type: 'float', description: 'Cantidad facturada' },
      { name: 'price_unit', label: 'Precio Unitario', type: 'float', description: 'Precio por unidad' },
      { name: 'discount', label: 'Descuento %', type: 'float', description: 'Porcentaje de descuento aplicado' },
      { name: 'price_subtotal', label: 'Subtotal', type: 'float', description: 'Precio total de la línea sin impuestos' },
      { name: 'price_total', label: 'Total', type: 'float', description: 'Precio total con impuestos' },
    ],
    commonFilters: [
      "Por orden: [['order_id', '=', ID_ORDEN]]",
      "Por producto: [['product_id', '=', ID_PRODUCTO]]"
    ]
  },

  // ---------------------------------------------------------------------------
  // PRODUCTOS
  // ---------------------------------------------------------------------------
  'product.product': {
    name: 'product.product',
    label: 'Producto (Variante)',
    description: 'Productos específicos (variantes). Incluye stock, código de barras, precio.',
    fields: [
      { name: 'id', label: 'ID', type: 'integer', description: 'Identificador único' },
      { name: 'name', label: 'Nombre', type: 'string', description: 'Nombre del producto' },
      { name: 'default_code', label: 'Referencia Interna', type: 'string', description: 'SKU o código interno' },
      { name: 'barcode', label: 'Código de Barras', type: 'string', description: 'EAN/UPC del producto' },
      { name: 'list_price', label: 'Precio de Venta', type: 'float', description: 'Precio de lista' },
      { name: 'standard_price', label: 'Costo', type: 'float', description: 'Costo del producto' },
      { name: 'qty_available', label: 'Stock Disponible', type: 'float', description: 'Cantidad en stock' },
      { name: 'virtual_available', label: 'Stock Previsto', type: 'float', description: 'Stock considerando entradas/salidas programadas' },
      { name: 'categ_id', label: 'Categoría', type: 'many2one', relation: 'product.category', description: 'Categoría del producto' },
      { name: 'type', label: 'Tipo', type: 'selection', description: 'Tipo de producto', selection: {
        'consu': 'Consumible',
        'service': 'Servicio',
        'product': 'Almacenable'
      }},
      { name: 'active', label: 'Activo', type: 'boolean', description: 'Si el producto está activo' },
      { name: 'sale_ok', label: 'Puede Venderse', type: 'boolean', description: 'Si se puede vender' },
      { name: 'purchase_ok', label: 'Puede Comprarse', type: 'boolean', description: 'Si se puede comprar' },
    ],
    commonFilters: [
      "Productos activos: [['active', '=', true]]",
      "Productos vendibles: [['sale_ok', '=', true]]",
      "Con stock: [['qty_available', '>', 0]]",
      "Por categoría: [['categ_id', '=', ID_CATEGORIA]]"
    ]
  },

  'product.template': {
    name: 'product.template',
    label: 'Plantilla de Producto',
    description: 'Productos base (sin variantes). Útil para productos simples o consultas generales.',
    fields: [
      { name: 'id', label: 'ID', type: 'integer', description: 'Identificador único' },
      { name: 'name', label: 'Nombre', type: 'string', description: 'Nombre del producto' },
      { name: 'default_code', label: 'Referencia Interna', type: 'string', description: 'SKU o código' },
      { name: 'list_price', label: 'Precio de Venta', type: 'float', description: 'Precio de lista' },
      { name: 'standard_price', label: 'Costo', type: 'float', description: 'Costo del producto' },
      { name: 'categ_id', label: 'Categoría', type: 'many2one', relation: 'product.category', description: 'Categoría' },
      { name: 'type', label: 'Tipo', type: 'selection', description: 'Tipo de producto', selection: {
        'consu': 'Consumible',
        'service': 'Servicio',
        'product': 'Almacenable'
      }},
      { name: 'active', label: 'Activo', type: 'boolean', description: 'Si está activo' },
    ],
    commonFilters: [
      "Productos activos: [['active', '=', true]]"
    ]
  },

  // ---------------------------------------------------------------------------
  // CLIENTES / CONTACTOS
  // ---------------------------------------------------------------------------
  'res.partner': {
    name: 'res.partner',
    label: 'Contacto / Cliente / Proveedor',
    description: 'Entidad que puede ser cliente, proveedor, contacto o dirección. Usar customer_rank > 0 para clientes.',
    fields: [
      { name: 'id', label: 'ID', type: 'integer', description: 'Identificador único' },
      { name: 'name', label: 'Nombre', type: 'string', description: 'Nombre o razón social' },
      { name: 'display_name', label: 'Nombre Completo', type: 'string', description: 'Nombre formateado con empresa padre' },
      { name: 'email', label: 'Email', type: 'string', description: 'Correo electrónico' },
      { name: 'phone', label: 'Teléfono', type: 'string', description: 'Número de teléfono' },
      { name: 'mobile', label: 'Móvil', type: 'string', description: 'Número de celular' },
      { name: 'vat', label: 'CUIT/NIF', type: 'string', description: 'Identificación fiscal' },
      { name: 'street', label: 'Dirección', type: 'string', description: 'Calle y número' },
      { name: 'city', label: 'Ciudad', type: 'string', description: 'Ciudad' },
      { name: 'state_id', label: 'Provincia/Estado', type: 'many2one', relation: 'res.country.state', description: 'Provincia o estado' },
      { name: 'country_id', label: 'País', type: 'many2one', relation: 'res.country', description: 'País' },
      { name: 'customer_rank', label: 'Ranking Cliente', type: 'integer', description: 'Si > 0, es cliente. Mayor valor = más actividad' },
      { name: 'supplier_rank', label: 'Ranking Proveedor', type: 'integer', description: 'Si > 0, es proveedor' },
      { name: 'is_company', label: 'Es Empresa', type: 'boolean', description: 'True si es empresa, False si es persona' },
      { name: 'parent_id', label: 'Empresa Padre', type: 'many2one', relation: 'res.partner', description: 'Empresa a la que pertenece (para contactos)' },
      { name: 'user_id', label: 'Vendedor Asignado', type: 'many2one', relation: 'res.users', description: 'Vendedor responsable' },
      { name: 'active', label: 'Activo', type: 'boolean', description: 'Si el contacto está activo' },
      { name: 'create_date', label: 'Fecha de Creación', type: 'datetime', description: 'Cuándo se creó el registro' },
    ],
    commonFilters: [
      "Solo clientes: [['customer_rank', '>', 0]]",
      "Solo proveedores: [['supplier_rank', '>', 0]]",
      "Solo empresas: [['is_company', '=', true]]",
      "Por nombre (contiene): [['name', 'ilike', '%texto%']]",
      "Por email: [['email', '=', 'email@ejemplo.com']]"
    ]
  },

  // ---------------------------------------------------------------------------
  // FACTURACIÓN
  // ---------------------------------------------------------------------------
  'account.move': {
    name: 'account.move',
    label: 'Factura / Asiento Contable',
    description: 'Facturas de cliente, proveedor, notas de crédito y asientos contables.',
    fields: [
      { name: 'id', label: 'ID', type: 'integer', description: 'Identificador único' },
      { name: 'name', label: 'Número', type: 'string', description: 'Número de factura (ej: INV/2025/0001)' },
      { name: 'partner_id', label: 'Cliente/Proveedor', type: 'many2one', relation: 'res.partner', description: 'Cliente o proveedor' },
      { name: 'invoice_date', label: 'Fecha Factura', type: 'date', description: 'Fecha de la factura. Formato: YYYY-MM-DD' },
      { name: 'invoice_date_due', label: 'Fecha Vencimiento', type: 'date', description: 'Fecha de vencimiento' },
      { name: 'amount_untaxed', label: 'Subtotal', type: 'float', description: 'Monto sin impuestos' },
      { name: 'amount_tax', label: 'Impuestos', type: 'float', description: 'Total de impuestos' },
      { name: 'amount_total', label: 'Total', type: 'float', description: 'Monto total' },
      { name: 'amount_residual', label: 'Saldo Pendiente', type: 'float', description: 'Monto que queda por pagar' },
      { name: 'state', label: 'Estado', type: 'selection', description: 'Estado de la factura', selection: {
        'draft': 'Borrador',
        'posted': 'Publicada/Validada',
        'cancel': 'Cancelada'
      }},
      { name: 'payment_state', label: 'Estado de Pago', type: 'selection', description: 'Estado del pago', selection: {
        'not_paid': 'No Pagada',
        'in_payment': 'En Proceso de Pago',
        'paid': 'Pagada',
        'partial': 'Parcialmente Pagada',
        'reversed': 'Reversada',
        'invoicing_legacy': 'Legacy'
      }},
      { name: 'move_type', label: 'Tipo de Documento', type: 'selection', description: 'Tipo de factura', selection: {
        'entry': 'Asiento Contable',
        'out_invoice': 'Factura de Cliente',
        'out_refund': 'Nota de Crédito Cliente',
        'in_invoice': 'Factura de Proveedor',
        'in_refund': 'Nota de Crédito Proveedor',
        'out_receipt': 'Recibo de Venta',
        'in_receipt': 'Recibo de Compra'
      }},
      { name: 'invoice_origin', label: 'Documento Origen', type: 'string', description: 'Orden de venta/compra que generó la factura' },
      { name: 'user_id', label: 'Vendedor', type: 'many2one', relation: 'res.users', description: 'Usuario responsable' },
      { name: 'currency_id', label: 'Moneda', type: 'many2one', relation: 'res.currency', description: 'Moneda de la factura' },
    ],
    commonFilters: [
      "Facturas de cliente validadas: [['move_type', '=', 'out_invoice'], ['state', '=', 'posted']]",
      "Facturas impagas: [['payment_state', 'in', ['not_paid', 'partial']]]",
      "Por cliente: [['partner_id', '=', ID_CLIENTE]]",
      "Del mes: [['invoice_date', '>=', 'YYYY-MM-01'], ['invoice_date', '<=', 'YYYY-MM-31']]"
    ]
  },

  // ---------------------------------------------------------------------------
  // INVENTARIO
  // ---------------------------------------------------------------------------
  'stock.quant': {
    name: 'stock.quant',
    label: 'Stock / Inventario',
    description: 'Cantidades de productos en ubicaciones específicas. Para ver stock por producto.',
    fields: [
      { name: 'id', label: 'ID', type: 'integer', description: 'Identificador único' },
      { name: 'product_id', label: 'Producto', type: 'many2one', relation: 'product.product', description: 'Producto' },
      { name: 'location_id', label: 'Ubicación', type: 'many2one', relation: 'stock.location', description: 'Ubicación de almacén' },
      { name: 'quantity', label: 'Cantidad', type: 'float', description: 'Cantidad en stock' },
      { name: 'reserved_quantity', label: 'Cantidad Reservada', type: 'float', description: 'Cantidad reservada para órdenes' },
      { name: 'available_quantity', label: 'Cantidad Disponible', type: 'float', description: 'Cantidad disponible (no reservada)' },
      { name: 'lot_id', label: 'Lote', type: 'many2one', relation: 'stock.lot', description: 'Lote/Serie del producto' },
    ],
    commonFilters: [
      "Por producto: [['product_id', '=', ID_PRODUCTO]]",
      "Con stock: [['quantity', '>', 0]]"
    ]
  },

  'stock.picking': {
    name: 'stock.picking',
    label: 'Transferencia / Remito',
    description: 'Movimientos de stock: recepciones, entregas, transferencias internas.',
    fields: [
      { name: 'id', label: 'ID', type: 'integer', description: 'Identificador único' },
      { name: 'name', label: 'Referencia', type: 'string', description: 'Código del movimiento' },
      { name: 'partner_id', label: 'Contacto', type: 'many2one', relation: 'res.partner', description: 'Cliente o proveedor' },
      { name: 'scheduled_date', label: 'Fecha Programada', type: 'datetime', description: 'Fecha prevista' },
      { name: 'date_done', label: 'Fecha Efectiva', type: 'datetime', description: 'Fecha en que se completó' },
      { name: 'origin', label: 'Documento Origen', type: 'string', description: 'Orden que generó el movimiento' },
      { name: 'state', label: 'Estado', type: 'selection', description: 'Estado de la transferencia', selection: {
        'draft': 'Borrador',
        'waiting': 'En Espera de Otra Operación',
        'confirmed': 'Esperando',
        'assigned': 'Listo',
        'done': 'Realizado',
        'cancel': 'Cancelado'
      }},
      { name: 'picking_type_id', label: 'Tipo de Operación', type: 'many2one', relation: 'stock.picking.type', description: 'Tipo: Recepción, Entrega, etc.' },
    ],
    commonFilters: [
      "Entregas pendientes: [['state', 'not in', ['done', 'cancel']], ['picking_type_id.code', '=', 'outgoing']]",
      "Completadas: [['state', '=', 'done']]"
    ]
  },

  // ---------------------------------------------------------------------------
  // COMPRAS
  // ---------------------------------------------------------------------------
  'purchase.order': {
    name: 'purchase.order',
    label: 'Orden de Compra',
    description: 'Pedidos a proveedores.',
    fields: [
      { name: 'id', label: 'ID', type: 'integer', description: 'Identificador único' },
      { name: 'name', label: 'Número', type: 'string', description: 'Código de la OC' },
      { name: 'partner_id', label: 'Proveedor', type: 'many2one', relation: 'res.partner', description: 'Proveedor' },
      { name: 'date_order', label: 'Fecha de Orden', type: 'datetime', description: 'Fecha de la OC' },
      { name: 'date_planned', label: 'Fecha Recepción', type: 'datetime', description: 'Fecha prevista de recepción' },
      { name: 'amount_untaxed', label: 'Subtotal', type: 'float', description: 'Monto sin impuestos' },
      { name: 'amount_total', label: 'Total', type: 'float', description: 'Monto total' },
      { name: 'state', label: 'Estado', type: 'selection', description: 'Estado de la OC', selection: {
        'draft': 'Borrador (RFQ)',
        'sent': 'RFQ Enviada',
        'to approve': 'Para Aprobar',
        'purchase': 'Orden de Compra',
        'done': 'Bloqueada',
        'cancel': 'Cancelada'
      }},
      { name: 'user_id', label: 'Comprador', type: 'many2one', relation: 'res.users', description: 'Usuario responsable' },
    ],
    commonFilters: [
      "OC confirmadas: [['state', '=', 'purchase']]",
      "Pendientes de aprobar: [['state', '=', 'to approve']]"
    ]
  },

  // ---------------------------------------------------------------------------
  // CRM
  // ---------------------------------------------------------------------------
  'crm.lead': {
    name: 'crm.lead',
    label: 'Oportunidad / Lead',
    description: 'Oportunidades de venta y leads del CRM.',
    fields: [
      { name: 'id', label: 'ID', type: 'integer', description: 'Identificador único' },
      { name: 'name', label: 'Nombre', type: 'string', description: 'Nombre de la oportunidad' },
      { name: 'partner_id', label: 'Cliente', type: 'many2one', relation: 'res.partner', description: 'Cliente potencial' },
      { name: 'email_from', label: 'Email', type: 'string', description: 'Email del contacto' },
      { name: 'phone', label: 'Teléfono', type: 'string', description: 'Teléfono del contacto' },
      { name: 'expected_revenue', label: 'Ingreso Esperado', type: 'float', description: 'Monto esperado de la venta' },
      { name: 'probability', label: 'Probabilidad %', type: 'float', description: 'Probabilidad de cierre' },
      { name: 'stage_id', label: 'Etapa', type: 'many2one', relation: 'crm.stage', description: 'Etapa del pipeline' },
      { name: 'user_id', label: 'Vendedor', type: 'many2one', relation: 'res.users', description: 'Vendedor asignado' },
      { name: 'team_id', label: 'Equipo de Ventas', type: 'many2one', relation: 'crm.team', description: 'Equipo comercial' },
      { name: 'type', label: 'Tipo', type: 'selection', description: 'Lead u Oportunidad', selection: {
        'lead': 'Lead',
        'opportunity': 'Oportunidad'
      }},
      { name: 'active', label: 'Activo', type: 'boolean', description: 'Si está activo (no perdido/ganado archivado)' },
      { name: 'date_deadline', label: 'Fecha Cierre Esperada', type: 'date', description: 'Fecha esperada de cierre' },
      { name: 'create_date', label: 'Fecha Creación', type: 'datetime', description: 'Cuándo se creó' },
    ],
    commonFilters: [
      "Oportunidades activas: [['type', '=', 'opportunity'], ['active', '=', true]]",
      "Por vendedor: [['user_id', '=', ID_USUARIO]]"
    ]
  },
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Genera documentación legible de todos los modelos para inyectar en el System Prompt
 */
export function generateSchemaDocumentation(): string {
  let doc = `## MODELOS DE ODOO DISPONIBLES\n\n`
  doc += `Usá estos modelos para construir consultas. Solo podés consultar los campos listados.\n\n`

  for (const [key, model] of Object.entries(ODOO_MODELS)) {
    doc += `### ${model.label} (\`${model.name}\`)\n`
    doc += `${model.description}\n\n`
    doc += `**Campos disponibles:**\n`
    
    for (const field of model.fields) {
      let fieldDoc = `- \`${field.name}\` (${field.type}): ${field.description}`
      if (field.selection) {
        const options = Object.entries(field.selection)
          .map(([k, v]) => `'${k}'=${v}`)
          .join(', ')
        fieldDoc += ` Valores: ${options}`
      }
      doc += fieldDoc + '\n'
    }
    
    if (model.commonFilters && model.commonFilters.length > 0) {
      doc += `\n**Filtros comunes:**\n`
      for (const filter of model.commonFilters) {
        doc += `- ${filter}\n`
      }
    }
    
    doc += '\n---\n\n'
  }

  return doc
}

/**
 * Obtiene un modelo específico por su nombre técnico
 */
export function getModel(modelName: string): OdooModel | undefined {
  return ODOO_MODELS[modelName]
}

/**
 * Valida si un modelo existe en el schema
 */
export function isValidModel(modelName: string): boolean {
  return modelName in ODOO_MODELS
}

/**
 * Obtiene los campos válidos para un modelo
 */
export function getValidFields(modelName: string): string[] {
  const model = ODOO_MODELS[modelName]
  if (!model) return []
  return model.fields.map(f => f.name)
}

/**
 * Lista resumida de modelos para referencia rápida
 */
export function getModelList(): Array<{ name: string; label: string; description: string }> {
  return Object.values(ODOO_MODELS).map(m => ({
    name: m.name,
    label: m.label,
    description: m.description
  }))
}

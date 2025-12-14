/**
 * Odoo Tools for Vercel AI SDK
 * 
 * Define las herramientas (tools) que el LLM puede usar para consultar Odoo.
 * Usando Zod para validación de parámetros y type-safety.
 * 
 * NOTA: Usamos domainJson como string porque Gemini no soporta bien
 * schemas complejos con arrays de tuplas.
 */

import { z } from 'zod'
import { tool } from 'ai'
import { getOdooClient } from './client'
import { isValidModel, getValidFields } from './schema'

// ============================================================================
// TIPOS DE RESULTADO
// ============================================================================

interface OdooToolResult {
  success: boolean
  error?: string
  model?: string
  count?: number
  data?: any
}

// ============================================================================
// SCHEMAS ZOD SIMPLIFICADOS PARA GEMINI
// ============================================================================

/**
 * Schema principal para query_odoo
 * Usamos domainJson como string para evitar problemas con Gemini
 */
const QueryOdooSchema = z.object({
  model: z.string()
    .describe('Nombre técnico del modelo de Odoo (ej: sale.order, res.partner, product.product)'),
  
  domainJson: z.string()
    .describe('Domain en formato JSON string. Ejemplo: \'[["state", "in", ["sale", "done"]]]\' o \'[["name", "ilike", "%Garcia%"]]\'. Vacío para sin filtros: "[]"'),
  
  fieldsJson: z.string()
    .default('[]')
    .describe('Lista de campos en formato JSON string. Ejemplo: \'["name", "amount_total", "date_order"]\'. Vacío para todos: "[]"'),
  
  limit: z.number()
    .min(1)
    .max(100)
    .default(20)
    .describe('Cantidad máxima de registros a devolver (1-100)'),
  
  order: z.string()
    .optional()
    .describe('Ordenamiento: "campo asc" o "campo desc" (ej: "date_order desc")')
})

/**
 * Schema para count_odoo
 */
const CountOdooSchema = z.object({
  model: z.string()
    .describe('Nombre técnico del modelo de Odoo'),
  
  domainJson: z.string()
    .default('[]')
    .describe('Domain en formato JSON string para filtrar')
})

/**
 * Schema para get_record
 */
const GetRecordSchema = z.object({
  model: z.string()
    .describe('Nombre técnico del modelo de Odoo'),
  
  id: z.number()
    .describe('ID del registro a obtener'),
  
  fieldsJson: z.string()
    .default('[]')
    .describe('Lista de campos en formato JSON string')
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseJsonSafe(jsonStr: string, defaultValue: any[] = []): any[] {
  try {
    const parsed = JSON.parse(jsonStr || '[]')
    return Array.isArray(parsed) ? parsed : defaultValue
  } catch (e) {
    console.warn('[OdooTools] Error parsing JSON:', jsonStr, e)
    return defaultValue
  }
}

// ============================================================================
// TOOLS DEFINITIONS
// ============================================================================

/**
 * Tool principal: query_odoo
 * Ejecuta búsquedas en cualquier modelo de Odoo
 */
export const queryOdooTool = tool({
  description: `Consulta datos de Odoo usando search_read.

MODELOS PRINCIPALES:
- sale.order: Órdenes de venta (campos: name, partner_id, amount_total, state, date_order)
- sale.order.line: Líneas de orden (campos: order_id, product_id, product_uom_qty, price_subtotal)
- res.partner: Clientes (campos: name, email, phone, customer_rank)
- product.product: Productos (campos: name, default_code, list_price, qty_available)
- account.move: Facturas (campos: name, partner_id, amount_total, state, move_type, invoice_date)

DOMAINIOS (domainJson):
- Formato: '[["campo", "operador", valor], ...]'
- Operadores: =, !=, >, <, >=, <=, ilike, in, not in
- Ejemplos:
  - Ventas confirmadas: '[["state", "in", ["sale", "done"]]]'
  - Por fecha: '[["date_order", ">=", "2025-12-01 00:00:00"]]'
  - Por cliente ID: '[["partner_id", "=", 123]]'
  - Por nombre: '[["name", "ilike", "%Garcia%"]]'
  - Sin filtros: '[]'

IMPORTANTE: Para ventas, usa state in ["sale", "done"] para incluir confirmadas.`,
  inputSchema: QueryOdooSchema,
  execute: async (params): Promise<OdooToolResult> => {
    console.log('[Tool:query_odoo] Executing:', params)

    // Validar modelo
    if (!isValidModel(params.model)) {
      return {
        success: false,
        error: `Modelo '${params.model}' no disponible. Usa: sale.order, sale.order.line, product.product, res.partner, account.move`
      }
    }

    // Parsear JSON strings
    const domain = parseJsonSafe(params.domainJson)
    const fields = parseJsonSafe(params.fieldsJson)

    // Validar campos si se especificaron
    if (fields.length > 0) {
      const validFields = getValidFields(params.model)
      const invalidFields = fields.filter(f => !validFields.includes(f))
      if (invalidFields.length > 0) {
        return {
          success: false,
          error: `Campos inválidos: ${invalidFields.join(', ')}. Válidos: ${validFields.join(', ')}`
        }
      }
    }

    // Obtener cliente
    const client = await getOdooClient()
    if (!client) {
      return {
        success: false,
        error: 'No se pudo conectar con Odoo. Verificá la configuración.'
      }
    }

    // Ejecutar query
    const result = await client.searchRead({
      model: params.model,
      domain: domain,
      fields: fields.length > 0 ? fields : undefined,
      limit: params.limit,
      order: params.order
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Error al consultar Odoo'
      }
    }

    return {
      success: true,
      model: params.model,
      count: result.count,
      data: result.data
    }
  }
})

/**
 * Tool: count_odoo
 * Cuenta registros sin traer datos (más eficiente)
 */
export const countOdooTool = tool({
  description: `Cuenta registros en Odoo sin traer los datos. Más eficiente cuando solo necesitás saber cuántos hay.

Ejemplos de uso:
- "¿Cuántas ventas hay este mes?" → count_odoo con domain de fecha
- "¿Cuántos clientes tenemos?" → count_odoo en res.partner`,
  inputSchema: CountOdooSchema,
  execute: async (params): Promise<OdooToolResult> => {
    console.log('[Tool:count_odoo] Executing:', params)

    if (!isValidModel(params.model)) {
      return {
        success: false,
        error: `Modelo '${params.model}' no disponible.`
      }
    }

    const domain = parseJsonSafe(params.domainJson)

    const client = await getOdooClient()
    if (!client) {
      return {
        success: false,
        error: 'No se pudo conectar con Odoo'
      }
    }

    const result = await client.searchCount(params.model, domain)

    if (!result.success) {
      return {
        success: false,
        error: result.error
      }
    }

    return {
      success: true,
      model: params.model,
      count: result.data
    }
  }
})

/**
 * Tool: get_record
 * Obtiene un registro específico por ID
 */
export const getRecordTool = tool({
  description: `Obtiene un registro específico de Odoo por su ID.

Útil cuando ya tenés el ID y querés ver sus detalles completos.`,
  inputSchema: GetRecordSchema,
  execute: async (params): Promise<OdooToolResult> => {
    console.log('[Tool:get_record] Executing:', params)

    if (!isValidModel(params.model)) {
      return {
        success: false,
        error: `Modelo '${params.model}' no disponible.`
      }
    }

    const fields = parseJsonSafe(params.fieldsJson)

    const client = await getOdooClient()
    if (!client) {
      return {
        success: false,
        error: 'No se pudo conectar con Odoo'
      }
    }

    const result = await client.read(
      params.model,
      [params.id],
      fields.length > 0 ? fields : undefined
    )

    if (!result.success) {
      return {
        success: false,
        error: result.error
      }
    }

    const record = result.data?.[0]
    if (!record) {
      return {
        success: false,
        error: `No se encontró registro con ID ${params.id} en ${params.model}`
      }
    }

    return {
      success: true,
      model: params.model,
      data: record
    }
  }
})

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Objeto con todas las tools de Odoo para usar con Vercel AI SDK
 */
export const odooTools = {
  query_odoo: queryOdooTool,
  count_odoo: countOdooTool,
  get_record: getRecordTool
}

/**
 * Tipos exportados para uso externo
 */
export type QueryOdooParams = z.infer<typeof QueryOdooSchema>
export type CountOdooParams = z.infer<typeof CountOdooSchema>
export type GetRecordParams = z.infer<typeof GetRecordSchema>

/**
 * Mercado Libre Tools for Vercel AI SDK
 * 
 * Tools PÚBLICAS (sin autenticación) para consultar MercadoLibre.
 * Diseñadas para ayudar a vendedores a:
 * - Investigar competencia y precios
 * - Ver detalles de publicaciones
 * - Analizar rangos de precio del mercado
 * - Descubrir tendencias
 * 
 * ARQUITECTURA:
 * - Solo endpoints públicos (no requieren OAuth)
 * - Cache agresivo para reducir requests
 * - Normalización de respuestas para el LLM
 */

import { z } from 'zod'
import { tool } from 'ai'
import { getMeliClient, MeliSearchResult } from './client'
import { isValidSite, isValidItemId, calculatePercentiles, MELI_SITE_LIST } from './schema'

// ============================================================================
// TIPOS
// ============================================================================

interface MeliToolResult {
  success: boolean
  error?: string
  data?: any
  metadata?: {
    cached?: boolean
    source: 'mercadolibre'
  }
}

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

/**
 * Schema para buscar publicaciones públicas
 */
const SearchPublicSchema = z.object({
  siteId: z.string()
    .default('MLA')
    .describe(`Sitio de Mercado Libre. Opciones: ${MELI_SITE_LIST.slice(0, 8).join(', ')}. Default: MLA (Argentina)`),
  
  query: z.string()
    .min(2)
    .describe('Texto de búsqueda. Ej: "notebook i7", "zapatillas running", "cable usb tipo c"'),
  
  categoryId: z.string()
    .optional()
    .describe('ID de categoría para filtrar. Ej: "MLA1051" (Celulares). Opcional.'),
  
  limit: z.number()
    .min(1)
    .max(50)
    .default(20)
    .describe('Cantidad de resultados (1-50)'),
  
  sort: z.enum(['relevance', 'price_asc', 'price_desc'])
    .default('relevance')
    .describe('Ordenamiento: relevance (relevantes), price_asc (menor precio), price_desc (mayor precio)'),
  
  condition: z.enum(['new', 'used'])
    .optional()
    .describe('Filtrar por condición: new (nuevo), used (usado)')
})

/**
 * Schema para obtener detalle de item
 */
const GetItemSchema = z.object({
  itemId: z.string()
    .describe('ID del item. Formato: MLA1234567890. Obtenerlo de una búsqueda previa.')
})

/**
 * Schema para snapshot de precios (análisis competencia)
 */
const PriceSnapshotSchema = z.object({
  siteId: z.string()
    .default('MLA')
    .describe('Sitio de Mercado Libre'),
  
  query: z.string()
    .min(2)
    .describe('Producto a analizar. Ej: "iphone 15 128gb", "smart tv 50 pulgadas"'),
  
  categoryId: z.string()
    .optional()
    .describe('Categoría para acotar análisis (opcional)'),
  
  condition: z.enum(['new', 'used'])
    .optional()
    .describe('Analizar solo nuevos o usados'),
  
  limit: z.number()
    .min(10)
    .max(50)
    .default(30)
    .describe('Cantidad de publicaciones a analizar (10-50)')
})

/**
 * Schema para tendencias
 */
const TrendsSchema = z.object({
  siteId: z.string()
    .default('MLA')
    .describe('Sitio de Mercado Libre'),
  
  categoryId: z.string()
    .optional()
    .describe('Categoría específica para ver tendencias (opcional)')
})

// ============================================================================
// TOOLS IMPLEMENTATIONS
// ============================================================================

/**
 * meli_search - Buscar publicaciones
 * 
 * CUÁNDO USAR:
 * - "Buscar productos similares a X"
 * - "¿Qué hay publicado de Y?"
 * - "Competidores de mi producto"
 */
export const searchPublicTool = tool({
  description: `Buscar publicaciones PÚBLICAS en Mercado Libre.

CUÁNDO USAR:
✅ Buscar productos por texto: "buscar notebooks gamer"
✅ Ver competencia: "qué hay publicado de auriculares bluetooth"
✅ Comparar precios: "precios de sillas ergonómicas"
✅ Investigar mercado: "productos similares a X"

CUÁNDO NO USAR (usar meli_price_snapshot):
❌ Analizar rango de precios estadístico
❌ Saber percentiles P25/P50/P75

SITIOS: MLA (Argentina), MLB (Brasil), MLM (México), MLC (Chile), MCO (Colombia), MLU (Uruguay)

SORTS: relevance (default), price_asc (barato primero), price_desc (caro primero)`,

  inputSchema: SearchPublicSchema,

  execute: async (params): Promise<MeliToolResult> => {
    console.log('[Tool:meli_search] Executing:', params)

    // Validar sitio
    if (!isValidSite(params.siteId)) {
      return {
        success: false,
        error: `Sitio '${params.siteId}' no válido. Usar: ${MELI_SITE_LIST.slice(0, 6).join(', ')}`
      }
    }

    const client = getMeliClient()
    
    const result = await client.searchItems({
      siteId: params.siteId,
      query: params.query,
      categoryId: params.categoryId,
      limit: params.limit,
      sort: params.sort,
      condition: params.condition
    })

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Error buscando en Mercado Libre'
      }
    }

    // Formatear para el LLM (más conciso)
    const items = result.data.items.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency_id,
      condition: item.condition,
      stock: item.available_quantity,
      sold: item.sold_quantity,
      free_shipping: item.shipping_free,
      link: item.permalink
    }))

    return {
      success: true,
      data: {
        query: result.data.query,
        total_results: result.data.total,
        showing: items.length,
        items
      },
      metadata: {
        cached: result.cached,
        source: 'mercadolibre'
      }
    }
  }
})

/**
 * meli_item - Detalle de publicación
 * 
 * CUÁNDO USAR:
 * - "Dame detalles del item MLA123..."
 * - "Ver atributos de esta publicación"
 */
export const getItemTool = tool({
  description: `Obtener detalle COMPLETO de una publicación de Mercado Libre.

CUÁNDO USAR:
✅ Ver detalles de un item específico
✅ Conocer atributos/especificaciones
✅ Verificar stock y vendidos
✅ Ver tipo de envío

REQUIERE: Un itemId válido (ej: MLA1234567890). Obtenerlo primero con meli_search.`,

  inputSchema: GetItemSchema,

  execute: async (params): Promise<MeliToolResult> => {
    console.log('[Tool:meli_item] Executing:', params)

    // Validar formato de itemId
    if (!isValidItemId(params.itemId)) {
      return {
        success: false,
        error: `ItemId '${params.itemId}' no tiene formato válido. Debe ser: MLA1234567890`
      }
    }

    const client = getMeliClient()
    const result = await client.getItem(params.itemId)

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Error obteniendo item'
      }
    }

    const item = result.data

    // Extraer atributos relevantes
    const keyAttributes = item.attributes
      .filter(attr => attr.value_name)
      .slice(0, 15) // Limitar para no saturar
      .map(attr => `${attr.name}: ${attr.value_name}`)

    return {
      success: true,
      data: {
        id: item.id,
        title: item.title,
        price: item.price,
        currency: item.currency_id,
        condition: item.condition,
        stock: item.available_quantity,
        sold: item.sold_quantity,
        status: item.status,
        shipping: {
          free: item.shipping.free_shipping,
          mode: item.shipping.mode
        },
        warranty: item.warranty || 'No especificada',
        listing_type: item.listing_type_id,
        attributes: keyAttributes,
        link: item.permalink
      },
      metadata: {
        cached: result.cached,
        source: 'mercadolibre'
      }
    }
  }
})

/**
 * meli_price_snapshot - Análisis de precios del mercado
 * 
 * TOOL CLAVE para decisiones de pricing.
 * Devuelve estadísticas (min, P25, P50, P75, max) de precios.
 */
export const priceSnapshotTool = tool({
  description: `Analizar PRECIOS del mercado - estadísticas y competidores.

CUÁNDO USAR (TOOL PRINCIPAL PARA PRICING):
✅ "¿A cuánto debería vender X?"
✅ "¿Cuál es el rango de precios de Y?"
✅ "¿Estoy caro o barato?"
✅ "Análisis de competencia de mi producto"

DEVUELVE:
- Estadísticas: min, P25 (precio bajo), P50 (mediana), P75 (precio alto), max, promedio
- Top competidores con precio y stock
- Recomendación de rango

INTERPRETACIÓN:
- P25: Precio "agresivo" (ganar volumen)
- P50: Precio "mercado" (equilibrado)
- P75: Precio "premium" (más margen)`,

  inputSchema: PriceSnapshotSchema,

  execute: async (params): Promise<MeliToolResult> => {
    console.log('[Tool:meli_price_snapshot] Executing:', params)

    if (!isValidSite(params.siteId)) {
      return {
        success: false,
        error: `Sitio '${params.siteId}' no válido.`
      }
    }

    const client = getMeliClient()
    
    // Buscar productos
    const result = await client.searchItems({
      siteId: params.siteId,
      query: params.query,
      categoryId: params.categoryId,
      limit: params.limit,
      condition: params.condition,
      sort: 'relevance'
    })

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Error buscando productos'
      }
    }

    const items = result.data.items
    
    if (items.length < 3) {
      return {
        success: false,
        error: `Solo se encontraron ${items.length} resultados. Se necesitan al menos 3 para análisis estadístico.`
      }
    }

    // Extraer precios
    const prices = items.map(item => item.price)
    const stats = calculatePercentiles(prices)
    
    // Moneda (asumir la del primer item)
    const currency = items[0].currency_id

    // Top competidores ordenados por precio
    const competitors = items
      .sort((a, b) => a.price - b.price)
      .slice(0, 10)
      .map(item => ({
        id: item.id,
        title: item.title.substring(0, 60) + (item.title.length > 60 ? '...' : ''),
        price: item.price,
        stock: item.available_quantity,
        sold: item.sold_quantity,
        free_shipping: item.shipping_free
      }))

    // Generar notas/insights
    const notes: string[] = []
    const spread = ((stats.max - stats.min) / stats.p50 * 100).toFixed(0)
    notes.push(`Dispersión de precios: ${spread}%`)
    
    if (Number(spread) > 50) {
      notes.push('Alta variación de precios - mercado fragmentado')
    } else if (Number(spread) < 20) {
      notes.push('Precios muy similares - mercado competitivo')
    }

    const freeShippingCount = items.filter(i => i.shipping_free).length
    const freeShippingPct = ((freeShippingCount / items.length) * 100).toFixed(0)
    notes.push(`${freeShippingPct}% ofrecen envío gratis`)

    return {
      success: true,
      data: {
        query: params.query,
        sample_size: items.length,
        total_market: result.data.total,
        currency,
        stats: {
          min: stats.min,
          p25_aggressive: stats.p25,
          p50_market: stats.p50,
          p75_premium: stats.p75,
          max: stats.max,
          average: stats.avg
        },
        competitors,
        insights: notes
      },
      metadata: {
        cached: result.cached,
        source: 'mercadolibre'
      }
    }
  }
})

/**
 * meli_trends - Tendencias de búsqueda
 */
export const trendsTool = tool({
  description: `Ver TENDENCIAS de búsqueda en Mercado Libre.

CUÁNDO USAR:
✅ "¿Qué se está buscando mucho?"
✅ "Tendencias en electrónica"
✅ "Productos populares"

Útil para descubrir oportunidades de negocio.`,

  inputSchema: TrendsSchema,

  execute: async (params): Promise<MeliToolResult> => {
    console.log('[Tool:meli_trends] Executing:', params)

    if (!isValidSite(params.siteId)) {
      return {
        success: false,
        error: `Sitio '${params.siteId}' no válido.`
      }
    }

    const client = getMeliClient()
    const result = await client.getTrends(params.siteId, params.categoryId)

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Error obteniendo tendencias'
      }
    }

    return {
      success: true,
      data: {
        site: params.siteId,
        category: params.categoryId || 'General',
        trends: result.data.slice(0, 20) // Limitar a 20
      },
      metadata: {
        cached: result.cached,
        source: 'mercadolibre'
      }
    }
  }
})

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Tools de Mercado Libre para Vercel AI SDK
 * 
 * USO:
 * - meli_search: Buscar publicaciones
 * - meli_item: Detalle de item específico
 * - meli_price_snapshot: Análisis de precios/competencia
 * - meli_trends: Tendencias de búsqueda
 */
export const meliTools = {
  meli_search: searchPublicTool,
  meli_item: getItemTool,
  meli_price_snapshot: priceSnapshotTool,
  meli_trends: trendsTool
}

/**
 * Tipos para uso externo
 */
export type SearchPublicParams = z.infer<typeof SearchPublicSchema>
export type GetItemParams = z.infer<typeof GetItemSchema>
export type PriceSnapshotParams = z.infer<typeof PriceSnapshotSchema>
export type TrendsParams = z.infer<typeof TrendsSchema>

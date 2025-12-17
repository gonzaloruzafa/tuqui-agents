/**
 * MercadoLibre Tools for Vercel AI SDK
 * 
 * ARQUITECTURA: Local Server / VPS con Puppeteer Stealth
 * 
 * Herramientas disponibles:
 * - meli_search: Búsqueda rápida de productos
 * - meli_price_analysis: Análisis de precios con estadísticas
 * - meli_product_details: Detalles de un producto específico
 */

import { z } from 'zod'
import { tool } from 'ai'
import { searchProducts, getProductByUrl, type ProductResult, type SearchResult } from './browser-client'
import { isValidSite, MELI_SITE_LIST, calculatePercentiles } from './schema'

// ============================================================================
// TIPOS
// ============================================================================

interface ToolResult {
  success: boolean
  error?: string
  data?: any
}

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

const SearchSchema = z.object({
  query: z.string()
    .min(2)
    .describe('Texto de búsqueda. Ej: "notebook i7", "zapatillas running", "robot limpiafondos"'),
  
  site: z.string()
    .default('MLA')
    .describe('Sitio de Mercado Libre. Opciones: MLA (Argentina), MLB (Brasil), MLM (México), MLC (Chile). Default: MLA'),
  
  maxResults: z.number()
    .min(1)
    .max(20)
    .default(5)
    .describe('Cantidad de resultados (1-20). Default: 5'),
})

const PriceAnalysisSchema = z.object({
  query: z.string()
    .min(2)
    .describe('Producto a analizar. Ej: "iphone 15 128gb", "smart tv 50 pulgadas"'),
  
  site: z.string()
    .default('MLA')
    .describe('Sitio de Mercado Libre'),
  
  sampleSize: z.number()
    .min(5)
    .max(20)
    .default(10)
    .describe('Cantidad de publicaciones a analizar (5-20)')
})

const ProductDetailsSchema = z.object({
  url: z.string()
    .describe('URL completa del producto en MercadoLibre. Ej: https://articulo.mercadolibre.com.ar/MLA-123456...')
})

// ============================================================================
// TOOL: meli_search
// ============================================================================

export const searchTool = tool({
  description: `Buscar productos en Mercado Libre.

CUÁNDO USAR:
✅ "Buscar productos de X"
✅ "¿Qué hay publicado de Y?"  
✅ "Mostrar resultados de búsqueda"
✅ Exploración inicial de mercado

RETORNA: Lista de productos con título, precio, link e imagen.

SITIOS: MLA (Argentina), MLB (Brasil), MLM (México), MLC (Chile)`,

  inputSchema: SearchSchema,

  execute: async (params): Promise<ToolResult> => {
    const { query, site, maxResults } = params
    console.log('[Tool:meli_search] Executing:', { query, site, maxResults })

    if (!isValidSite(site)) {
      return {
        success: false,
        error: `Sitio '${site}' no válido. Usar: ${MELI_SITE_LIST.slice(0, 6).join(', ')}`
      }
    }

    const result: SearchResult = await searchProducts(query, site, maxResults)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Error buscando en Mercado Libre'
      }
    }

    const items = result.products.map((p: ProductResult) => ({
      title: p.title,
      price: p.price,
      currency: p.currency,
      condition: p.condition,
      freeShipping: p.freeShipping,
      link: p.permalink,
      image: p.imageUrl
    }))

    return {
      success: true,
      data: {
        query,
        site,
        totalFound: items.length,
        executionTime: `${result.executionTime}ms`,
        items
      }
    }
  }
})

// ============================================================================
// TOOL: meli_price_analysis
// ============================================================================

export const priceAnalysisTool = tool({
  description: `Análisis de precios de mercado con estadísticas.

CUÁNDO USAR:
✅ "¿A cuánto vender mi producto X?"
✅ "Precio de mercado de Y"
✅ "Análisis de competencia"
✅ "Rango de precios para Z"

RETORNA: Precio mínimo, máximo, promedio, mediana y percentiles.`,

  inputSchema: PriceAnalysisSchema,

  execute: async (params): Promise<ToolResult> => {
    const { query, site, sampleSize } = params
    console.log('[Tool:meli_price_analysis] Executing:', { query, site, sampleSize })

    if (!isValidSite(site)) {
      return {
        success: false,
        error: `Sitio '${site}' no válido.`
      }
    }

    const result = await searchProducts(query, site, sampleSize)

    if (!result.success || result.products.length === 0) {
      return {
        success: false,
        error: result.error || 'No se encontraron productos para analizar'
      }
    }

    // Extraer precios válidos
    const prices = result.products
      .map((p: ProductResult) => p.price)
      .filter((p: number) => p > 0)
      .sort((a: number, b: number) => a - b)

    if (prices.length < 3) {
      return {
        success: false,
        error: 'No hay suficientes productos con precio para análisis'
      }
    }

    // Calcular estadísticas
    const sum = prices.reduce((a: number, b: number) => a + b, 0)
    const avg = Math.round(sum / prices.length)
    const median = prices.length % 2 === 0
      ? Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
      : prices[Math.floor(prices.length / 2)]

    const percentiles = calculatePercentiles(prices)

    // Productos más baratos y más caros
    const cheapest = result.products
      .filter((p: ProductResult) => p.price > 0)
      .sort((a: ProductResult, b: ProductResult) => a.price - b.price)
      .slice(0, 3)
      .map((p: ProductResult) => ({
        title: p.title.substring(0, 60),
        price: p.price,
        link: p.permalink
      }))

    const mostExpensive = result.products
      .filter((p: ProductResult) => p.price > 0)
      .sort((a: ProductResult, b: ProductResult) => b.price - a.price)
      .slice(0, 3)
      .map((p: ProductResult) => ({
        title: p.title.substring(0, 60),
        price: p.price,
        link: p.permalink
      }))

    return {
      success: true,
      data: {
        query,
        site,
        sampleSize: prices.length,
        executionTime: `${result.executionTime}ms`,
        priceStats: {
          minimum: prices[0],
          maximum: prices[prices.length - 1],
          average: avg,
          median,
          p25: percentiles.p25,
          p50: percentiles.p50,
          p75: percentiles.p75,
          currency: 'ARS'
        },
        recommendation: {
          competitivePrice: percentiles.p25,
          averagePrice: avg,
          premiumPrice: percentiles.p75
        },
        cheapestProducts: cheapest,
        premiumProducts: mostExpensive
      }
    }
  }
})

// ============================================================================
// TOOL: meli_product_details
// ============================================================================

export const productDetailsTool = tool({
  description: `Obtener detalles de un producto específico por URL.

CUÁNDO USAR:
✅ "Dame más información de este producto: [URL]"
✅ "Detalles del producto X"
✅ Cuando el usuario comparte un link específico

RETORNA: Título, precio, condición, imagen y más.`,

  inputSchema: ProductDetailsSchema,

  execute: async (params): Promise<ToolResult> => {
    const { url } = params
    console.log('[Tool:meli_product_details] Executing:', url.substring(0, 60))

    // Validar que sea URL de MercadoLibre
    if (!url.includes('mercadolibre') && !url.includes('mercadolivre')) {
      return {
        success: false,
        error: 'La URL debe ser de MercadoLibre'
      }
    }

    const product = await getProductByUrl(url)

    if (!product) {
      return {
        success: false,
        error: 'No se pudo obtener información del producto'
      }
    }

    return {
      success: true,
      data: {
        title: product.title,
        price: product.price,
        currency: product.currency,
        condition: product.condition,
        freeShipping: product.freeShipping,
        imageUrl: product.imageUrl,
        permalink: product.permalink
      }
    }
  }
})

// ============================================================================
// EXPORTS
// ============================================================================

export const meliTools = {
  meli_search: searchTool,
  meli_price_analysis: priceAnalysisTool,
  meli_product_details: productDetailsTool
}

export default meliTools

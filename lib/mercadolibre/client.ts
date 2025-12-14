/**
 * Mercado Libre Public API Client
 * 
 * Cliente HTTP para consultas PÚBLICAS a la API de Mercado Libre.
 * NO requiere autenticación - solo endpoints read-only.
 * 
 * Features:
 * - Cache en memoria para reducir requests (5-15 min)
 * - Retry con exponential backoff ante rate limits
 * - Timeout configurable
 * - Normalización de respuestas
 * 
 * Docs: https://developers.mercadolibre.com.ar/es_ar/items-y-busquedas
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface MeliResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  cached?: boolean
}

export interface MeliSearchResult {
  id: string
  title: string
  price: number
  currency_id: string
  condition: 'new' | 'used' | 'not_specified'
  available_quantity: number
  sold_quantity: number
  permalink: string
  thumbnail: string
  seller_id: number
  shipping_free: boolean
  category_id: string
}

export interface MeliItemDetail {
  id: string
  title: string
  price: number
  currency_id: string
  condition: 'new' | 'used' | 'not_specified'
  available_quantity: number
  sold_quantity: number
  permalink: string
  thumbnail: string
  pictures: { url: string }[]
  seller_id: number
  category_id: string
  shipping: {
    free_shipping: boolean
    mode: string
  }
  attributes: {
    id: string
    name: string
    value_name: string | null
  }[]
  warranty?: string
  listing_type_id: string
  status: string
}

export interface MeliSearchResponse {
  site_id: string
  query: string
  total: number
  items: MeliSearchResult[]
  available_sorts: { id: string; name: string }[]
  available_filters: { id: string; name: string; values: any[] }[]
}

export interface MeliCategory {
  id: string
  name: string
  probability: number
  domain_id?: string
}

export interface MeliTrend {
  keyword: string
  url: string
}

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T
  expires: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttlMs || this.DEFAULT_TTL)
    })
  }

  clear(): void {
    this.cache.clear()
  }

  // Limpieza periódica de entradas expiradas
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key)
      }
    }
  }
}

// ============================================================================
// CLIENTE
// ============================================================================

export class MeliPublicClient {
  private readonly baseUrl = 'https://api.mercadolibre.com'
  private readonly cache = new SimpleCache()
  private readonly timeout: number
  private readonly maxRetries: number

  constructor(options?: { timeout?: number; maxRetries?: number }) {
    this.timeout = options?.timeout || 8000 // 8 segundos
    this.maxRetries = options?.maxRetries || 3
  }

  /**
   * GET request con retry y cache
   */
  async get<T>(
    path: string,
    params?: Record<string, any>,
    options?: { cacheTtl?: number; skipCache?: boolean }
  ): Promise<MeliResponse<T>> {
    // Construir URL
    const url = new URL(path, this.baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      })
    }

    const cacheKey = url.toString()

    // Intentar cache primero
    if (!options?.skipCache) {
      const cached = this.cache.get<T>(cacheKey)
      if (cached) {
        console.log('[MeliClient] Cache HIT:', path)
        return { success: true, data: cached, cached: true }
      }
    }

    // Request con retry
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        console.log(`[MeliClient] GET ${path} (attempt ${attempt}/${this.maxRetries})`)

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TuquiAgents/1.0'
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        // Rate limit - esperar y reintentar
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000
          console.log(`[MeliClient] Rate limited, waiting ${waitMs}ms`)
          await this.sleep(waitMs)
          continue
        }

        // Error de servidor - reintentar con backoff
        if (response.status >= 500) {
          const waitMs = Math.pow(2, attempt) * 500
          console.log(`[MeliClient] Server error ${response.status}, waiting ${waitMs}ms`)
          await this.sleep(waitMs)
          continue
        }

        // Error cliente - no reintentar
        if (!response.ok) {
          const errorText = await response.text()
          return {
            success: false,
            error: `API error ${response.status}: ${errorText.substring(0, 200)}`
          }
        }

        // Éxito
        const data = await response.json() as T
        
        // Guardar en cache
        this.cache.set(cacheKey, data, options?.cacheTtl)
        
        return { success: true, data }

      } catch (err: any) {
        lastError = err
        
        if (err.name === 'AbortError') {
          console.log(`[MeliClient] Timeout en ${path}`)
        } else {
          console.error(`[MeliClient] Error en ${path}:`, err.message)
        }
        
        // Esperar antes de reintentar
        if (attempt < this.maxRetries) {
          await this.sleep(Math.pow(2, attempt) * 500)
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Error desconocido después de reintentos'
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // =========================================================================
  // MÉTODOS DE ALTO NIVEL
  // =========================================================================

  /**
   * Buscar publicaciones públicas
   * @param siteId MLA, MLB, MLM, etc.
   * @param query Texto de búsqueda
   */
  async searchItems(params: {
    siteId: string
    query: string
    categoryId?: string
    limit?: number
    offset?: number
    sort?: string
    condition?: 'new' | 'used'
  }): Promise<MeliResponse<MeliSearchResponse>> {
    const { siteId, query, categoryId, limit = 20, offset = 0, sort, condition } = params

    const searchParams: Record<string, any> = {
      q: query,
      limit: Math.min(limit, 50), // ML limita a 50
      offset
    }

    if (categoryId) searchParams.category = categoryId
    if (sort) searchParams.sort = sort
    if (condition) searchParams.condition = condition

    const result = await this.get<any>(
      `/sites/${siteId}/search`,
      searchParams,
      { cacheTtl: 10 * 60 * 1000 } // 10 min cache para búsquedas
    )

    if (!result.success || !result.data) {
      return result as MeliResponse<MeliSearchResponse>
    }

    // Normalizar respuesta
    const normalized: MeliSearchResponse = {
      site_id: result.data.site_id,
      query: result.data.query,
      total: result.data.paging?.total || 0,
      items: (result.data.results || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        currency_id: item.currency_id,
        condition: item.condition,
        available_quantity: item.available_quantity || 0,
        sold_quantity: item.sold_quantity || 0,
        permalink: item.permalink,
        thumbnail: item.thumbnail,
        seller_id: item.seller?.id || item.seller_id,
        shipping_free: item.shipping?.free_shipping || false,
        category_id: item.category_id
      })),
      available_sorts: result.data.available_sorts || [],
      available_filters: result.data.available_filters || []
    }

    return { success: true, data: normalized, cached: result.cached }
  }

  /**
   * Obtener detalle de un item
   */
  async getItem(itemId: string): Promise<MeliResponse<MeliItemDetail>> {
    const result = await this.get<any>(
      `/items/${itemId}`,
      undefined,
      { cacheTtl: 15 * 60 * 1000 } // 15 min cache para items
    )

    if (!result.success || !result.data) {
      return result as MeliResponse<MeliItemDetail>
    }

    const item = result.data
    const normalized: MeliItemDetail = {
      id: item.id,
      title: item.title,
      price: item.price,
      currency_id: item.currency_id,
      condition: item.condition,
      available_quantity: item.available_quantity || 0,
      sold_quantity: item.sold_quantity || 0,
      permalink: item.permalink,
      thumbnail: item.thumbnail,
      pictures: item.pictures || [],
      seller_id: item.seller_id,
      category_id: item.category_id,
      shipping: {
        free_shipping: item.shipping?.free_shipping || false,
        mode: item.shipping?.mode || ''
      },
      attributes: (item.attributes || []).map((attr: any) => ({
        id: attr.id,
        name: attr.name,
        value_name: attr.value_name
      })),
      warranty: item.warranty,
      listing_type_id: item.listing_type_id,
      status: item.status
    }

    return { success: true, data: normalized, cached: result.cached }
  }

  /**
   * Predecir categoría para un texto
   */
  async predictCategory(siteId: string, query: string): Promise<MeliResponse<MeliCategory[]>> {
    const result = await this.get<any[]>(
      `/sites/${siteId}/domain_discovery/search`,
      { q: query },
      { cacheTtl: 30 * 60 * 1000 } // 30 min cache para categorías
    )

    if (!result.success || !result.data) {
      return result as MeliResponse<MeliCategory[]>
    }

    const categories: MeliCategory[] = result.data.map((cat: any) => ({
      id: cat.category_id,
      name: cat.category_name,
      probability: cat.match_score || 0,
      domain_id: cat.domain_id
    }))

    return { success: true, data: categories, cached: result.cached }
  }

  /**
   * Obtener tendencias de búsqueda de un sitio
   */
  async getTrends(siteId: string, categoryId?: string): Promise<MeliResponse<MeliTrend[]>> {
    const path = categoryId 
      ? `/trends/${siteId}/${categoryId}`
      : `/trends/${siteId}`

    const result = await this.get<any[]>(
      path,
      undefined,
      { cacheTtl: 60 * 60 * 1000 } // 1 hora cache para trends
    )

    if (!result.success || !result.data) {
      return result as MeliResponse<MeliTrend[]>
    }

    const trends: MeliTrend[] = result.data.map((t: any) => ({
      keyword: t.keyword,
      url: t.url
    }))

    return { success: true, data: trends, cached: result.cached }
  }

  /**
   * Obtener información de categoría
   */
  async getCategory(categoryId: string): Promise<MeliResponse<any>> {
    return this.get(
      `/categories/${categoryId}`,
      undefined,
      { cacheTtl: 60 * 60 * 1000 } // 1 hora cache
    )
  }

  /**
   * Limpiar cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let clientInstance: MeliPublicClient | null = null

export function getMeliClient(): MeliPublicClient {
  if (!clientInstance) {
    clientInstance = new MeliPublicClient({
      timeout: 8000,
      maxRetries: 3
    })
  }
  return clientInstance
}

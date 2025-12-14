/**
 * Mercado Libre Schema
 * 
 * Definiciones de sitios, monedas y helpers para validación.
 * Información pública sobre la estructura de MercadoLibre.
 */

// ============================================================================
// SITIOS DE MERCADO LIBRE
// ============================================================================

export const MELI_SITES = {
  MLA: { id: 'MLA', name: 'Argentina', currency: 'ARS', domain: 'mercadolibre.com.ar' },
  MLB: { id: 'MLB', name: 'Brasil', currency: 'BRL', domain: 'mercadolivre.com.br' },
  MLM: { id: 'MLM', name: 'México', currency: 'MXN', domain: 'mercadolibre.com.mx' },
  MLC: { id: 'MLC', name: 'Chile', currency: 'CLP', domain: 'mercadolibre.cl' },
  MLU: { id: 'MLU', name: 'Uruguay', currency: 'UYU', domain: 'mercadolibre.com.uy' },
  MCO: { id: 'MCO', name: 'Colombia', currency: 'COP', domain: 'mercadolibre.com.co' },
  MPE: { id: 'MPE', name: 'Perú', currency: 'PEN', domain: 'mercadolibre.com.pe' },
  MEC: { id: 'MEC', name: 'Ecuador', currency: 'USD', domain: 'mercadolibre.com.ec' },
  MLV: { id: 'MLV', name: 'Venezuela', currency: 'VES', domain: 'mercadolibre.com.ve' },
  MBO: { id: 'MBO', name: 'Bolivia', currency: 'BOB', domain: 'mercadolibre.com.bo' },
  MPY: { id: 'MPY', name: 'Paraguay', currency: 'PYG', domain: 'mercadolibre.com.py' },
  MPA: { id: 'MPA', name: 'Panamá', currency: 'USD', domain: 'mercadolibre.com.pa' },
  MRD: { id: 'MRD', name: 'Rep. Dominicana', currency: 'DOP', domain: 'mercadolibre.com.do' },
  MHN: { id: 'MHN', name: 'Honduras', currency: 'HNL', domain: 'mercadolibre.com.hn' },
  MCR: { id: 'MCR', name: 'Costa Rica', currency: 'CRC', domain: 'mercadolibre.co.cr' },
  MGT: { id: 'MGT', name: 'Guatemala', currency: 'GTQ', domain: 'mercadolibre.com.gt' },
  MNI: { id: 'MNI', name: 'Nicaragua', currency: 'NIO', domain: 'mercadolibre.com.ni' },
  MSV: { id: 'MSV', name: 'El Salvador', currency: 'USD', domain: 'mercadolibre.com.sv' },
} as const

export type MeliSiteId = keyof typeof MELI_SITES

export const MELI_SITE_LIST = Object.keys(MELI_SITES) as MeliSiteId[]

// ============================================================================
// CONDICIONES DE PRODUCTOS
// ============================================================================

export const MELI_CONDITIONS = {
  new: 'Nuevo',
  used: 'Usado',
  not_specified: 'No especificado'
} as const

export type MeliCondition = keyof typeof MELI_CONDITIONS

// ============================================================================
// ORDENAMIENTOS DISPONIBLES
// ============================================================================

export const MELI_SORTS = {
  relevance: 'Más relevantes',
  price_asc: 'Menor precio',
  price_desc: 'Mayor precio'
} as const

export type MeliSort = keyof typeof MELI_SORTS

// ============================================================================
// HELPERS DE VALIDACIÓN
// ============================================================================

/**
 * Verifica si un siteId es válido
 */
export function isValidSite(siteId: string): siteId is MeliSiteId {
  return siteId in MELI_SITES
}

/**
 * Obtiene información del sitio o null
 */
export function getSite(siteId: string): typeof MELI_SITES[MeliSiteId] | null {
  if (!isValidSite(siteId)) return null
  return MELI_SITES[siteId]
}

/**
 * Obtiene el sitio default (Argentina)
 */
export function getDefaultSite(): typeof MELI_SITES['MLA'] {
  return MELI_SITES.MLA
}

/**
 * Verifica si un itemId tiene formato válido (MLA1234567890)
 */
export function isValidItemId(itemId: string): boolean {
  return /^[A-Z]{3}\d{8,12}$/.test(itemId)
}

/**
 * Extrae el siteId de un itemId (MLA1234567890 → MLA)
 */
export function getSiteFromItemId(itemId: string): MeliSiteId | null {
  const match = itemId.match(/^([A-Z]{3})/)
  if (!match) return null
  const siteId = match[1]
  return isValidSite(siteId) ? siteId : null
}

// ============================================================================
// HELPERS DE FORMATO
// ============================================================================

/**
 * Formatea precio con moneda
 */
export function formatPrice(price: number, currencyId: string): string {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currencyId,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  } catch {
    return `${currencyId} ${price.toLocaleString()}`
  }
}

/**
 * Calcula percentiles de un array de números
 */
export function calculatePercentiles(values: number[]): {
  min: number
  p25: number
  p50: number
  p75: number
  max: number
  avg: number
} {
  if (values.length === 0) {
    return { min: 0, p25: 0, p50: 0, p75: 0, max: 0, avg: 0 }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const len = sorted.length

  const percentile = (p: number): number => {
    const index = (p / 100) * (len - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    if (lower === upper) return sorted[lower]
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
  }

  const sum = sorted.reduce((a, b) => a + b, 0)

  return {
    min: sorted[0],
    p25: Math.round(percentile(25)),
    p50: Math.round(percentile(50)),
    p75: Math.round(percentile(75)),
    max: sorted[len - 1],
    avg: Math.round(sum / len)
  }
}

// ============================================================================
// DOCUMENTACIÓN PARA LLM
// ============================================================================

/**
 * Genera documentación concisa de MercadoLibre para el system prompt
 */
export function generateMeliDocumentation(): string {
  const sitesDoc = Object.entries(MELI_SITES)
    .slice(0, 6) // Solo principales
    .map(([id, info]) => `${id}: ${info.name} (${info.currency})`)
    .join(', ')

  return `
## Mercado Libre - Sitios y Formatos

**Sitios principales:** ${sitesDoc}

**Formato ItemId:** [SITEID][NUMEROS] (ej: MLA1234567890)

**Condiciones:** new (Nuevo), used (Usado)

**Ordenamientos:** relevance, price_asc, price_desc

**Monedas por país:**
- Argentina: ARS | Brasil: BRL | México: MXN
- Chile: CLP | Colombia: COP | Uruguay: UYU
`.trim()
}

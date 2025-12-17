/**
 * MercadoLibre Module Index
 * 
 * ARQUITECTURA: Local Server / VPS con Puppeteer Stealth
 * 
 * Módulos:
 * - browser-client: Puppeteer con stealth para scraping
 * - tools: Herramientas para Vercel AI SDK
 * - schema: Tipos y utilidades
 * - prompts: Prompts del agente
 */

// Browser Client (Puppeteer Stealth)
export {
  getMeliBrowserClient,
  searchProducts,
  getProductByUrl,
  type ProductResult,
  type SearchResult
} from './browser-client'

// Schema Layer
export {
  MELI_SITES,
  MELI_SITE_LIST,
  MELI_CONDITIONS,
  MELI_SORTS,
  isValidSite,
  getSite,
  getDefaultSite,
  isValidItemId,
  getSiteFromItemId,
  formatPrice,
  calculatePercentiles,
  generateMeliDocumentation,
  type MeliSiteId,
  type MeliCondition,
  type MeliSort
} from './schema'

// Tools Layer (Vercel AI SDK)
export {
  meliTools,
  searchTool,
  priceAnalysisTool,
  productDetailsTool
} from './tools'

// Prompts
export {
  generateMeliSystemPrompt
} from './prompts'

// Default export
export { default as MeliBrowserClient } from './browser-client'

/**
 * Mercado Libre Module Index
 * 
 * Exporta todos los componentes del módulo Mercado Libre
 */

// Client Layer
export {
  MeliPublicClient,
  getMeliClient,
  type MeliResponse,
  type MeliSearchResult,
  type MeliItemDetail,
  type MeliSearchResponse,
  type MeliCategory,
  type MeliTrend
} from './client'

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
  searchPublicTool,
  getItemTool,
  priceSnapshotTool,
  trendsTool,
  type SearchPublicParams,
  type GetItemParams,
  type PriceSnapshotParams,
  type TrendsParams
} from './tools'

// Prompts
export {
  generateMeliSystemPrompt
} from './prompts'

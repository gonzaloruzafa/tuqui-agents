import { ToolResult, ToolConfig } from './types'
import { MeliPublicClient } from '../mercadolibre/client'
import { isValidSite } from '../mercadolibre/schema'

const client = new MeliPublicClient()

export interface MercadoLibreToolParams {
  tool: 'meli_search' | 'meli_item' | 'meli_price_snapshot' | 'meli_trends'
  params: Record<string, any>
}

export async function executeMercadoLibreTool(params: MercadoLibreToolParams): Promise<ToolResult> {
  try {
    const { tool, params: toolParams } = params

    switch (tool) {
      case 'meli_search':
        return await meliSearch(toolParams)
      case 'meli_item':
        return await meliItem(toolParams)
      case 'meli_price_snapshot':
        return await meliPriceSnapshot(toolParams)
      case 'meli_trends':
        return await meliTrends(toolParams)
      default:
        return { success: false, error: `Unknown Mercado Libre tool: ${tool}` }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function meliSearch(params: any): Promise<ToolResult> {
  const { site, query, limit = 50, offset = 0, sort, category_id } = params

  if (!site || !query) {
    return { success: false, error: 'site and query are required' }
  }

  if (!isValidSite(site)) {
    return { success: false, error: `Invalid site: ${site}. Must be a valid Mercado Libre site (e.g., MLA, MLB, MLM)` }
  }

  const response = await client.searchItems({
    siteId: site,
    query,
    limit,
    offset,
    sort,
    categoryId: category_id
  })

  if (!response.success || !response.data) {
    return { success: false, error: response.error || 'Search failed' }
  }

  const results = response.data

  return {
    success: true,
    data: {
      query,
      site,
      total: results.total,
      results: results.items
    }
  }
}

async function meliItem(params: any): Promise<ToolResult> {
  const { item_id } = params

  if (!item_id) {
    return { success: false, error: 'item_id is required' }
  }

  const response = await client.getItem(item_id)

  if (!response.success || !response.data) {
    return { success: false, error: response.error || 'Failed to get item' }
  }

  const item = response.data

  return {
    success: true,
    data: item
  }
}

async function meliPriceSnapshot(params: any): Promise<ToolResult> {
  const { site, query, category_id } = params

  if (!site || !query) {
    return { success: false, error: 'site and query are required' }
  }

  if (!isValidSite(site)) {
    return { success: false, error: `Invalid site: ${site}` }
  }

  const response = await client.searchItems({
    siteId: site,
    query,
    limit: 50,
    categoryId: category_id
  })

  if (!response.success || !response.data) {
    return { success: false, error: response.error || 'Search failed' }
  }

  const results = response.data

  if (results.items.length === 0) {
    return {
      success: true,
      data: {
        query,
        site,
        count: 0,
        message: 'No products found'
      }
    }
  }

  // Calculate percentiles
  const prices = results.items.map(r => r.price).sort((a, b) => a - b)
  const p25 = prices[Math.floor(prices.length * 0.25)]
  const p50 = prices[Math.floor(prices.length * 0.50)]
  const p75 = prices[Math.floor(prices.length * 0.75)]
  const min = prices[0]
  const max = prices[prices.length - 1]
  const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length

  return {
    success: true,
    data: {
      query,
      site,
      count: prices.length,
      currency: results.items[0]?.currency_id || 'ARS',
      statistics: {
        min,
        p25,
        p50,
        p75,
        max,
        avg: Math.round(avg)
      },
      interpretation: {
        aggressive: p25,
        market: p50,
        premium: p75
      }
    }
  }
}

async function meliTrends(params: any): Promise<ToolResult> {
  const { site, category_id } = params

  if (!site) {
    return { success: false, error: 'site is required' }
  }

  if (!isValidSite(site)) {
    return { success: false, error: `Invalid site: ${site}` }
  }

  // Get trends by querying top sellers
  const response = await client.searchItems({
    siteId: site,
    query: '*', // Search all
    sort: 'sold_quantity_desc',
    limit: 20,
    categoryId: category_id
  })

  if (!response.success || !response.data) {
    return { success: false, error: response.error || 'Search failed' }
  }

  const results = response.data

  return {
    success: true,
    data: {
      site,
      category_id,
      top_sellers: results.items.slice(0, 10)
    }
  }
}

export const mercadolibreToolConfig: ToolConfig = {
  slug: 'mercadolibre',
  name: 'Mercado Libre',
  description: 'Access Mercado Libre public APIs to research market prices, competitor products, and pricing trends across LATAM',
  type: 'builtin',
  parameters: [
    {
      name: 'tool',
      type: 'string',
      description: 'Tool name: meli_search, meli_item, meli_price_snapshot, or meli_trends',
      required: true
    },
    {
      name: 'params',
      type: 'object',
      description: 'Tool-specific parameters',
      required: true
    }
  ]
}

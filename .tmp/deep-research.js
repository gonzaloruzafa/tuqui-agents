/**
 * Deep Market Research Tool - Perplexity-Style Architecture
 *
 * Reemplaza Puppeteer con un stack API-first:
 * 1. Tavily: Discovery layer (encontrar URLs relevantes)
 * 2. FireCrawl: Extraction layer (scrape real-time prices/stock)
 *
 * VENTAJAS vs Puppeteer:
 * - No cold starts (sin Chromium)
 * - Bypass WAF (APIs con rotating proxies)
 * - Parallelización nativa
 * - Serverless-friendly
 */
import { z } from 'zod';
import { tool } from 'ai';
// ============================================================================
// CONFIGURATION
// ============================================================================
const TAVILY_API_URL = 'https://api.tavily.com/search';
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape';
// Domains válidos de Mercado Libre
const MELI_DOMAINS = [
    'mercadolibre.com.ar',
    'mercadolibre.com.mx',
    'mercadolibre.com.br',
    'mercadolibre.cl',
    'mercadolibre.com.co',
    'mercadolibre.com.uy',
    'mercadolibre.com.pe',
    'mercadolibre.com.ve'
];
// Patrones de URLs a EXCLUIR (no son productos)
const EXCLUDED_URL_PATTERNS = [
    '/noindex/',
    '/ayuda/',
    '/help/',
    '/gz/',
    '/categories/',
    '/ofertas/',
    '/hot-sale/',
    '/cyber/',
    '/vendedor/',
    '/perfil/',
    '/opinion',
    '/preguntas',
    '/tiendas-oficiales',
    '#',
    '/secure/',
    '/registration'
];
// ============================================================================
// TAVILY: SEARCH LAYER
// ============================================================================
/**
 * Busca URLs de productos en Mercado Libre usando Tavily
 */
async function searchWithTavily(query, site, maxResults = 20) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        throw new Error('TAVILY_API_KEY no configurada');
    }
    // Construir query optimizada para MELI
    const domain = site === 'MLA' ? 'mercadolibre.com.ar' :
        site === 'MLM' ? 'mercadolibre.com.mx' :
            site === 'MLB' ? 'mercadolibre.com.br' :
                site === 'MLC' ? 'mercadolibre.cl' :
                    site === 'MCO' ? 'mercadolibre.com.co' :
                        site === 'MLU' ? 'mercadolibre.com.uy' :
                            'mercadolibre.com.ar';
    const searchQuery = `site:${domain} ${query}`;
    const response = await fetch(TAVILY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: apiKey,
            query: searchQuery,
            search_depth: 'advanced', // Mejor freshness
            max_results: Math.min(maxResults * 2, 40), // Pedir más para filtrar
            include_answer: false,
            include_raw_content: false,
            include_images: false
        })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Tavily error: ${response.status} - ${error}`);
    }
    const data = await response.json();
    return {
        urls: data.results.map(r => r.url),
        rawResults: data.results
    };
}
// ============================================================================
// URL FILTERING
// ============================================================================
/**
 * Filtra URLs para quedarse solo con páginas de productos
 *
 * URLs válidas de productos MELI tienen formato:
 * - https://articulo.mercadolibre.com.ar/MLA-123456789-titulo-del-producto
 * - https://www.mercadolibre.com.ar/producto/p/MLA123456789
 */
function filterProductUrls(urls, maxUrls) {
    const validUrls = [];
    for (const url of urls) {
        // Verificar que sea de un dominio MELI
        const isMeliDomain = MELI_DOMAINS.some(domain => url.includes(domain));
        if (!isMeliDomain)
            continue;
        // Excluir URLs que no son productos
        const isExcluded = EXCLUDED_URL_PATTERNS.some(pattern => url.includes(pattern));
        if (isExcluded)
            continue;
        // Verificar patrones de URL de producto
        const isProductUrl = 
        // Formato clásico: articulo.mercadolibre.com.ar/MLA-123456
        url.includes('/MLA-') || url.includes('/MLB-') || url.includes('/MLM-') ||
            url.includes('/MLC-') || url.includes('/MCO-') || url.includes('/MLU-') ||
            // Formato nuevo: /p/MLA123456789
            /\/p\/ML[A-Z]\d+/.test(url);
        if (isProductUrl) {
            validUrls.push(url);
            if (validUrls.length >= maxUrls)
                break;
        }
    }
    return validUrls;
}
// ============================================================================
// FIRECRAWL: EXTRACTION LAYER
// ============================================================================
/**
 * Scrape una URL de producto con FireCrawl
 */
async function scrapeWithFireCrawl(url) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    const scrapedAt = new Date().toISOString();
    if (!apiKey) {
        return {
            url,
            title: null,
            price: null,
            currency: null,
            original_price: null,
            discount_percent: null,
            sold_quantity: null,
            seller_name: null,
            seller_reputation: null,
            shipping_type: null,
            condition: null,
            stock_available: null,
            scraped_at: scrapedAt,
            scrape_success: false,
            error: 'FIRECRAWL_API_KEY no configurada'
        };
    }
    try {
        const response = await fetch(FIRECRAWL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                url,
                formats: ['markdown'],
                onlyMainContent: true,
                timeout: 30000,
                waitFor: 2000 // Esperar a que cargue contenido dinámico
            })
        });
        if (!response.ok) {
            const error = await response.text();
            return {
                url,
                title: null,
                price: null,
                currency: null,
                original_price: null,
                discount_percent: null,
                sold_quantity: null,
                seller_name: null,
                seller_reputation: null,
                shipping_type: null,
                condition: null,
                stock_available: null,
                scraped_at: scrapedAt,
                scrape_success: false,
                error: `FireCrawl error: ${response.status}`
            };
        }
        const data = await response.json();
        const markdown = data.data?.markdown || '';
        const metadata = data.data?.metadata || {};
        // Extraer datos del markdown usando regex
        const extracted = extractProductDataFromMarkdown(markdown, metadata, url);
        return {
            ...extracted,
            url,
            scraped_at: scrapedAt,
            scrape_success: true
        };
    }
    catch (error) {
        return {
            url,
            title: null,
            price: null,
            currency: null,
            original_price: null,
            discount_percent: null,
            sold_quantity: null,
            seller_name: null,
            seller_reputation: null,
            shipping_type: null,
            condition: null,
            stock_available: null,
            scraped_at: scrapedAt,
            scrape_success: false,
            error: error.message
        };
    }
}
/**
 * Extrae datos estructurados del markdown de FireCrawl
 */
function extractProductDataFromMarkdown(markdown, metadata, url) {
    // Title - del metadata o del markdown
    const title = metadata.title?.replace(' | MercadoLibre', '').replace(' - MercadoLibre', '') ||
        markdown.match(/^#\s*(.+)/m)?.[1] ||
        null;
    // Price - buscar patrones de precio en ARS/MXN/BRL
    const priceMatch = markdown.match(/\$\s*([\d.,]+)/i) ||
        markdown.match(/([\d.,]+)\s*(?:ARS|MXN|BRL|CLP|COP|UYU)/i);
    const priceStr = priceMatch?.[1]?.replace(/\./g, '').replace(',', '.') || null;
    const price = priceStr ? parseFloat(priceStr) : null;
    // Currency
    const currency = url.includes('.com.ar') ? 'ARS' :
        url.includes('.com.mx') ? 'MXN' :
            url.includes('.com.br') ? 'BRL' :
                url.includes('.cl') ? 'CLP' :
                    url.includes('.com.co') ? 'COP' :
                        url.includes('.com.uy') ? 'UYU' : 'ARS';
    // Original price (tachado)
    const originalMatch = markdown.match(/(?:antes|era|de)\s*\$?\s*([\d.,]+)/i);
    const originalStr = originalMatch?.[1]?.replace(/\./g, '').replace(',', '.') || null;
    const original_price = originalStr ? parseFloat(originalStr) : null;
    // Discount
    const discountMatch = markdown.match(/(\d+)\s*%\s*(?:OFF|desc|menos)/i);
    const discount_percent = discountMatch ? parseInt(discountMatch[1]) : null;
    // Sold quantity
    const soldMatch = markdown.match(/(\d+(?:\.\d+)?[kK]?)\s*(?:vendidos|sold)/i) ||
        markdown.match(/vendidos?\s*[:\s]*(\d+)/i);
    const sold_quantity = soldMatch?.[1] || null;
    // Seller info
    const sellerMatch = markdown.match(/(?:Vendido por|Seller|Por)\s*[:\s]*([^\n\|]+)/i);
    const seller_name = sellerMatch?.[1]?.trim() || null;
    // Seller reputation
    const reputationMatch = markdown.match(/(MercadoLíder|Platinum|Gold|Silver|Verde claro|Verde)/i);
    const seller_reputation = reputationMatch?.[1] || null;
    // Shipping
    const hasFreeShipping = /env[ií]o\s*gratis|free\s*shipping/i.test(markdown);
    const hasFullShipping = /full|llega\s*(mañana|hoy|tomorrow|today)/i.test(markdown);
    const shipping_type = hasFullShipping ? 'FULL' :
        hasFreeShipping ? 'FREE' :
            'STANDARD';
    // Condition
    const conditionMatch = markdown.match(/(nuevo|new|usado|used|reacondicionado|refurbished)/i);
    const condition = conditionMatch?.[1]?.toLowerCase() || null;
    // Stock
    const stockMatch = markdown.match(/(\d+)\s*(?:disponibles?|unidades?|in stock)/i) ||
        markdown.match(/(?:stock|disponible)[:\s]*(\d+)/i);
    const stock_available = stockMatch?.[1] || null;
    return {
        title,
        price,
        currency,
        original_price,
        discount_percent,
        sold_quantity,
        seller_name,
        seller_reputation,
        shipping_type,
        condition,
        stock_available
    };
}
// ============================================================================
// PARALLEL SCRAPING WITH CONCURRENCY CONTROL
// ============================================================================
/**
 * Scrape múltiples URLs en paralelo con control de concurrencia
 */
async function scrapeUrlsInParallel(urls, concurrency = 5) {
    const results = [];
    // Dividir en batches para controlar concurrencia
    for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(url => scrapeWithFireCrawl(url)));
        results.push(...batchResults);
    }
    return results;
}
// ============================================================================
// PRICE ANALYSIS
// ============================================================================
/**
 * Calcular estadísticas de precios
 */
function analyzePrices(products) {
    const prices = products
        .filter(p => p.scrape_success && p.price !== null && p.price > 0)
        .map(p => p.price)
        .sort((a, b) => a - b);
    if (prices.length === 0) {
        return { min: null, max: null, avg: null, median: null, p25: null, p75: null };
    }
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / prices.length);
    const median = prices.length % 2 === 0
        ? Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
        : prices[Math.floor(prices.length / 2)];
    const p25Index = Math.floor(prices.length * 0.25);
    const p75Index = Math.floor(prices.length * 0.75);
    return {
        min: prices[0],
        max: prices[prices.length - 1],
        avg,
        median,
        p25: prices[p25Index] || prices[0],
        p75: prices[p75Index] || prices[prices.length - 1]
    };
}
// ============================================================================
// MAIN DEEP RESEARCH FUNCTION
// ============================================================================
/**
 * Ejecuta una investigación profunda de mercado
 *
 * Flow:
 * 1. Tavily: Buscar URLs relevantes
 * 2. Filter: Descartar URLs que no son productos
 * 3. FireCrawl: Scrape paralelo de productos
 * 4. Synthesize: Estructurar y analizar datos
 */
export async function deepMarketResearch(query, options = {}) {
    const startTime = Date.now();
    const site = options.site || 'MLA';
    const maxProducts = options.maxProducts || 15;
    const concurrency = options.concurrency || 5;
    try {
        // Step 1: Search with Tavily
        console.log(`[DeepResearch] Searching with Tavily: "${query}"`);
        const { urls: rawUrls } = await searchWithTavily(query, site, maxProducts * 2);
        // Step 2: Filter URLs
        console.log(`[DeepResearch] Filtering ${rawUrls.length} URLs...`);
        const productUrls = filterProductUrls(rawUrls, maxProducts);
        console.log(`[DeepResearch] Found ${productUrls.length} product URLs`);
        if (productUrls.length === 0) {
            return {
                success: false,
                query,
                site,
                total_urls_found: rawUrls.length,
                total_urls_scraped: 0,
                successful_scrapes: 0,
                failed_scrapes: 0,
                products: [],
                price_analysis: { min: null, max: null, avg: null, median: null, p25: null, p75: null },
                execution_time_ms: Date.now() - startTime,
                error: 'No se encontraron URLs de productos válidas'
            };
        }
        // Step 3: Parallel scrape with FireCrawl
        console.log(`[DeepResearch] Scraping ${productUrls.length} products (concurrency: ${concurrency})...`);
        const products = await scrapeUrlsInParallel(productUrls, concurrency);
        // Step 4: Analyze and synthesize
        const successfulProducts = products.filter(p => p.scrape_success);
        const failedProducts = products.filter(p => !p.scrape_success);
        const priceAnalysis = analyzePrices(products);
        console.log(`[DeepResearch] Complete: ${successfulProducts.length}/${products.length} successful`);
        return {
            success: true,
            query,
            site,
            total_urls_found: rawUrls.length,
            total_urls_scraped: products.length,
            successful_scrapes: successfulProducts.length,
            failed_scrapes: failedProducts.length,
            products: products.sort((a, b) => (a.price || Infinity) - (b.price || Infinity)),
            price_analysis: priceAnalysis,
            execution_time_ms: Date.now() - startTime
        };
    }
    catch (error) {
        return {
            success: false,
            query,
            site,
            total_urls_found: 0,
            total_urls_scraped: 0,
            successful_scrapes: 0,
            failed_scrapes: 0,
            products: [],
            price_analysis: { min: null, max: null, avg: null, median: null, p25: null, p75: null },
            execution_time_ms: Date.now() - startTime,
            error: error.message
        };
    }
}
// ============================================================================
// VERCEL AI SDK TOOL
// ============================================================================
const DeepResearchSchema = z.object({
    query: z.string()
        .min(2)
        .describe('Producto o término de búsqueda. Ej: "iphone 15 128gb", "notebook gamer rtx 4060"'),
    site: z.string()
        .default('MLA')
        .describe('Código de país: MLA (Argentina), MLM (México), MLB (Brasil), MLC (Chile), MCO (Colombia), MLU (Uruguay)'),
    maxProducts: z.number()
        .min(5)
        .max(30)
        .default(15)
        .describe('Cantidad máxima de productos a analizar (5-30). Más productos = más tiempo pero mejor análisis'),
    concurrency: z.number()
        .min(1)
        .max(10)
        .default(5)
        .describe('Nivel de paralelismo para scraping (1-10). Mayor = más rápido pero más carga en APIs')
});
/**
 * deep_market_research Tool
 *
 * Herramienta de investigación profunda estilo Perplexity.
 * Combina Tavily (discovery) + FireCrawl (extraction) para análisis de mercado.
 */
export const deepMarketResearchTool = tool({
    description: `🔬 INVESTIGACIÓN PROFUNDA DE MERCADO - Estilo Perplexity

Esta herramienta realiza un análisis exhaustivo de productos en Mercado Libre usando tecnología de scraping en tiempo real.

CUÁNDO USAR:
✅ "Investiga los precios de iPhone 15 en el mercado"
✅ "Analiza las 20 mejores publicaciones de notebooks gamer"
✅ "¿Cuál es el rango de precios para auriculares Sony?"
✅ "Compara vendedores y envíos para teclados mecánicos"

QUÉ OBTIENE:
- Títulos y precios actuales (tiempo real)
- Información del vendedor y reputación
- Tipo de envío (FULL, Gratis, Standard)
- Cantidad vendida y stock
- Análisis estadístico: min, max, promedio, mediana, percentiles

VENTAJAS:
- Datos frescos (no cacheados)
- Bypass de bloqueos WAF
- Scraping paralelo = rápido
- Maneja errores gracefully

SITIOS: MLA (Argentina), MLM (México), MLB (Brasil), MLC (Chile), MCO (Colombia), MLU (Uruguay)`,
    inputSchema: DeepResearchSchema,
    execute: async (params) => {
        const { query, site, maxProducts, concurrency } = params;
        const result = await deepMarketResearch(query, { site, maxProducts, concurrency });
        if (!result.success) {
            return {
                error: result.error,
                execution_time_ms: result.execution_time_ms
            };
        }
        // Formatear respuesta para el LLM
        return {
            summary: {
                query,
                site,
                products_analyzed: result.successful_scrapes,
                execution_time_ms: result.execution_time_ms
            },
            price_analysis: result.price_analysis,
            products: result.products
                .filter(p => p.scrape_success)
                .map(p => ({
                title: p.title,
                price: p.price,
                currency: p.currency,
                original_price: p.original_price,
                discount_percent: p.discount_percent,
                sold_quantity: p.sold_quantity,
                seller_name: p.seller_name,
                seller_reputation: p.seller_reputation,
                shipping_type: p.shipping_type,
                condition: p.condition,
                stock_available: p.stock_available,
                url: p.url
            }))
        };
    }
});

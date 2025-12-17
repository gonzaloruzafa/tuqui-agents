/**
 * MercadoLibre Browser Client - Puppeteer Stealth Edition
 * 
 * ARQUITECTURA: Local Server / VPS (sin límites serverless)
 * 
 * Este módulo usa Puppeteer con plugins de stealth para:
 * - Emular un navegador humano real
 * - Bypass del WAF de MercadoLibre
 * - Extracción robusta de datos de productos
 * 
 * @requires puppeteer
 * @requires puppeteer-extra
 * @requires puppeteer-extra-plugin-stealth
 */

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { Browser, Page } from 'puppeteer'

// Activar plugin de stealth
puppeteer.use(StealthPlugin())

// ============================================================================
// TIPOS
// ============================================================================

export interface ProductResult {
  title: string
  price: number
  currency: string
  permalink: string
  imageUrl: string
  condition?: string
  freeShipping?: boolean
  seller?: string
}

export interface SearchResult {
  success: boolean
  query: string
  site: string
  products: ProductResult[]
  totalFound: number
  error?: string
  executionTime: number
}

interface BrowserConfig {
  headless?: boolean
  timeout?: number
  userAgent?: string
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const DEFAULT_CONFIG: BrowserConfig = {
  headless: true, // Headless mode
  timeout: 30000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

const MELI_SITES: Record<string, string> = {
  MLA: 'https://www.mercadolibre.com.ar',
  MLB: 'https://www.mercadolibre.com.br',
  MLM: 'https://www.mercadolibre.com.mx',
  MLC: 'https://www.mercadolibre.cl',
  MLU: 'https://www.mercadolibre.com.uy',
  MCO: 'https://www.mercadolibre.com.co',
  MPE: 'https://www.mercadolibre.com.pe',
  MLV: 'https://www.mercadolibre.com.ve',
}

// ============================================================================
// UTILIDADES - SIMULACIÓN HUMANA
// ============================================================================

/**
 * Delay aleatorio para simular comportamiento humano
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Escribe texto caracter por caracter con delays aleatorios
 * Simula un humano tipeando
 */
async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector)
  await randomDelay(100, 200)
  
  for (const char of text) {
    await page.type(selector, char, { delay: Math.random() * 100 + 50 })
    
    // Pausa ocasional como un humano pensando
    if (Math.random() < 0.1) {
      await randomDelay(200, 400)
    }
  }
}

/**
 * Scroll suave para simular navegación humana
 */
async function humanScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const scrollHeight = Math.min(document.body.scrollHeight, 2000)
    const steps = 5
    const stepSize = scrollHeight / steps
    
    for (let i = 0; i < steps; i++) {
      window.scrollBy(0, stepSize)
      await new Promise(r => setTimeout(r, 100 + Math.random() * 200))
    }
  })
}

// ============================================================================
// BROWSER CLIENT
// ============================================================================

class MeliBrowserClient {
  private browser: Browser | null = null
  private config: BrowserConfig

  constructor(config: Partial<BrowserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Inicializa el navegador con configuración stealth
   */
  async launch(): Promise<void> {
    if (this.browser) return

    console.log('[Browser] 🚀 Launching Chrome with stealth mode...')
    
    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    })

    console.log('[Browser] ✅ Chrome launched successfully')
  }

  /**
   * Cierra el navegador
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      console.log('[Browser] 🔒 Chrome closed')
    }
  }

  /**
   * Crea una nueva página configurada
   */
  private async newPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not launched. Call launch() first.')
    }

    const page = await this.browser.newPage()
    
    // Configurar User-Agent
    await page.setUserAgent(this.config.userAgent!)
    
    // Configurar headers extra
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
    })

    // Configurar timeout
    page.setDefaultNavigationTimeout(this.config.timeout!)
    page.setDefaultTimeout(this.config.timeout!)

    // Interceptar y bloquear recursos innecesarios para velocidad
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const resourceType = req.resourceType()
      // Bloquear imágenes pesadas, fonts, stylesheets para velocidad
      // Pero permitir scripts porque MeLi los necesita
      if (['font', 'stylesheet'].includes(resourceType)) {
        req.abort()
      } else {
        req.continue()
      }
    })

    return page
  }

  /**
   * Busca productos en MercadoLibre
   */
  async search(query: string, site: string = 'MLA', maxResults: number = 5): Promise<SearchResult> {
    const startTime = Date.now()
    const baseUrl = MELI_SITES[site] || MELI_SITES.MLA
    
    console.log(`[Browser] 🔍 Searching: "${query}" on ${site}`)
    
    let page: Page | null = null
    
    try {
      await this.launch()
      page = await this.newPage()

      // Paso 1: Ir a la página principal
      console.log('[Browser] 📄 Navigating to MercadoLibre...')
      await page.goto(baseUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout 
      })
      
      await randomDelay(500, 1000)

      // Paso 2: Buscar el input de búsqueda
      const searchSelectors = [
        'input[name="as_word"]',
        'input.nav-search-input',
        '#cb1-edit',
        'input[type="text"]'
      ]
      
      let searchInput: string | null = null
      for (const selector of searchSelectors) {
        const exists = await page.$(selector)
        if (exists) {
          searchInput = selector
          break
        }
      }

      if (!searchInput) {
        throw new Error('Could not find search input')
      }

      // Paso 3: Tipear la búsqueda como humano
      console.log('[Browser] ⌨️ Typing search query...')
      await humanType(page, searchInput, query)
      await randomDelay(300, 500)

      // Paso 4: Enviar búsqueda
      console.log('[Browser] 🔎 Submitting search...')
      await Promise.all([
        page.keyboard.press('Enter'),
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 })
      ])

      // Paso 5: Esperar que carguen los resultados
      console.log('[Browser] ⏳ Waiting for results...')
      await randomDelay(1000, 2000)
      
      // Scroll para cargar lazy content
      await humanScroll(page)
      await randomDelay(500, 1000)

      // Paso 6: Extraer productos
      console.log('[Browser] 📦 Extracting products...')
      const products = await this.extractProducts(page, maxResults)

      const executionTime = Date.now() - startTime
      console.log(`[Browser] ✅ Found ${products.length} products in ${executionTime}ms`)

      return {
        success: true,
        query,
        site,
        products,
        totalFound: products.length,
        executionTime
      }

    } catch (error: any) {
      console.error(`[Browser] ❌ Error: ${error.message}`)
      
      return {
        success: false,
        query,
        site,
        products: [],
        totalFound: 0,
        error: error.message,
        executionTime: Date.now() - startTime
      }
    } finally {
      if (page) {
        await page.close()
      }
    }
  }

  /**
   * Extrae datos de productos de la página de resultados
   */
  private async extractProducts(page: Page, maxResults: number): Promise<ProductResult[]> {
    return await page.evaluate((max) => {
      const products: ProductResult[] = []
      
      // Selectores robustos para items de MercadoLibre (2024/2025 layout)
      // MeLi ahora usa poly-card dentro de ui-search-layout__item
      const itemSelectors = [
        '.ui-search-layout__item',
        '.poly-card',
        'li.ui-search-layout__item',
        '.ui-search-result__wrapper'
      ]
      
      let items: Element[] = []
      for (const selector of itemSelectors) {
        const found = document.querySelectorAll(selector)
        if (found.length > 0) {
          items = Array.from(found)
          console.log(`Found ${found.length} items with selector: ${selector}`)
          break
        }
      }

      for (const item of items.slice(0, max)) {
        try {
          // Título - buscar en poly-card o estructura antigua
          const titleEl = item.querySelector(
            '.poly-component__title, ' +
            '.poly-box h2, ' +
            'h2.poly-component__title, ' +
            '.ui-search-item__title, ' +
            '[class*="title"] a, ' +
            'h2 a'
          )
          const title = titleEl?.textContent?.trim() || ''
          
          // Precio - MeLi usa andes-money-amount
          const priceEl = item.querySelector(
            '.andes-money-amount__fraction, ' +
            '.poly-price__current .andes-money-amount__fraction, ' +
            '[class*="price"] .andes-money-amount__fraction, ' +
            '.price-tag-fraction'
          )
          const priceText = priceEl?.textContent?.replace(/\D/g, '') || '0'
          const price = parseInt(priceText, 10) || 0
          
          // Link - buscar en poly-card o estructura antigua
          const linkEl = item.querySelector(
            'a.poly-component__title, ' +
            'a[href*="/MLA"], ' +
            'a[href*="/MLB"], ' +
            'a[href*="articulo"], ' +
            '.poly-card a[href]'
          ) as HTMLAnchorElement
          const permalink = linkEl?.href || ''
          
          // Imagen - poly-card usa img dentro de portada
          const imgEl = item.querySelector(
            '.poly-card__portada img, ' +
            'img.poly-component__picture, ' +
            'img[src*="http2.mlstatic"], ' +
            'img[data-src*="http"]'
          ) as HTMLImageElement
          const imageUrl = imgEl?.src || imgEl?.dataset?.src || ''
          
          // Condición (Nuevo/Usado)
          const conditionEl = item.querySelector('[class*="condition"], .poly-component__condition')
          const conditionText = conditionEl?.textContent?.toLowerCase() || ''
          const condition = conditionText.includes('nuevo') ? 'new' : 'used'
          
          // Envío gratis
          const shippingEl = item.querySelector('[class*="shipping"], .poly-component__shipping')
          const freeShipping = shippingEl?.textContent?.toLowerCase().includes('gratis') || false

          if (title && price > 0 && permalink) {
            products.push({
              title,
              price,
              currency: 'ARS',
              permalink,
              imageUrl,
              condition,
              freeShipping
            })
          }
        } catch (e) {
          // Ignorar items mal formados
        }
      }

      return products
    }, maxResults)
  }

  /**
   * Obtiene detalles de un producto específico por URL
   */
  async getProductDetails(url: string): Promise<ProductResult | null> {
    console.log(`[Browser] 📄 Getting product details: ${url.substring(0, 50)}...`)
    
    let page: Page | null = null
    
    try {
      await this.launch()
      page = await this.newPage()
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout 
      })
      
      await randomDelay(1000, 2000)
      await humanScroll(page)
      
      // Intentar extraer JSON-LD primero (más confiable)
      const jsonLdProduct = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]')
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent || '{}')
            const product = Array.isArray(data) 
              ? data.find(d => d['@type'] === 'Product')
              : data['@type'] === 'Product' ? data : null
            
            if (product) {
              return {
                title: product.name,
                price: product.offers?.price || product.offers?.lowPrice || 0,
                currency: product.offers?.priceCurrency || 'ARS',
                imageUrl: product.image || '',
                condition: product.offers?.itemCondition?.includes('New') ? 'new' : 'used'
              }
            }
          } catch (e) {}
        }
        return null
      })
      
      if (jsonLdProduct && jsonLdProduct.price > 0) {
        return {
          ...jsonLdProduct,
          permalink: url,
          freeShipping: false
        }
      }
      
      // Fallback: extraer del DOM
      const product = await page.evaluate((pageUrl) => {
        const title = document.querySelector('h1')?.textContent?.trim() || ''
        
        const priceEl = document.querySelector('.andes-money-amount__fraction')
        const priceText = priceEl?.textContent?.replace(/\D/g, '') || '0'
        const price = parseInt(priceText, 10) || 0
        
        const imgEl = document.querySelector('.ui-pdp-image, img[data-zoom]') as HTMLImageElement
        const imageUrl = imgEl?.src || ''
        
        return {
          title,
          price,
          currency: 'ARS',
          permalink: pageUrl,
          imageUrl,
          condition: 'unknown',
          freeShipping: false
        }
      }, url)
      
      return product.price > 0 ? product : null
      
    } catch (error: any) {
      console.error(`[Browser] ❌ Error getting product: ${error.message}`)
      return null
    } finally {
      if (page) {
        await page.close()
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE & EXPORTS
// ============================================================================

let browserClient: MeliBrowserClient | null = null

/**
 * Obtiene o crea una instancia del cliente
 */
export function getMeliBrowserClient(config?: Partial<BrowserConfig>): MeliBrowserClient {
  if (!browserClient) {
    browserClient = new MeliBrowserClient(config)
  }
  return browserClient
}

/**
 * Búsqueda rápida de productos (función de conveniencia)
 */
export async function searchProducts(
  query: string, 
  site: string = 'MLA', 
  maxResults: number = 5
): Promise<SearchResult> {
  const client = getMeliBrowserClient()
  try {
    return await client.search(query, site, maxResults)
  } finally {
    // En producción, podrías querer mantener el browser abierto
    // para múltiples requests. Aquí lo cerramos por seguridad.
    await client.close()
  }
}

/**
 * Obtiene detalles de un producto por URL
 */
export async function getProductByUrl(url: string): Promise<ProductResult | null> {
  const client = getMeliBrowserClient()
  try {
    return await client.getProductDetails(url)
  } finally {
    await client.close()
  }
}

// Para uso directo como módulo
export default MeliBrowserClient

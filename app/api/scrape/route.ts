import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { addDocument } from '@/lib/rag'

// Función para limpiar y extraer texto principal de una página
function extractMainContent(html: string, url: string): { title: string; content: string } {
  const $ = cheerio.load(html)
  
  // Remover elementos no deseados
  $('script, style, nav, footer, header, aside, .sidebar, .menu, .navigation, .ad, .ads, .advertisement, iframe, noscript').remove()
  
  // Intentar obtener el título
  let title = $('meta[property="og:title"]').attr('content') 
    || $('title').text() 
    || $('h1').first().text()
    || new URL(url).pathname
  
  title = title.trim().substring(0, 200)
  
  // Intentar obtener el contenido principal
  let content = ''
  
  // Priorizar selectores comunes de contenido principal
  const mainSelectors = [
    'article',
    'main',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '#content',
    '.main-content',
    '[role="main"]'
  ]
  
  for (const selector of mainSelectors) {
    const element = $(selector)
    if (element.length > 0) {
      content = element.text()
      break
    }
  }
  
  // Fallback: todo el body
  if (!content || content.trim().length < 100) {
    content = $('body').text()
  }
  
  // Limpiar espacios múltiples y líneas vacías
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
  
  return { title, content }
}

// Función para crawlear múltiples páginas del mismo dominio
async function crawlSite(baseUrl: string, maxPages: number = 10): Promise<{ url: string; title: string; content: string }[]> {
  const visited = new Set<string>()
  const toVisit = [baseUrl]
  const results: { url: string; title: string; content: string }[] = []
  const baseDomain = new URL(baseUrl).hostname
  
  while (toVisit.length > 0 && results.length < maxPages) {
    const url = toVisit.shift()!
    
    if (visited.has(url)) continue
    visited.add(url)
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TuquiBot/1.0; +https://tuqui.ai)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })
      
      if (!response.ok) continue
      
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html')) continue
      
      const html = await response.text()
      const { title, content } = extractMainContent(html, url)
      
      // Solo agregar si tiene contenido significativo
      if (content.length > 200) {
        results.push({ url, title, content })
      }
      
      // Extraer links internos para crawlear
      const $ = cheerio.load(html)
      $('a[href]').each((_, el) => {
        try {
          const href = $(el).attr('href')
          if (!href) return
          
          const absoluteUrl = new URL(href, url).href
          const linkDomain = new URL(absoluteUrl).hostname
          
          // Solo links del mismo dominio, sin anchors ni queries complejas
          if (linkDomain === baseDomain && 
              !absoluteUrl.includes('#') && 
              !visited.has(absoluteUrl) &&
              !toVisit.includes(absoluteUrl)) {
            toVisit.push(absoluteUrl)
          }
        } catch {
          // Ignorar URLs inválidas
        }
      })
      
    } catch (error) {
      console.error(`Error crawling ${url}:`, error)
    }
  }
  
  return results
}

// POST - Scrapear una URL o sitio
export async function POST(request: NextRequest) {
  try {
    const { url, agentId, crawl = false, maxPages = 5 } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'Missing URL' },
        { status: 400 }
      )
    }

    // Validar URL
    let validUrl: URL
    try {
      validUrl = new URL(url)
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Invalid protocol')
      }
    } catch {
      return NextResponse.json(
        { error: 'URL inválida' },
        { status: 400 }
      )
    }

    if (crawl) {
      // Crawlear múltiples páginas
      const pages = await crawlSite(url, Math.min(maxPages, 20))
      
      if (pages.length === 0) {
        return NextResponse.json(
          { error: 'No se pudo extraer contenido del sitio' },
          { status: 400 }
        )
      }

      // Si hay agentId, guardar como documentos
      const savedDocs = []
      if (agentId) {
        for (const page of pages) {
          try {
            const doc = await addDocument(
              agentId, 
              page.title, 
              page.content, 
              'web', 
              page.url
            )
            savedDocs.push(doc)
          } catch (error) {
            console.error(`Error saving document for ${page.url}:`, error)
          }
        }
      }

      return NextResponse.json({
        success: true,
        pagesFound: pages.length,
        pagesSaved: savedDocs.length,
        pages: pages.map(p => ({ 
          url: p.url, 
          title: p.title, 
          contentLength: p.content.length 
        }))
      })
      
    } else {
      // Scrapear una sola página
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TuquiBot/1.0; +https://tuqui.ai)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        return NextResponse.json(
          { error: `Error al acceder a la URL: ${response.status}` },
          { status: 400 }
        )
      }

      const html = await response.text()
      const { title, content } = extractMainContent(html, url)

      if (content.length < 100) {
        return NextResponse.json(
          { error: 'No se pudo extraer contenido significativo de la página' },
          { status: 400 }
        )
      }

      // Si hay agentId, guardar como documento
      let savedDoc = null
      if (agentId) {
        savedDoc = await addDocument(agentId, title, content, 'web', url)
      }

      return NextResponse.json({
        success: true,
        title,
        content,
        contentLength: content.length,
        url,
        saved: !!savedDoc,
        documentId: savedDoc?.id
      })
    }

  } catch (error: any) {
    console.error('Scrape API error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al scrapear la página' },
      { status: 500 }
    )
  }
}

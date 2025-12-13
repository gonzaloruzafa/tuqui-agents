import { ToolResult } from './types'

// Tool de búsqueda web usando Tavily
export async function searchWeb(query: string, options?: {
  search_depth?: 'basic' | 'advanced'
  max_results?: number
  include_answer?: boolean
}): Promise<ToolResult> {
  const apiKey = process.env.TAVILY_API_KEY
  
  if (!apiKey) {
    return { 
      success: false, 
      error: 'TAVILY_API_KEY no configurada' 
    }
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: options?.search_depth || 'basic',
        max_results: options?.max_results || 5,
        include_answer: options?.include_answer ?? true,
        include_raw_content: false,
        include_images: false,
      })
    })

    if (!res.ok) {
      const error = await res.text()
      return { success: false, error: `Tavily error: ${error}` }
    }

    const data = await res.json()

    // Formatear respuesta
    const result = {
      answer: data.answer,
      results: data.results?.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score
      }))
    }

    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Configuración del tool de Tavily para el sistema
export const tavilyToolConfig = {
  slug: 'web_search',
  name: 'Búsqueda Web',
  description: 'Buscar información actualizada en internet. Útil para noticias, datos actuales, información que no está en los documentos.',
  type: 'builtin' as const,
  parameters: [
    {
      name: 'query',
      type: 'string' as const,
      description: 'Términos de búsqueda',
      required: true
    }
  ]
}

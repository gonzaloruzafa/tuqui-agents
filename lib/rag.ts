import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabaseAdmin } from './supabase'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Generar embedding usando Gemini
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
  const result = await model.embedContent(text)
  return result.embedding.values
}

// Buscar documentos relevantes para una consulta
export async function searchRelevantDocs(
  agentId: string, 
  query: string, 
  limit: number = 5
): Promise<{ content: string; similarity: number }[]> {
  try {
    const embedding = await generateEmbedding(query)
    
    const supabase = supabaseAdmin()
    const { data, error } = await supabase.rpc('tuqui_match_documents', {
      query_embedding: embedding,
      match_agent_id: agentId,
      match_threshold: 0.5,  // Bajamos el threshold para encontrar más resultados
      match_count: limit
    })

    if (error) {
      console.error('Error searching documents:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in RAG search:', error)
    return []
  }
}

// Construir contexto RAG para el prompt
export async function buildRAGContext(agentId: string, query: string): Promise<string> {
  const docs = await searchRelevantDocs(agentId, query)
  
  if (docs.length === 0) {
    return ''
  }

  const context = docs
    .map((doc, i) => `[Documento ${i + 1}]\n${doc.content}`)
    .join('\n\n---\n\n')

  return `
=== DOCUMENTACIÓN DE REFERENCIA ===

${context}

=== FIN DE DOCUMENTACIÓN ===

INSTRUCCIONES IMPORTANTES:
- SOLO usá la información de la documentación anterior para responder.
- Si la documentación no contiene información relevante, decí "No tengo información sobre eso en mi documentación".
- NO inventes ni agregues información que no esté en los documentos.
- Citá la fuente cuando sea posible.
`
}

// Agregar documento y generar chunks con embeddings
export async function addDocument(
  agentId: string,
  title: string,
  content: string,
  sourceType: string = 'manual',
  sourceUrl?: string
) {
  const supabase = supabaseAdmin()
  
  // Crear documento
  const { data: doc, error: docError } = await supabase
    .from('tuqui_documents')
    .insert({
      agent_id: agentId,
      title,
      content,
      source_type: sourceType,
      source_url: sourceUrl
    })
    .select()
    .single()

  if (docError) {
    throw new Error(`Error creating document: ${docError.message}`)
  }

  // Dividir en chunks (aprox 500 palabras cada uno)
  const chunks = splitIntoChunks(content, 500)
  
  // Generar embeddings y guardar chunks
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk)
    
    const { error: chunkError } = await supabase
      .from('tuqui_document_chunks')
      .insert({
        document_id: doc.id,
        agent_id: agentId,
        content: chunk,
        embedding
      })

    if (chunkError) {
      console.error('Error creating chunk:', chunkError)
    }
  }

  return doc
}

// Dividir texto en chunks
function splitIntoChunks(text: string, wordsPerChunk: number): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ')
    if (chunk.trim()) {
      chunks.push(chunk)
    }
  }
  
  return chunks
}

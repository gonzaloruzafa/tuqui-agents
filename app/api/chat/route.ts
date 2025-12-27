import { GoogleGenerativeAI } from '@google/generative-ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, stepCountIs } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { getAgentByIdFromDB } from '@/lib/agents-db'
import { getAgentById } from '@/lib/agents'
import { buildRAGContext } from '@/lib/rag'
import { getAgentTools, generateToolsPrompt, parseToolCall, executeTool } from '@/lib/tools/executor'
import { getCompanyConfig, generateCompanyContext } from '@/lib/company'
import { odooTools, generateOdooSystemPrompt } from '@/lib/odoo'
// MercadoLibre tools se cargan dinámicamente (Puppeteer no compatible con Edge)

// Configuración del provider Vercel AI SDK para Odoo
const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || ''
})

export async function POST(request: NextRequest) {
  try {
    const { agentId, message, history = [] } = await request.json()

    if (!agentId || !message) {
      return NextResponse.json(
        { error: 'Missing agentId or message' },
        { status: 400 }
      )
    }

    // Intentar obtener agente de la DB, fallback a estático
    let agent = await getAgentByIdFromDB(agentId)
    let systemPrompt = agent?.system_prompt
    
    if (!agent || !systemPrompt) {
      // Fallback a agentes estáticos
      const staticAgent = getAgentById(agentId)
      if (!staticAgent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 400 }
        )
      }
      systemPrompt = staticAgent.systemPrompt
      // Si no hay agent de DB, crear uno temporal para RAG
      if (!agent) {
        agent = { ...staticAgent, rag_enabled: false } as any
      }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing API Key' },
        { status: 500 }
      )
    }

    // Cargar tools del agente
    const tools = await getAgentTools(agentId)
    
    // Detectar si el agente tiene tools especializadas
    const hasOdooTool = tools.some(t => t.slug === 'odoo')
    const hasMeliTool = tools.some(t => t.slug === 'mercadolibre')
    
    // =====================================================================
    // FLUJO COMBINADO (Odoo + MercadoLibre) o individual
    // =====================================================================
    if (hasOdooTool || hasMeliTool) {
      console.log('[Chat] Using Vercel AI SDK with tools for agent:', agentId, { hasOdooTool, hasMeliTool })
      
      try {
        // Construir historial en formato Vercel AI SDK
        // Limitar a últimos 20 mensajes para evitar contexto muy largo
        const MAX_HISTORY = 20
        const recentHistory = history.slice(-MAX_HISTORY)
        
        const coreMessages = recentHistory.map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
        
        // Detectar si el mensaje actual parece necesitar contexto
        const contextualKeywords = [
          'desglosame', 'desglosa', 'por vendedor', 'por producto', 'por mes', 'por cliente',
          'el primero', 'el segundo', 'el tercero', 'el cuarto', 'el quinto',
          'ese', 'esa', 'eso', 'esos', 'esas', 'este', 'esta',
          'dale', 'pasame', 'mostrá', 'mostrame',
          'pero', 'no,', 'digo', 'digo,', 'quiero decir',
          'y de', 'y los', 'y las', 'también',
          'más detalle', 'detallame', 'expandí', 'ampliá'
        ]
        const messageLower = message.toLowerCase()
        const needsContext = contextualKeywords.some(kw => messageLower.includes(kw)) || message.length < 30
        
        // Si necesita contexto y hay historial, añadir resumen explícito
        let enhancedMessage = message
        if (needsContext && recentHistory.length > 0) {
          // Extraer los últimos intercambios relevantes
          const lastExchanges = recentHistory.slice(-4) // últimos 2 pares user/assistant
          const contextSummary = lastExchanges.map(m => `${m.role}: ${m.content.substring(0, 200)}`).join('\n')
          
          enhancedMessage = `[CONTEXTO DE CONVERSACIÓN RECIENTE - USALO PARA ENTENDER MI PEDIDO]
${contextSummary}

[MI MENSAJE ACTUAL]
${message}

Nota: Si mi mensaje es corto o hace referencia a algo anterior (como "desglosame", "el segundo", "por vendedor"), usá el contexto de arriba para entender qué quiero.`
        }
        
        // Agregar el mensaje actual (posiblemente mejorado)
        coreMessages.push({ role: 'user' as const, content: enhancedMessage })
        
        // Combinar tools y system prompts
        let combinedTools: Record<string, any> = {}
        let combinedSystemPrompt = ''
        
        // Agregar Odoo tools si está habilitado
        if (hasOdooTool) {
          const odooSystemPrompt = generateOdooSystemPrompt()
          combinedSystemPrompt += `## HERRAMIENTAS ODOO (datos internos de tu empresa)\n\n${odooSystemPrompt}\n\n`
          combinedTools = { ...combinedTools, ...odooTools }
        }
        
        // Agregar MercadoLibre tools si está habilitado
        if (hasMeliTool) {
          const { meliTools, generateMeliSystemPrompt } = await import('@/lib/mercadolibre')
          const meliSystemPrompt = generateMeliSystemPrompt()
          combinedSystemPrompt += `## HERRAMIENTAS MERCADO LIBRE (marketplace público)\n\n${meliSystemPrompt}\n\n`
          combinedTools = { ...combinedTools, ...meliTools }
        }
        
        // Si tiene ambas tools, agregar instrucciones de decisión
        if (hasOdooTool && hasMeliTool) {
          combinedSystemPrompt = `Sos un asistente de negocios con acceso a DOS sistemas:

1. **ODOO** (ERP interno): Datos de TU empresa - ventas, compras, stock, clientes, facturas, productos propios
2. **MERCADO LIBRE** (marketplace): Datos PÚBLICOS del mercado - precios de competencia, productos de terceros

## REGLA DE DECISIÓN - MUY IMPORTANTE

Cuando el usuario pregunte:
- "vendimos", "compramos", "nuestras ventas", "mi empresa", "stock", "facturación" → Usar tools de **ODOO**
- "buscar en mercado libre", "precios de mercado", "competencia", "¿a cuánto vender?", "productos en MELI" → Usar tools de **MERCADO LIBRE**
- Si no está claro, PREGUNTAR al usuario si se refiere a datos internos (Odoo) o del mercado (MercadoLibre)

` + combinedSystemPrompt
        }
        
        // Usar generateText con todas las tools combinadas
        const model = googleAI('gemini-2.5-flash')
        
        const result = await generateText({
          model,
          system: combinedSystemPrompt,
          messages: coreMessages,
          tools: combinedTools,
          stopWhen: stepCountIs(5),
          temperature: 0.3,
        })
        
        // Determinar si se usó alguna tool
        let toolUsed: { name: string; query?: string } | null = null
        if (result.toolCalls && result.toolCalls.length > 0) {
          const lastToolCall = result.toolCalls[result.toolCalls.length - 1]
          const toolName = lastToolCall.toolName
          const isOdooTool = toolName.startsWith('search_') || toolName.startsWith('analyze_')
          toolUsed = {
            name: isOdooTool ? 'Consulta Odoo' : 'Consulta Mercado Libre',
            query: toolName
          }
        }
        
        return NextResponse.json({ 
          text: result.text, 
          toolUsed 
        })
      } catch (error: any) {
        console.error('[Chat] Error with tools:', error)
        return NextResponse.json({ 
          text: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intentá de nuevo.',
          error: error.message 
        }, { status: 500 })
      }
    }

    // =====================================================================
    // FLUJO LEGACY (para agentes sin Odoo)
    // =====================================================================

    // Buscar contexto RAG relevante
    let ragContext = ''
    if (agent?.rag_enabled) {
      ragContext = await buildRAGContext(agentId, message)
    }

    // Cargar contexto de empresa
    let companyContext = ''
    const companyConfig = await getCompanyConfig()
    if (companyConfig) {
      companyContext = generateCompanyContext(companyConfig)
    }

    // Generar prompt de tools (ya tenemos 'tools' cargado arriba)
    const toolsPrompt = generateToolsPrompt(tools)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    // Construir el historial de chat
    const chatHistory = history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }))

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    })

    // Construir mensaje con: company context + system prompt + RAG context + Tools
    const fullMessage = `${companyContext}${systemPrompt}${ragContext ? '\n\n' + ragContext : ''}${toolsPrompt ? '\n\n' + toolsPrompt : ''}\n\nUsuario: ${message}`
    
    let result = await chat.sendMessage(fullMessage)
    let response = await result.response
    let text = response.text()

    // Info sobre tool usado (para mostrar en UI)
    let toolUsed: { name: string; query?: string } | null = null

    // Verificar si la respuesta es una llamada a tool
    const toolCall = parseToolCall(text)
    if (toolCall && tools.some(t => t.slug === toolCall.tool)) {
      console.log(`[Chat] Ejecutando tool: ${toolCall.tool}`, toolCall.params)
      
      // Guardar info del tool para la UI
      toolUsed = {
        name: toolCall.tool === 'web_search' ? 'Búsqueda Web' : toolCall.tool,
        query: toolCall.params?.query
      }
      
      // Ejecutar el tool
      const toolResult = await executeTool(toolCall.tool, toolCall.params)
      
      // Enviar el resultado al modelo para que genere la respuesta final
      const toolResultMessage = toolResult.success 
        ? `Resultado de ${toolCall.tool}:\n${JSON.stringify(toolResult.data, null, 2)}`
        : `Error al ejecutar ${toolCall.tool}: ${toolResult.error}`
      
      const finalResult = await chat.sendMessage(
        `El tool "${toolCall.tool}" devolvió:\n${toolResultMessage}\n\nAhora generá una respuesta clara y útil para el usuario basándote en esta información. NO uses JSON, respondé en lenguaje natural.`
      )
      text = (await finalResult.response).text()
    }

    return NextResponse.json({ text, toolUsed })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

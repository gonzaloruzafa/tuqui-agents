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
import { meliTools, generateMeliSystemPrompt } from '@/lib/mercadolibre'

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
    // FLUJO MERCADO LIBRE (Vercel AI SDK + meliTools)
    // =====================================================================
    if (hasMeliTool) {
      console.log('[Chat] Using Vercel AI SDK with MercadoLibre tools for agent:', agentId)
      
      // Construir historial en formato Vercel AI SDK
      const coreMessages = history.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
      
      // Agregar el mensaje actual
      coreMessages.push({ role: 'user' as const, content: message })
      
      // Generar system prompt de MercadoLibre
      const meliSystemPrompt = generateMeliSystemPrompt()
      
      // Usar generateText con tools y multi-step
      const model = googleAI('gemini-2.0-flash-exp')
      
      const result = await generateText({
        model,
        system: meliSystemPrompt,
        messages: coreMessages,
        tools: meliTools,
        stopWhen: stepCountIs(5), // Hasta 5 pasos de razonamiento
        temperature: 0.3,
      })
      
      // Determinar si se usó alguna tool
      let toolUsed: { name: string; query?: string } | null = null
      if (result.toolCalls && result.toolCalls.length > 0) {
        const lastToolCall = result.toolCalls[result.toolCalls.length - 1]
        toolUsed = {
          name: 'Consulta Mercado Libre',
          query: `${lastToolCall.toolName}`
        }
      }
      
      return NextResponse.json({ 
        text: result.text, 
        toolUsed 
      })
    }
    
    // =====================================================================
    // FLUJO ODOO (Vercel AI SDK + odooTools)
    // =====================================================================
    if (hasOdooTool) {
      console.log('[Chat] Using Vercel AI SDK with Odoo tools for agent:', agentId)
      
      // Construir historial en formato Vercel AI SDK
      const coreMessages = history.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
      
      // Agregar el mensaje actual
      coreMessages.push({ role: 'user' as const, content: message })
      
      // Generar system prompt con schema de Odoo y fecha actual
      const odooSystemPrompt = generateOdooSystemPrompt()
      
      // Usar generateText con tools y multi-step
      const model = googleAI('gemini-2.0-flash-exp')
      
      const result = await generateText({
        model,
        system: odooSystemPrompt,
        messages: coreMessages,
        tools: odooTools,
        stopWhen: stepCountIs(5), // Hasta 5 pasos de razonamiento
        temperature: 0.3,
      })
      
      // Determinar si se usó alguna tool
      let toolUsed: { name: string; query?: string } | null = null
      if (result.toolCalls && result.toolCalls.length > 0) {
        const lastToolCall = result.toolCalls[result.toolCalls.length - 1]
        toolUsed = {
          name: 'Consulta Odoo',
          query: `${lastToolCall.toolName}`
        }
      }
      
      return NextResponse.json({ 
        text: result.text, 
        toolUsed 
      })
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

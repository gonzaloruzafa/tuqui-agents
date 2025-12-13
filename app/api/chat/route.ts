import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { getAgentByIdFromDB } from '@/lib/agents-db'
import { getAgentById } from '@/lib/agents'
import { buildRAGContext } from '@/lib/rag'
import { getAgentTools, generateToolsPrompt, parseToolCall, executeTool } from '@/lib/tools/executor'

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

    // Buscar contexto RAG relevante
    let ragContext = ''
    if (agent?.rag_enabled) {
      ragContext = await buildRAGContext(agentId, message)
    }

    // Cargar tools del agente
    const tools = await getAgentTools(agentId)
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

    // Construir mensaje con system prompt + RAG context + Tools
    const fullMessage = `${systemPrompt}${ragContext ? '\n\n' + ragContext : ''}${toolsPrompt ? '\n\n' + toolsPrompt : ''}\n\nUsuario: ${message}`
    
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

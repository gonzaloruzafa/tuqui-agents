import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { getAgentByIdFromDB } from '@/lib/agents-db'
import { getAgentById } from '@/lib/agents'
import { buildRAGContext } from '@/lib/rag'

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

    // Construir mensaje con system prompt + RAG context
    const fullMessage = `${systemPrompt}${ragContext ? '\n\n' + ragContext : ''}\n\nUsuario: ${message}`
    
    const result = await chat.sendMessage(fullMessage)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ text })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

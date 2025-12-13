import { NextRequest, NextResponse } from 'next/server'
import { 
  createChatSession, 
  getChatSessions, 
  getSessionMessages, 
  saveMessage,
  updateSessionTitle,
  deleteSession 
} from '@/lib/chat-history'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Generar título resumido para el chat
async function generateTitle(userMessage: string, botResponse: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    
    const prompt = `Generá un título muy corto (máximo 5-6 palabras) que resuma el tema de esta conversación. Solo respondé con el título, sin comillas ni puntuación final.

Usuario: ${userMessage.substring(0, 200)}
Asistente: ${botResponse.substring(0, 300)}

Título:`

    const result = await model.generateContent(prompt)
    const title = result.response.text().trim()
    
    // Limpiar el título
    return title
      .replace(/^["']|["']$/g, '') // Quitar comillas
      .replace(/\.+$/, '') // Quitar puntos finales
      .substring(0, 60) // Limitar longitud
  } catch (error) {
    console.error('Error generating title:', error)
    // Fallback: usar las primeras palabras del mensaje
    return userMessage.split(' ').slice(0, 5).join(' ') + (userMessage.split(' ').length > 5 ? '...' : '')
  }
}

// GET - Obtener sesiones o mensajes de una sesión
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const agentId = searchParams.get('agentId')
  const sessionId = searchParams.get('sessionId')

  try {
    // Si hay sessionId, devolver mensajes de esa sesión
    if (sessionId) {
      const messages = await getSessionMessages(sessionId)
      return NextResponse.json(messages)
    }

    // Si hay agentId, devolver sesiones de ese agente
    if (agentId) {
      const sessions = await getChatSessions(agentId)
      return NextResponse.json(sessions)
    }

    return NextResponse.json({ error: 'Se requiere agentId o sessionId' }, { status: 400 })
  } catch (error) {
    console.error('Error in chat-sessions GET:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST - Crear sesión o guardar mensaje
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, agentId, sessionId, title, role, content, userMessage, botResponse } = body

    if (action === 'create-session') {
      if (!agentId || !title) {
        return NextResponse.json({ error: 'Se requiere agentId y title' }, { status: 400 })
      }
      const session = await createChatSession(agentId, title)
      if (!session) {
        return NextResponse.json({ error: 'Error creando sesión' }, { status: 500 })
      }
      return NextResponse.json(session)
    }

    if (action === 'save-message') {
      if (!sessionId || !role || !content) {
        return NextResponse.json({ error: 'Se requiere sessionId, role y content' }, { status: 400 })
      }
      const message = await saveMessage(sessionId, role, content)
      if (!message) {
        return NextResponse.json({ error: 'Error guardando mensaje' }, { status: 500 })
      }
      return NextResponse.json(message)
    }

    if (action === 'update-title') {
      if (!sessionId || !title) {
        return NextResponse.json({ error: 'Se requiere sessionId y title' }, { status: 400 })
      }
      const success = await updateSessionTitle(sessionId, title)
      return NextResponse.json({ success })
    }

    if (action === 'generate-title') {
      if (!sessionId || !userMessage || !botResponse) {
        return NextResponse.json({ error: 'Se requiere sessionId, userMessage y botResponse' }, { status: 400 })
      }
      const generatedTitle = await generateTitle(userMessage, botResponse)
      await updateSessionTitle(sessionId, generatedTitle)
      return NextResponse.json({ title: generatedTitle })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error) {
    console.error('Error in chat-sessions POST:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE - Eliminar sesión
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Se requiere sessionId' }, { status: 400 })
  }

  try {
    const success = await deleteSession(sessionId)
    return NextResponse.json({ success })
  } catch (error) {
    console.error('Error in chat-sessions DELETE:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

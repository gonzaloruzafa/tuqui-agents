import { supabase } from './supabase'

export interface ChatSession {
  id: string
  agent_id: string
  user_id?: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// Crear una nueva sesión de chat
export async function createChatSession(agentId: string, title: string, userId?: string): Promise<ChatSession | null> {
  const { data, error } = await supabase()
    .from('tuqui_chat_sessions')
    .insert({
      agent_id: agentId,
      user_id: userId || null,
      title: title.substring(0, 100), // Limitar título a 100 chars
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating chat session:', error)
    return null
  }

  return data
}

// Obtener sesiones de chat por agente
export async function getChatSessions(agentId: string, userId?: string): Promise<ChatSession[]> {
  let query = supabase()
    .from('tuqui_chat_sessions')
    .select('*')
    .eq('agent_id', agentId)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching chat sessions:', error)
    return []
  }

  return data || []
}

// Guardar mensaje en una sesión
export async function saveMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<ChatMessage | null> {
  const { data, error } = await supabase()
    .from('tuqui_chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving message:', error)
    return null
  }

  // Actualizar timestamp de la sesión
  await supabase()
    .from('tuqui_chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  return data
}

// Obtener mensajes de una sesión
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase()
    .from('tuqui_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }

  return data || []
}

// Actualizar título de sesión
export async function updateSessionTitle(sessionId: string, title: string): Promise<boolean> {
  const { error } = await supabase()
    .from('tuqui_chat_sessions')
    .update({ title: title.substring(0, 100) })
    .eq('id', sessionId)

  if (error) {
    console.error('Error updating session title:', error)
    return false
  }

  return true
}

// Eliminar sesión
export async function deleteSession(sessionId: string): Promise<boolean> {
  // Primero eliminar mensajes
  await supabase()
    .from('tuqui_chat_messages')
    .delete()
    .eq('session_id', sessionId)

  // Luego eliminar sesión
  const { error } = await supabase()
    .from('tuqui_chat_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    console.error('Error deleting session:', error)
    return false
  }

  return true
}

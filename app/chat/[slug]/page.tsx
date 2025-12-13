'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { 
  Send, Loader2, ArrowLeft, 
  Scale, Users, Briefcase, HeadphonesIcon,
  Bot, Brain, Code, Lightbulb, MessageSquare, Sparkles,
  GraduationCap, Heart, ShoppingCart, TrendingUp, Wrench,
  FileText, Calculator, Globe, Shield, Zap, Mail, Copy, Check,
  Plus, Trash2, PanelLeftClose, PanelLeft, Search
} from 'lucide-react'
import { marked } from 'marked'

interface Agent {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  color: string
  welcome_message?: string
  welcomeMessage?: string
  placeholder_text?: string
  placeholderText?: string
  features?: string[]
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  rawContent?: string
  toolUsed?: { name: string; query?: string }
}

interface ChatSession {
  id: string
  agent_id: string
  title: string
  created_at: string
  updated_at: string
}

const getAgentIcon = (iconName: string, size: 'sm' | 'md' | 'lg' = 'sm', colorClass = 'text-white') => {
  const sizeClass = size === 'lg' ? 'w-7 h-7' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  const icons: Record<string, React.ReactNode> = {
    'Scale': <Scale className={`${sizeClass} ${colorClass}`} />,
    'Users': <Users className={`${sizeClass} ${colorClass}`} />,
    'Briefcase': <Briefcase className={`${sizeClass} ${colorClass}`} />,
    'HeadphonesIcon': <HeadphonesIcon className={`${sizeClass} ${colorClass}`} />,
    'Bot': <Bot className={`${sizeClass} ${colorClass}`} />,
    'Brain': <Brain className={`${sizeClass} ${colorClass}`} />,
    'Code': <Code className={`${sizeClass} ${colorClass}`} />,
    'Lightbulb': <Lightbulb className={`${sizeClass} ${colorClass}`} />,
    'MessageSquare': <MessageSquare className={`${sizeClass} ${colorClass}`} />,
    'Sparkles': <Sparkles className={`${sizeClass} ${colorClass}`} />,
    'GraduationCap': <GraduationCap className={`${sizeClass} ${colorClass}`} />,
    'Heart': <Heart className={`${sizeClass} ${colorClass}`} />,
    'ShoppingCart': <ShoppingCart className={`${sizeClass} ${colorClass}`} />,
    'TrendingUp': <TrendingUp className={`${sizeClass} ${colorClass}`} />,
    'Wrench': <Wrench className={`${sizeClass} ${colorClass}`} />,
    'FileText': <FileText className={`${sizeClass} ${colorClass}`} />,
    'Calculator': <Calculator className={`${sizeClass} ${colorClass}`} />,
    'Globe': <Globe className={`${sizeClass} ${colorClass}`} />,
    'Shield': <Shield className={`${sizeClass} ${colorClass}`} />,
    'Zap': <Zap className={`${sizeClass} ${colorClass}`} />,
    'Mail': <Mail className={`${sizeClass} ${colorClass}`} />,
  }
  return icons[iconName] || <Bot className={`${sizeClass} ${colorClass}`} />
}

export default function ChatPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const agentSlug = params.slug as string
  const sessionIdParam = searchParams.get('session')
  
  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoadingAgent, setIsLoadingAgent] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Cargar agente desde la API
  useEffect(() => {
    async function loadAgent() {
      try {
        const res = await fetch(`/api/agents?slug=${agentSlug}`)
        if (res.ok) {
          const data = await res.json()
          setAgent(data)
        }
      } catch (error) {
        console.error('Error loading agent:', error)
      } finally {
        setIsLoadingAgent(false)
      }
    }
    loadAgent()
  }, [agentSlug])

  // Cargar sesiones cuando tenemos el agente
  const loadSessions = useCallback(async () => {
    if (!agent?.id) return
    setIsLoadingSessions(true)
    try {
      const res = await fetch(`/api/chat-sessions?agentId=${agent.id}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setIsLoadingSessions(false)
    }
  }, [agent?.id])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Cargar mensajes si hay una sesión en la URL
  useEffect(() => {
    async function loadSessionMessages() {
      if (!sessionIdParam) {
        setCurrentSessionId(null)
        setMessages([])
        return
      }
      
      setCurrentSessionId(sessionIdParam)
      try {
        const res = await fetch(`/api/chat-sessions?sessionId=${sessionIdParam}`)
        if (res.ok) {
          const data = await res.json()
          // Convertir mensajes del servidor al formato local
          const loadedMessages: Message[] = []
          for (const msg of data) {
            if (msg.role === 'assistant') {
              marked.setOptions({ breaks: true, gfm: true })
              const htmlContent = await marked.parse(msg.content || '')
              loadedMessages.push({
                id: msg.id,
                role: msg.role,
                content: htmlContent,
                rawContent: msg.content,
              })
            } else {
              loadedMessages.push({
                id: msg.id,
                role: msg.role,
                content: msg.content,
              })
            }
          }
          setMessages(loadedMessages)
        }
      } catch (error) {
        console.error('Error loading session messages:', error)
      }
    }
    loadSessionMessages()
  }, [sessionIdParam])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Crear nueva sesión
  const createNewSession = async (firstMessage: string): Promise<string | null> => {
    if (!agent?.id) return null
    
    try {
      const res = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-session',
          agentId: agent.id,
          title: 'Nuevo chat', // Título temporal
        }),
      })
      
      if (res.ok) {
        const session = await res.json()
        setSessions(prev => [session, ...prev])
        return session.id
      }
    } catch (error) {
      console.error('Error creating session:', error)
    }
    return null
  }

  // Generar resumen del chat y actualizar título
  const generateChatTitle = async (sessionId: string, userMessage: string, botResponse: string) => {
    try {
      const res = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-title',
          sessionId,
          userMessage,
          botResponse,
        }),
      })
      
      if (res.ok) {
        const { title } = await res.json()
        // Actualizar el título en la lista local
        setSessions(prev => prev.map(s => 
          s.id === sessionId ? { ...s, title } : s
        ))
      }
    } catch (error) {
      console.error('Error generating title:', error)
    }
  }

  // Guardar mensaje
  const saveMessageToSession = async (sessionId: string, role: 'user' | 'assistant', content: string) => {
    try {
      await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-message',
          sessionId,
          role,
          content,
        }),
      })
    } catch (error) {
      console.error('Error saving message:', error)
    }
  }

  // Eliminar sesión
  const deleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat-sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        if (currentSessionId === sessionId) {
          router.push(`/chat/${agentSlug}`)
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  // Nuevo chat
  const startNewChat = () => {
    router.push(`/chat/${agentSlug}`)
    setMessages([])
    setCurrentSessionId(null)
  }

  // Loading state
  if (isLoadingAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-adhoc-violet" />
          <span className="text-gray-500 text-[15px]">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-adhoc-lavender flex items-center justify-center">
            <Bot className="w-8 h-8 text-adhoc-violet" />
          </div>
          <h1 className="text-xl font-medium text-gray-900 mb-2">
            Agente no encontrado
          </h1>
          <p className="text-gray-500 mb-6 text-[15px]">El agente que buscas no existe o fue eliminado.</p>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-adhoc-violet hover:text-adhoc-violet/80 transition-colors text-[15px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessageContent = input.trim()
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Crear sesión si es el primer mensaje
    let sessionId = currentSessionId
    const isFirstMessage = !sessionId
    if (!sessionId) {
      sessionId = await createNewSession(userMessageContent)
      if (sessionId) {
        setCurrentSessionId(sessionId)
        router.push(`/chat/${agentSlug}?session=${sessionId}`, { scroll: false })
      }
    }

    // Guardar mensaje del usuario
    if (sessionId) {
      await saveMessageToSession(sessionId, 'user', userMessageContent)
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          message: userMessageContent,
          history: messages.map(m => ({ role: m.role, content: m.rawContent || m.content })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error del servidor')
      }

      const data = await response.json()
      
      // Convertir markdown a HTML
      marked.setOptions({ breaks: true, gfm: true })
      const htmlContent = await marked.parse(data.text || '')

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: htmlContent,
        rawContent: data.text || '',
        toolUsed: data.toolUsed || undefined,
      }

      setMessages(prev => [...prev, botMessage])

      // Guardar respuesta del bot
      if (sessionId) {
        await saveMessageToSession(sessionId, 'assistant', data.text || '')
        
        // Generar título del chat después de la primera interacción
        if (isFirstMessage) {
          generateChatTitle(sessionId, userMessageContent, data.text || '')
        }
      }
    } catch (error: any) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intentá de nuevo.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      {/* Sidebar - ChatGPT Style */}
      <aside 
        className={`${
          sidebarOpen ? 'w-[260px]' : 'w-0'
        } h-full bg-[#f9f9f9] flex flex-col transition-all duration-200 overflow-hidden flex-shrink-0 border-r border-gray-200/60`}
      >
        {/* Logo */}
        <div className="p-4 pb-2">
          <img 
            src="/adhoc-logo.png" 
            alt="Adhoc" 
            className="h-8 object-contain"
          />
        </div>

        {/* New Chat Button */}
        <div className="px-2 pb-2">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-200/60 rounded-lg text-[14px] text-gray-700 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-600">
              <path d="M15.6729 3.91287C16.8918 2.69392 18.8682 2.69392 20.0871 3.91287C21.3061 5.13182 21.3061 7.10818 20.0871 8.32713L10.0596 18.3547C9.55219 18.8621 8.93208 19.2441 8.24604 19.4719L4.38889 20.6992C3.92227 20.8589 3.14078 20.8501 3.14531 20.1416C3.14531 20.0531 3.16047 19.9653 3.19042 19.8823L4.52817 15.7538C4.75592 15.0677 5.13791 14.4476 5.64527 13.9402L15.6729 3.91287Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 6L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Nuevo chat</span>
          </button>
        </div>
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-2">
          {isLoadingSessions ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-gray-400 text-[13px] px-3 py-4">
              No hay conversaciones anteriores
            </p>
          ) : (
            <div className="py-1">
              <p className="text-[11px] font-medium text-gray-500 px-3 py-2 uppercase tracking-wide">Tus chats</p>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    currentSessionId === session.id
                      ? 'bg-gray-200/70'
                      : 'hover:bg-gray-200/50'
                  }`}
                  onClick={() => router.push(`/chat/${agentSlug}?session=${session.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-gray-900 truncate">
                      {session.title}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(session.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-300/50 rounded-md transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Link */}
        <div className="p-2 border-t border-gray-200/60">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 text-[14px] text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200/60">
          <div className="flex items-center h-14 px-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5 text-gray-500" />
              ) : (
                <PanelLeft className="w-5 h-5 text-gray-500" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-adhoc-lavender flex items-center justify-center">
                {getAgentIcon(agent.icon, 'sm', 'text-adhoc-violet')}
              </div>
              <span className="text-[15px] font-medium text-gray-800">
                {agent.name}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center max-w-2xl">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-adhoc-lavender flex items-center justify-center">
                  {getAgentIcon(agent.icon, 'lg', 'text-adhoc-violet')}
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  {agent.name}
                </h1>
                <p className="text-gray-500 text-[15px] mb-8 leading-relaxed">
                  {agent.welcome_message || agent.welcomeMessage || `¿En qué puedo ayudarte hoy?`}
                </p>
                {(agent.features || []).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                    {(agent.features || []).slice(0, 4).map((feature, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setInput(feature)}
                        className="group p-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-left transition-all shadow-sm"
                      >
                        <span className="text-[14px] text-gray-600 group-hover:text-gray-900 transition-colors leading-relaxed">
                          {feature}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto py-6">
              <div className="max-w-3xl mx-auto px-4 space-y-6">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' ? (
                      // Assistant message - left aligned, no bubble
                      <div className="flex gap-3 max-w-[85%] group">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-adhoc-lavender flex items-center justify-center">
                          {getAgentIcon(agent.icon, 'md', 'text-adhoc-violet')}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Tool used indicator */}
                          {msg.toolUsed && (
                            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                                <Search className="w-3 h-3" />
                                <span>{msg.toolUsed.name}</span>
                                {msg.toolUsed.query && (
                                  <span className="text-blue-400">· "{msg.toolUsed.query}"</span>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="text-[15px] leading-7 text-black">
                            <div 
                              className="bot-message max-w-none"
                              dangerouslySetInnerHTML={{ __html: msg.content }} 
                            />
                          </div>
                          {/* Copy button */}
                          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => copyToClipboard(msg.rawContent || msg.content.replace(/<[^>]+>/g, ''), msg.id)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Copiar respuesta"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // User message - right aligned, bubble style
                      <div className="max-w-[75%]">
                        <div className="bg-adhoc-lavender text-gray-900 px-4 py-2.5 rounded-3xl rounded-br-lg">
                          <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="w-8 h-8 rounded-full bg-adhoc-lavender flex items-center justify-center flex-shrink-0">
                        {getAgentIcon(agent.icon, 'md', 'text-adhoc-violet')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1 py-3">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-adhoc-violet/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-adhoc-violet/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-adhoc-violet/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-white">
            <div className="max-w-3xl mx-auto">
              <div className="relative bg-white rounded-3xl border border-gray-200 shadow-sm">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={agent.placeholder_text || agent.placeholderText || `Envía un mensaje...`}
                  className="w-full bg-transparent text-gray-900 placeholder-gray-400 resize-none px-5 py-4 pr-14 text-[15px] focus:outline-none max-h-[200px] min-h-[52px] rounded-3xl leading-relaxed"
                  rows={1}
                />
                <button 
                  onClick={handleSend} 
                  disabled={isLoading || !input.trim()}
                  className="absolute right-3 bottom-3 w-9 h-9 bg-adhoc-violet hover:bg-adhoc-violet/90 text-white rounded-full transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[12px] text-gray-400 mt-3 text-center">
                {agent.name} puede cometer errores. Verificá la información importante.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

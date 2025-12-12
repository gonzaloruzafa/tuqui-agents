'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { 
  Send, User, Loader2, ArrowLeft, 
  Scale, Users, Briefcase, HeadphonesIcon,
  Bot, Brain, Code, Lightbulb, MessageSquare, Sparkles,
  GraduationCap, Heart, ShoppingCart, TrendingUp, Wrench,
  FileText, Calculator, Globe, Shield, Zap, Mail
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
}

const getAgentIcon = (iconName: string, size: 'sm' | 'md' = 'sm') => {
  const sizeClass = size === 'md' ? 'w-6 h-6' : 'w-5 h-5'
  const icons: Record<string, React.ReactNode> = {
    'Scale': <Scale className={`${sizeClass} text-adhoc-violet`} />,
    'Users': <Users className={`${sizeClass} text-adhoc-violet`} />,
    'Briefcase': <Briefcase className={`${sizeClass} text-adhoc-violet`} />,
    'HeadphonesIcon': <HeadphonesIcon className={`${sizeClass} text-adhoc-violet`} />,
    'Bot': <Bot className={`${sizeClass} text-adhoc-violet`} />,
    'Brain': <Brain className={`${sizeClass} text-adhoc-violet`} />,
    'Code': <Code className={`${sizeClass} text-adhoc-violet`} />,
    'Lightbulb': <Lightbulb className={`${sizeClass} text-adhoc-violet`} />,
    'MessageSquare': <MessageSquare className={`${sizeClass} text-adhoc-violet`} />,
    'Sparkles': <Sparkles className={`${sizeClass} text-adhoc-violet`} />,
    'GraduationCap': <GraduationCap className={`${sizeClass} text-adhoc-violet`} />,
    'Heart': <Heart className={`${sizeClass} text-adhoc-violet`} />,
    'ShoppingCart': <ShoppingCart className={`${sizeClass} text-adhoc-violet`} />,
    'TrendingUp': <TrendingUp className={`${sizeClass} text-adhoc-violet`} />,
    'Wrench': <Wrench className={`${sizeClass} text-adhoc-violet`} />,
    'FileText': <FileText className={`${sizeClass} text-adhoc-violet`} />,
    'Calculator': <Calculator className={`${sizeClass} text-adhoc-violet`} />,
    'Globe': <Globe className={`${sizeClass} text-adhoc-violet`} />,
    'Shield': <Shield className={`${sizeClass} text-adhoc-violet`} />,
    'Zap': <Zap className={`${sizeClass} text-adhoc-violet`} />,
    'Mail': <Mail className={`${sizeClass} text-adhoc-violet`} />,
  }
  return icons[iconName] || <Bot className={`${sizeClass} text-adhoc-violet`} />
}

export default function ChatPage() {
  const params = useParams()
  const agentSlug = params.slug as string
  
  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoadingAgent, setIsLoadingAgent] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Loading state
  if (isLoadingAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-adhoc-violet" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-gray-900 mb-4">
            Agente no encontrado
          </h1>
          <Link 
            href="/" 
            className="text-adhoc-violet hover:underline"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          message: input,
          history: messages.map(m => ({ role: m.role, content: m.content })),
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
      }

      setMessages(prev => [...prev, botMessage])
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-100 py-3 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="flex items-center gap-1 text-gray-500 hover:text-adhoc-violet transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </Link>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-adhoc-lavender/30 flex items-center justify-center">
                {getAgentIcon(agent.icon)}
              </div>
              <span className="text-sm font-medium text-gray-900">
                {agent.name}
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-400 hidden sm:block">
            {agent.description}
          </span>
        </div>
      </header>

      <main className="flex-grow w-full flex flex-col bg-white">
        
        {/* Hero Section - when no messages */}
        {messages.length === 0 && (
          <div className="flex-grow flex items-center justify-center px-4">
            <div className="text-center max-w-lg">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-adhoc-lavender/30 flex items-center justify-center">
                {getAgentIcon(agent.icon, 'md')}
              </div>
              <h1 className="text-xl font-medium text-gray-900 mb-2">
                {agent.welcome_message || agent.welcomeMessage || `¡Hola! Soy ${agent.name}. ¿En qué puedo ayudarte?`}
              </h1>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {(agent.features || []).map((feature, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setInput(feature)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-adhoc-lavender/30 hover:text-adhoc-violet transition-colors"
                  >
                    {feature}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="flex-grow overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-adhoc-lavender/40 flex items-center justify-center flex-shrink-0">
                      {getAgentIcon(agent.icon)}
                    </div>
                  )}
                  
                  <div className={`max-w-[75%] min-w-0 ${msg.role === 'user' ? 'bg-adhoc-violet text-white rounded-2xl px-4 py-2' : ''}`}>
                    <div className={`text-sm leading-relaxed break-words overflow-hidden ${msg.role === 'assistant' ? 'bot-message text-gray-800 prose prose-sm max-w-none' : ''}`}>
                      {msg.role === 'user' ? (
                        msg.content.split('\n').map((line, i) => (
                          <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                        ))
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                      )}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-adhoc-lavender/40 flex items-center justify-center flex-shrink-0">
                    {getAgentIcon(agent.icon)}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="animate-spin" size={14} />
                    <span>Pensando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input - Fixed at bottom */}
        <div className="border-t border-gray-100 bg-white">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={agent.placeholderText}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 resize-none focus:ring-2 focus:ring-adhoc-violet focus:border-transparent text-sm text-gray-900 max-h-32"
                rows={1}
              />
              <button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 bg-adhoc-violet hover:bg-adhoc-violet/90 text-white rounded-xl transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Tuqui puede cometer errores. Verificá la información importante.
            </p>
          </div>
        </div>
      </main>

      {/* Footer - minimal */}
      <footer className="bg-white border-t border-gray-100 py-3">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} <a href="https://www.adhoc.inc" target="_blank" rel="noopener noreferrer" className="text-adhoc-violet hover:underline">Adhoc</a>
          </p>
        </div>
      </footer>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, User, Loader2, ArrowLeft } from 'lucide-react';
import { getAgentBySlug } from '../config/agents';
import { sendMessageToAgent } from '../services/chat';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const ChatPage = () => {
  const { agentSlug } = useParams<{ agentSlug: string }>();
  const agent = getAgentBySlug(agentSlug || '');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-display font-medium text-gray-900 mb-4">
            Agente no encontrado
          </h1>
          <Link 
            to="/" 
            className="text-adhoc-violet hover:text-adhoc-coral transition-colors font-sans font-medium"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToAgent(agent.id, input, messages);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intentá de nuevo.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="w-full bg-white border-b border-adhoc-lavender py-6 px-4 md:px-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-gray-600 hover:text-adhoc-violet transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-sans text-sm hidden md:inline">Volver</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-adhoc-lavender/30 flex items-center justify-center">
                <span className="text-xl">{agent.icon}</span>
              </div>
              <div>
                <h1 className="text-lg font-display font-medium text-gray-900">
                  {agent.name}
                </h1>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <span className="px-3 py-1 bg-adhoc-lavender/30 text-adhoc-violet rounded-full text-sm font-medium">
              {agent.description}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full flex flex-col">
        
        {/* Hero Section - when no messages */}
        {messages.length === 0 && (
          <div className="flex-grow flex items-center justify-center px-4">
            <div className="text-center max-w-3xl">
              <div className="w-20 h-20 mx-auto mb-6 rounded-xl bg-adhoc-lavender/30 flex items-center justify-center">
                <span className="text-5xl">{agent.icon}</span>
              </div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-adhoc-lavender/20 text-adhoc-violet font-bold text-xs uppercase tracking-wider mb-6">
                Potenciado por IA
              </span>
              <h1 className="text-4xl md:text-5xl font-display font-medium text-gray-900 mb-6 leading-tight">
                {agent.welcomeMessage}
              </h1>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {agent.features.map((feature, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1.5 bg-adhoc-lavender/20 text-adhoc-violet rounded-full text-sm font-sans"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="flex-grow overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-adhoc-lavender/50 flex items-center justify-center">
                        <span className="text-lg">{agent.icon}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className={`max-w-[70%] ${msg.role === 'user' ? 'bg-adhoc-lavender/40 rounded-2xl px-4 py-3' : ''}`}>
                    <div className={`font-sans leading-relaxed text-gray-900 ${msg.role === 'assistant' ? 'bot-message' : ''}`}>
                      {msg.role === 'user' ? (
                        msg.content.split('\n').map((line, i) => (
                          <p key={i} className={i > 0 ? 'mt-4' : ''}>{line}</p>
                        ))
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                      )}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-adhoc-violet flex items-center justify-center">
                        <User size={18} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-adhoc-lavender/50 flex items-center justify-center">
                      <span className="text-lg">{agent.icon}</span>
                    </div>
                  </div>
                  <div className="max-w-[70%]">
                    <div className="flex items-center gap-2 text-gray-500 font-sans">
                      <Loader2 className="animate-spin" size={16} />
                      <span>Analizando tu consulta...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input - Fixed at bottom */}
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={agent.placeholderText}
                className="flex-1 border border-gray-300 rounded-xl p-4 resize-none focus:ring-2 focus:ring-adhoc-violet focus:border-transparent font-sans text-gray-900 max-h-40"
                rows={1}
              />
              <button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()}
                className="w-12 h-12 bg-adhoc-violet hover:bg-adhoc-violet/90 text-white rounded-xl font-sans font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-xs text-gray-400 font-sans mt-2 text-center">
              Tuqui puede cometer errores. Verificá la información importante.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="w-full px-8 text-center space-y-2">
          <p className="font-sans text-sm text-gray-500">
            <a 
              href="https://www.adhoc.inc" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-adhoc-violet hover:text-adhoc-coral transition-colors font-medium"
            >
              Conocé más sobre la tecnología de Adhoc →
            </a>
          </p>
          <p className="font-sans text-sm text-gray-400">
            © {new Date().getFullYear()} Adhoc S.A. - Soluciones Tecnológicas. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ChatPage;

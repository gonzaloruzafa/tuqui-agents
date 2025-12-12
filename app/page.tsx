import Link from 'next/link'
import { 
  ArrowRight, Scale, Users, Briefcase, HeadphonesIcon,
  Bot, Brain, Code, Lightbulb, MessageSquare, Sparkles,
  GraduationCap, Heart, ShoppingCart, TrendingUp, Wrench,
  FileText, Calculator, Globe, Shield, Zap, Mail
} from 'lucide-react'
import { getAgentsFromDB, type AgentConfig } from '@/lib/agents-db'

// Mapa de iconos de Lucide
const iconMap: Record<string, React.ReactNode> = {
  'Scale': <Scale className="w-6 h-6 text-adhoc-violet" />,
  'Users': <Users className="w-6 h-6 text-adhoc-violet" />,
  'Briefcase': <Briefcase className="w-6 h-6 text-adhoc-violet" />,
  'HeadphonesIcon': <HeadphonesIcon className="w-6 h-6 text-adhoc-violet" />,
  'Bot': <Bot className="w-6 h-6 text-adhoc-violet" />,
  'Brain': <Brain className="w-6 h-6 text-adhoc-violet" />,
  'Code': <Code className="w-6 h-6 text-adhoc-violet" />,
  'Lightbulb': <Lightbulb className="w-6 h-6 text-adhoc-violet" />,
  'MessageSquare': <MessageSquare className="w-6 h-6 text-adhoc-violet" />,
  'Sparkles': <Sparkles className="w-6 h-6 text-adhoc-violet" />,
  'GraduationCap': <GraduationCap className="w-6 h-6 text-adhoc-violet" />,
  'Heart': <Heart className="w-6 h-6 text-adhoc-violet" />,
  'ShoppingCart': <ShoppingCart className="w-6 h-6 text-adhoc-violet" />,
  'TrendingUp': <TrendingUp className="w-6 h-6 text-adhoc-violet" />,
  'Wrench': <Wrench className="w-6 h-6 text-adhoc-violet" />,
  'FileText': <FileText className="w-6 h-6 text-adhoc-violet" />,
  'Calculator': <Calculator className="w-6 h-6 text-adhoc-violet" />,
  'Globe': <Globe className="w-6 h-6 text-adhoc-violet" />,
  'Shield': <Shield className="w-6 h-6 text-adhoc-violet" />,
  'Zap': <Zap className="w-6 h-6 text-adhoc-violet" />,
  'Mail': <Mail className="w-6 h-6 text-adhoc-violet" />,
}

const getAgentIcon = (iconName: string) => {
  return iconMap[iconName] || <Bot className="w-6 h-6 text-adhoc-violet" />
}

const Header = () => (
  <header className="w-full bg-white border-b border-gray-100 py-4 px-4 md:px-8">
    <div className="max-w-5xl mx-auto flex items-center justify-between">
      <a href="https://www.adhoc.inc" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <img src="/adhoc-logo.png" alt="Adhoc" className="h-8 w-auto" />
      </a>
      <span className="text-sm text-gray-500 font-medium">
        Tuqui Agents
      </span>
    </div>
  </header>
)

const Footer = () => (
  <footer className="bg-white border-t border-gray-100 py-6 mt-auto">
    <div className="max-w-5xl mx-auto px-4 text-center">
      <p className="text-xs text-gray-400">
        © {new Date().getFullYear()} Adhoc S.A. · <a href="https://www.adhoc.inc" target="_blank" rel="noopener noreferrer" className="text-adhoc-violet hover:underline">adhoc.inc</a>
      </p>
    </div>
  </footer>
)

const AgentCard = ({ agent }: { agent: AgentConfig }) => (
  <Link 
    href={`/chat/${agent.slug}`}
    className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-adhoc-violet hover:shadow-md transition-all group"
  >
    <div className="w-12 h-12 rounded-lg bg-adhoc-lavender/30 flex items-center justify-center flex-shrink-0">
      {getAgentIcon(agent.icon)}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-base font-medium text-gray-900 group-hover:text-adhoc-violet transition-colors">
        {agent.name}
      </h3>
      <p className="text-sm text-gray-500 truncate">
        {agent.description}
      </p>
    </div>
    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-adhoc-violet transition-colors flex-shrink-0" />
  </Link>
)

export const dynamic = 'force-dynamic' // Disable caching for this page
export const revalidate = 0

export default async function HomePage() {
  const agents = await getAgentsFromDB()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          
          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              Asistentes IA para tu empresa
            </h1>
            <p className="text-sm text-gray-500">
              Seleccioná un agente para comenzar
            </p>
          </div>

          {/* Agent List */}
          <div className="space-y-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>

          {/* Coming Soon */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Próximamente: Tuqui Finance, Tuqui Sales, Tuqui Support
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

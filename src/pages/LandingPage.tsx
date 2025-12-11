import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { getActiveAgents } from '../config/agents';

const Header = () => (
  <header className="w-full bg-white border-b border-adhoc-lavender py-6 px-4 md:px-8 shadow-sm">
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <a href="https://www.adhoc.inc" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <img src="/adhoc-logo.png" alt="Adhoc" className="h-10 w-auto" />
      </a>
      <div className="hidden md:block">
        <span className="px-3 py-1 bg-adhoc-lavender/30 text-adhoc-violet rounded-full text-sm font-medium">
          Tuqui Agents
        </span>
      </div>
    </div>
  </header>
);

const Footer = () => (
  <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
    <div className="container mx-auto px-4 text-center space-y-2">
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
);

const LandingPage = () => {
  const agents = getActiveAgents();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          
          {/* Hero Section */}
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-adhoc-lavender/20 text-adhoc-violet font-bold text-xs uppercase tracking-wider mb-6">
              Potenciado por IA
            </span>
            <h1 className="text-5xl md:text-6xl font-display font-medium text-gray-900 mb-6 leading-tight">
              Asistentes inteligentes <br/>
              <span className="text-adhoc-violet">para tu empresa</span>
            </h1>
            <p className="text-xl text-gray-500 font-sans max-w-2xl mx-auto">
              Agentes de IA entrenados con tu documentación, conectados a tus sistemas. 
              Cada uno especializado en lo que mejor sabe hacer.
            </p>
          </div>

          {/* Agent Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {agents.map((agent) => (
              <Link 
                key={agent.id}
                to={`/chat/${agent.slug}`}
                className="block bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl hover:border-adhoc-lavender transition-all"
              >
                {/* Card Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-adhoc-lavender/30 flex items-center justify-center">
                      <span className="text-3xl">{agent.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-display font-medium text-gray-900">
                        {agent.name}
                      </h3>
                      <p className="text-gray-500 text-sm font-sans">
                        {agent.description}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-adhoc-violet" />
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <p className="text-gray-600 font-sans mb-4 text-sm">
                    {agent.longDescription}
                  </p>

                  {/* Features */}
                  <div className="space-y-2 mb-4">
                    {agent.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 font-sans">
                        <Check className="w-4 h-4 text-adhoc-violet flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Data sources */}
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 font-sans mb-2">Fuentes de datos:</p>
                    <div className="flex flex-wrap gap-2">
                      {agent.dataSources.map((source, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 bg-adhoc-lavender/20 rounded-md text-xs text-adhoc-violet font-sans"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="px-6 pb-6">
                  <div className="w-full py-3 rounded-xl bg-adhoc-violet text-white font-sans font-medium text-center text-sm">
                    Iniciar chat →
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Coming Soon */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 font-sans">
              🚀 Próximamente más agentes: <span className="text-adhoc-violet font-medium">Tuqui Finance</span>, <span className="text-adhoc-violet font-medium">Tuqui Sales</span>, <span className="text-adhoc-violet font-medium">Tuqui Support</span>...
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;

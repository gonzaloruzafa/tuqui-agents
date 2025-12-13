'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Settings, Plus, Edit2, Trash2, FileText, Save, X, 
  ChevronLeft, Upload, Eye, ToggleLeft, ToggleRight, Wrench, Globe, Building2 
} from 'lucide-react'

interface Agent {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  color: string
  is_active: boolean
  rag_enabled: boolean
  system_prompt?: string
  welcome_message?: string
}

interface Document {
  id: string
  title: string
  source_type: string
  created_at: string
}

interface AgentTool {
  id?: string
  tool_slug: string
  enabled: boolean
}

const AVAILABLE_TOOLS = [
  {
    slug: 'web_search',
    name: 'Búsqueda Web',
    description: 'Buscar información en tiempo real en internet usando Tavily',
    icon: '🔍'
  }
]

interface CompanyConfig {
  id?: string
  name: string
  description: string
  industry: string
  context: string
  values: string
  contact_info: string
  website_url: string
  website_content: string
}

export default function AdminPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [agentTools, setAgentTools] = useState<AgentTool[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'config' | 'prompt' | 'documents' | 'tools'>('config')
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<Agent>>({})
  const [promptData, setPromptData] = useState({ systemPrompt: '', welcomeMessage: '' })
  const [newDocContent, setNewDocContent] = useState({ title: '', content: '' })
  const [showNewDocForm, setShowNewDocForm] = useState(false)
  const [docInputType, setDocInputType] = useState<'manual' | 'file' | 'url'>('manual')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [urlInput, setUrlInput] = useState({ url: '', crawl: false, maxPages: 5 })
  const [scrapingUrl, setScrapingUrl] = useState(false)
  const [showNewAgentForm, setShowNewAgentForm] = useState(false)
  const [adminView, setAdminView] = useState<'agents' | 'company'>('agents')
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({
    name: '', description: '', industry: '', context: '', values: '', contact_info: '', website_url: '', website_content: ''
  })
  const [savingCompany, setSavingCompany] = useState(false)
  const [scrapingCompanyWeb, setScrapingCompanyWeb] = useState(false)
  const [newAgentData, setNewAgentData] = useState({ 
    name: '', 
    slug: '', 
    description: '', 
    icon: 'Scale', 
    color: 'blue',
    systemPrompt: ''
  })

  useEffect(() => {
    fetchAgents()
    fetchCompanyConfig()
  }, [])

  useEffect(() => {
    if (selectedAgent) {
      fetchDocuments(selectedAgent.id)
      fetchAgentTools(selectedAgent.id)
      setFormData(selectedAgent)
      setPromptData({
        systemPrompt: selectedAgent.system_prompt || '',
        welcomeMessage: selectedAgent.welcome_message || ''
      })
    }
  }, [selectedAgent])

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      setAgents(data)
      if (data.length > 0 && !selectedAgent) {
        setSelectedAgent(data[0])
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanyConfig = async () => {
    try {
      const res = await fetch('/api/company')
      const data = await res.json()
      if (data && data.id) {
        setCompanyConfig(data)
      }
    } catch (error) {
      console.error('Error fetching company config:', error)
    }
  }

  const saveCompanyConfig = async () => {
    setSavingCompany(true)
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyConfig)
      })
      
      if (res.ok) {
        const data = await res.json()
        setCompanyConfig(data)
        alert('Configuración guardada correctamente')
      } else {
        alert('Error al guardar configuración')
      }
    } catch (error) {
      console.error('Error saving company config:', error)
      alert('Error al guardar configuración')
    } finally {
      setSavingCompany(false)
    }
  }

  const scrapeCompanyWebsite = async () => {
    if (!companyConfig.website_url) {
      alert('Ingresá una URL primero')
      return
    }
    
    setScrapingCompanyWeb(true)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: companyConfig.website_url,
          crawl: true,
          maxPages: 10
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        // Combinar contenido de todas las páginas
        let combinedContent = ''
        if (data.pages) {
          combinedContent = data.pages.map((p: any) => `## ${p.title}\n${p.content}`).join('\n\n---\n\n')
        } else if (data.content) {
          combinedContent = `## ${data.title}\n${data.content}`
        }
        
        // Limitar a ~10000 caracteres para no sobrecargar el prompt
        if (combinedContent.length > 10000) {
          combinedContent = combinedContent.substring(0, 10000) + '\n\n[Contenido truncado...]'
        }
        
        setCompanyConfig({ ...companyConfig, website_content: combinedContent })
        alert(`Sitio scrapeado: ${data.pagesFound || 1} páginas procesadas`)
      } else {
        const error = await res.json()
        alert('Error: ' + error.error)
      }
    } catch (error) {
      console.error('Error scraping company website:', error)
      alert('Error al scrapear el sitio')
    } finally {
      setScrapingCompanyWeb(false)
    }
  }

  const fetchDocuments = async (agentId: string) => {
    try {
      const res = await fetch(`/api/documents?agentId=${agentId}`)
      const data = await res.json()
      setDocuments(data)
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const fetchAgentTools = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agent-tools?agentId=${agentId}`)
      const data = await res.json()
      setAgentTools(data)
    } catch (error) {
      console.error('Error fetching agent tools:', error)
      setAgentTools([])
    }
  }

  const toggleTool = async (toolSlug: string) => {
    if (!selectedAgent) return
    
    const existingTool = agentTools.find(t => t.tool_slug === toolSlug)
    const newEnabled = existingTool ? !existingTool.enabled : true
    
    try {
      const res = await fetch('/api/agent-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          toolSlug,
          enabled: newEnabled
        })
      })
      
      if (res.ok) {
        fetchAgentTools(selectedAgent.id)
      }
    } catch (error) {
      console.error('Error toggling tool:', error)
    }
  }

  const saveAgent = async () => {
    if (!selectedAgent) return
    
    try {
      const res = await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAgent.id,
          ...formData,
          systemPrompt: promptData.systemPrompt
        })
      })
      
      if (res.ok) {
        fetchAgents()
        setEditMode(false)
      }
    } catch (error) {
      console.error('Error saving agent:', error)
    }
  }

  const toggleRag = async () => {
    if (!selectedAgent) return
    
    try {
      await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAgent.id,
          ragEnabled: !selectedAgent.rag_enabled
        })
      })
      
      setSelectedAgent({ ...selectedAgent, rag_enabled: !selectedAgent.rag_enabled })
      fetchAgents()
    } catch (error) {
      console.error('Error toggling RAG:', error)
    }
  }

  const addDocument = async () => {
    if (!selectedAgent || !newDocContent.title || !newDocContent.content) return
    
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          title: newDocContent.title,
          content: newDocContent.content,
          sourceType: 'manual'
        })
      })
      
      if (res.ok) {
        fetchDocuments(selectedAgent.id)
        setNewDocContent({ title: '', content: '' })
        setShowNewDocForm(false)
      } else {
        const error = await res.json()
        alert('Error: ' + error.error)
      }
    } catch (error) {
      console.error('Error adding document:', error)
      alert('Error al agregar documento')
    }
  }

  const uploadFile = async (file: File) => {
    if (!selectedAgent) return
    
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('agentId', selectedAgent.id)
      formData.append('title', newDocContent.title || file.name.replace(/\.[^/.]+$/, ''))

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })
      
      if (res.ok) {
        const data = await res.json()
        alert(`Documento procesado: ${data.extractedLength} caracteres extraídos`)
        fetchDocuments(selectedAgent.id)
        setNewDocContent({ title: '', content: '' })
        setShowNewDocForm(false)
      } else {
        const error = await res.json()
        alert('Error: ' + error.error)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error al subir archivo')
    } finally {
      setUploadingFile(false)
    }
  }

  const scrapeUrl = async () => {
    if (!selectedAgent || !urlInput.url) return
    
    setScrapingUrl(true)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput.url,
          agentId: selectedAgent.id,
          crawl: urlInput.crawl,
          maxPages: urlInput.maxPages
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        if (urlInput.crawl) {
          alert(`Sitio scrapeado: ${data.pagesSaved} páginas guardadas de ${data.pagesFound} encontradas`)
        } else {
          alert(`Página scrapeada: "${data.title}" (${data.contentLength} caracteres)`)
        }
        fetchDocuments(selectedAgent.id)
        setUrlInput({ url: '', crawl: false, maxPages: 5 })
        setShowNewDocForm(false)
      } else {
        const error = await res.json()
        alert('Error: ' + error.error)
      }
    } catch (error) {
      console.error('Error scraping URL:', error)
      alert('Error al scrapear la URL')
    } finally {
      setScrapingUrl(false)
    }
  }

  const deleteDocument = async (docId: string) => {
    if (!confirm('¿Eliminar este documento?')) return
    
    try {
      await fetch(`/api/documents?id=${docId}`, { method: 'DELETE' })
      if (selectedAgent) {
        fetchDocuments(selectedAgent.id)
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const createAgent = async () => {
    if (!newAgentData.name || !newAgentData.slug) {
      alert('Nombre y slug son requeridos')
      return
    }
    
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentData.name,
          slug: newAgentData.slug,
          description: newAgentData.description,
          icon: newAgentData.icon,
          color: newAgentData.color,
          systemPrompt: newAgentData.systemPrompt || `Eres ${newAgentData.name}, un asistente útil.`
        })
      })
      
      if (res.ok) {
        const agent = await res.json()
        setShowNewAgentForm(false)
        setNewAgentData({ name: '', slug: '', description: '', icon: 'Scale', color: 'blue', systemPrompt: '' })
        await fetchAgents()
        setSelectedAgent(agent)
      } else {
        const error = await res.json()
        alert('Error: ' + error.error)
      }
    } catch (error) {
      console.error('Error creating agent:', error)
    }
  }

  const deleteAgent = async (agentId: string) => {
    if (!confirm('¿Eliminar este agente? Esta acción no se puede deshacer.')) return
    
    try {
      await fetch(`/api/agents?id=${agentId}`, { method: 'DELETE' })
      setSelectedAgent(null)
      fetchAgents()
    } catch (error) {
      console.error('Error deleting agent:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <Settings className="w-5 h-5 text-gray-600" />
            <h1 className="font-semibold">Panel de Administración</h1>
          </div>
          {/* Navigation tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setAdminView('agents')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                adminView === 'agents' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Agentes
            </button>
            <button
              onClick={() => setAdminView('company')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                adminView === 'company' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Empresa
            </button>
          </div>
        </div>
      </header>

      {adminView === 'company' ? (
        /* Vista de Configuración de Empresa */
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg border p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-600" />
                Configuración de Empresa
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Este contexto se aplicará a todos los agentes automáticamente.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la empresa
                  </label>
                  <input
                    type="text"
                    value={companyConfig.name}
                    onChange={e => setCompanyConfig({ ...companyConfig, name: e.target.value })}
                    placeholder="Ej: Adhoc S.A."
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industria/Rubro
                  </label>
                  <input
                    type="text"
                    value={companyConfig.industry}
                    onChange={e => setCompanyConfig({ ...companyConfig, industry: e.target.value })}
                    placeholder="Ej: Tecnología, Software, Consultoría"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción de la empresa
                </label>
                <textarea
                  value={companyConfig.description}
                  onChange={e => setCompanyConfig({ ...companyConfig, description: e.target.value })}
                  placeholder="Breve descripción de qué hace la empresa..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valores y Cultura
                </label>
                <textarea
                  value={companyConfig.values}
                  onChange={e => setCompanyConfig({ ...companyConfig, values: e.target.value })}
                  placeholder="Valores de la empresa, cultura organizacional..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contexto adicional para los agentes
                </label>
                <textarea
                  value={companyConfig.context}
                  onChange={e => setCompanyConfig({ ...companyConfig, context: e.target.value })}
                  placeholder="Información importante que todos los agentes deben conocer: políticas, procedimientos, datos relevantes..."
                  rows={5}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este texto se incluirá en el prompt de todos los agentes.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Información de contacto
                </label>
                <textarea
                  value={companyConfig.contact_info}
                  onChange={e => setCompanyConfig({ ...companyConfig, contact_info: e.target.value })}
                  placeholder="Email, teléfono, dirección, horarios de atención..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Sitio web de la empresa */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🌐 Sitio web de la empresa
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={companyConfig.website_url}
                      onChange={e => setCompanyConfig({ ...companyConfig, website_url: e.target.value })}
                      placeholder="https://www.tuempresa.com"
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <button
                      onClick={scrapeCompanyWebsite}
                      disabled={scrapingCompanyWeb || !companyConfig.website_url}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                    >
                      {scrapingCompanyWeb ? 'Scrapeando...' : 'Scrapear sitio'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Extrae información del sitio web para que los agentes conozcan mejor la empresa.
                  </p>
                </div>
                
                {companyConfig.website_content && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contenido extraído del sitio
                    </label>
                    <textarea
                      value={companyConfig.website_content}
                      onChange={e => setCompanyConfig({ ...companyConfig, website_content: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border rounded-lg font-mono text-xs bg-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Podés editar este contenido manualmente si es necesario.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={saveCompanyConfig}
                disabled={savingCompany}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingCompany ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Lista de Agentes */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-gray-700">Agentes</h2>
                <button 
                  onClick={() => setShowNewAgentForm(true)}
                  className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                  title="Agregar agente"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-1">
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedAgent?.id === agent.id 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-sm">{agent.name}</div>
                    <div className="text-xs text-gray-500">/{agent.slug}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          {selectedAgent && (
            <div className="flex-1">
              <div className="bg-white rounded-lg border">
                {/* Tabs */}
                <div className="border-b px-4">
                  <div className="flex gap-6">
                    {[
                      { id: 'config', label: 'Configuración', icon: Settings },
                      { id: 'prompt', label: 'System Prompt', icon: Edit2 },
                      { id: 'documents', label: 'Documentos RAG', icon: FileText },
                      { id: 'tools', label: 'Herramientas', icon: Wrench }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'config' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">{selectedAgent.name}</h3>
                        <button
                          onClick={() => setEditMode(!editMode)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                        >
                          {editMode ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                          {editMode ? 'Cancelar' : 'Editar'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                          <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            disabled={!editMode}
                            className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                          <input
                            type="text"
                            value={formData.slug || ''}
                            disabled
                            className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Icono</label>
                          <select
                            value={formData.icon || 'Bot'}
                            onChange={e => setFormData({ ...formData, icon: e.target.value })}
                            disabled={!editMode}
                            className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                          >
                            <optgroup label="General">
                              <option value="Bot">🤖 Bot</option>
                              <option value="Brain">🧠 Brain</option>
                              <option value="Sparkles">✨ Sparkles</option>
                              <option value="MessageSquare">💬 MessageSquare</option>
                              <option value="Lightbulb">💡 Lightbulb</option>
                              <option value="Mail">✉️ Mail</option>
                            </optgroup>
                            <optgroup label="Negocios">
                              <option value="Scale">⚖️ Scale (Legal)</option>
                              <option value="Users">👥 Users (HR)</option>
                              <option value="Briefcase">💼 Briefcase</option>
                              <option value="TrendingUp">📈 TrendingUp</option>
                              <option value="Calculator">🧮 Calculator</option>
                              <option value="ShoppingCart">🛒 ShoppingCart</option>
                            </optgroup>
                            <optgroup label="Soporte">
                              <option value="HeadphonesIcon">🎧 HeadphonesIcon</option>
                              <option value="Wrench">🔧 Wrench</option>
                              <option value="Shield">🛡️ Shield</option>
                            </optgroup>
                            <optgroup label="Educación">
                              <option value="GraduationCap">🎓 GraduationCap</option>
                              <option value="FileText">📄 FileText</option>
                              <option value="Code">💻 Code</option>
                            </optgroup>
                            <optgroup label="Otros">
                              <option value="Heart">❤️ Heart</option>
                              <option value="Globe">🌐 Globe</option>
                              <option value="Zap">⚡ Zap</option>
                            </optgroup>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                          <input
                            type="text"
                            value={formData.color || ''}
                            onChange={e => setFormData({ ...formData, color: e.target.value })}
                            disabled={!editMode}
                            className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                          <textarea
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            disabled={!editMode}
                            rows={2}
                            className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
                          />
                        </div>
                      </div>

                      {/* RAG Toggle */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">RAG Habilitado</div>
                          <div className="text-sm text-gray-500">
                            Buscar contexto relevante en documentos
                          </div>
                        </div>
                        <button onClick={toggleRag} className="text-blue-600">
                          {selectedAgent.rag_enabled 
                            ? <ToggleRight className="w-8 h-8" /> 
                            : <ToggleLeft className="w-8 h-8 text-gray-400" />
                          }
                        </button>
                      </div>

                      {editMode && (
                        <button
                          onClick={saveAgent}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Save className="w-4 h-4" />
                          Guardar cambios
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === 'prompt' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          System Prompt
                        </label>
                        <textarea
                          value={promptData.systemPrompt}
                          onChange={e => setPromptData({ ...promptData, systemPrompt: e.target.value })}
                          rows={15}
                          className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                          placeholder="Sos un asistente que..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mensaje de bienvenida
                        </label>
                        <input
                          type="text"
                          value={promptData.welcomeMessage}
                          onChange={e => setPromptData({ ...promptData, welcomeMessage: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="¡Hola! ¿En qué puedo ayudarte?"
                        />
                      </div>
                      <button
                        onClick={saveAgent}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4" />
                        Guardar prompt
                      </button>
                    </div>
                  )}

                  {activeTab === 'documents' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Documentos para RAG</h3>
                        <button
                          onClick={() => setShowNewDocForm(true)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                          Agregar documento
                        </button>
                      </div>

                      {showNewDocForm && (
                        <div className="p-4 border rounded-lg bg-white shadow-sm space-y-4">
                          {/* Tabs para tipo de input */}
                          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                            <button
                              onClick={() => setDocInputType('file')}
                              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${docInputType === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                              📁 Archivo
                            </button>
                            <button
                              onClick={() => setDocInputType('url')}
                              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${docInputType === 'url' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                              🌐 URL Web
                            </button>
                            <button
                              onClick={() => setDocInputType('manual')}
                              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${docInputType === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                              ✏️ Manual
                            </button>
                          </div>

                          {docInputType === 'url' ? (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  URL de la página web
                                </label>
                                <input
                                  type="url"
                                  value={urlInput.url}
                                  onChange={e => setUrlInput({ ...urlInput, url: e.target.value })}
                                  placeholder="https://ejemplo.com/pagina"
                                  className="w-full px-3 py-2 border rounded-lg text-sm"
                                />
                              </div>
                              
                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <input
                                  type="checkbox"
                                  id="crawl-site"
                                  checked={urlInput.crawl}
                                  onChange={e => setUrlInput({ ...urlInput, crawl: e.target.checked })}
                                  className="w-4 h-4 text-blue-600 rounded"
                                />
                                <label htmlFor="crawl-site" className="text-sm">
                                  <span className="font-medium">Crawlear sitio completo</span>
                                  <span className="text-gray-500 block text-xs">
                                    Extrae contenido de múltiples páginas del mismo dominio
                                  </span>
                                </label>
                              </div>
                              
                              {urlInput.crawl && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Máximo de páginas
                                  </label>
                                  <input
                                    type="number"
                                    value={urlInput.maxPages}
                                    onChange={e => setUrlInput({ ...urlInput, maxPages: parseInt(e.target.value) || 5 })}
                                    min={1}
                                    max={20}
                                    className="w-24 px-3 py-2 border rounded-lg text-sm"
                                  />
                                  <span className="text-xs text-gray-500 ml-2">(1-20)</span>
                                </div>
                              )}
                              
                              <button
                                onClick={scrapeUrl}
                                disabled={!urlInput.url || scrapingUrl}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                              >
                                {scrapingUrl ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    {urlInput.crawl ? 'Crawleando sitio...' : 'Extrayendo contenido...'}
                                  </>
                                ) : (
                                  <>
                                    🌐 {urlInput.crawl ? 'Crawlear sitio' : 'Extraer contenido'}
                                  </>
                                )}
                              </button>
                            </div>
                          ) : docInputType === 'file' ? (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Título (opcional)
                                </label>
                                <input
                                  type="text"
                                  value={newDocContent.title}
                                  onChange={e => setNewDocContent({ ...newDocContent, title: e.target.value })}
                                  placeholder="Se usará el nombre del archivo si está vacío"
                                  className="w-full px-3 py-2 border rounded-lg text-sm"
                                />
                              </div>
                              
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                                <input
                                  type="file"
                                  id="file-upload"
                                  accept=".pdf,.txt,.md"
                                  onChange={e => {
                                    const file = e.target.files?.[0]
                                    if (file) uploadFile(file)
                                  }}
                                  disabled={uploadingFile}
                                  className="hidden"
                                />
                                <label 
                                  htmlFor="file-upload" 
                                  className={`cursor-pointer ${uploadingFile ? 'pointer-events-none' : ''}`}
                                >
                                  {uploadingFile ? (
                                    <div className="flex flex-col items-center gap-2">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                      <span className="text-blue-600 font-medium">Procesando archivo...</span>
                                      <span className="text-xs text-gray-500">Extrayendo texto y generando embeddings</span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-2">
                                      <Upload className="w-8 h-8 text-gray-400" />
                                      <span className="text-gray-600 font-medium">
                                        Hacé clic para seleccionar un archivo
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        PDF, TXT o MD (máx 10MB)
                                      </span>
                                    </div>
                                  )}
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Título *
                                </label>
                                <input
                                  type="text"
                                  value={newDocContent.title}
                                  onChange={e => setNewDocContent({ ...newDocContent, title: e.target.value })}
                                  placeholder="Ej: Manual de procedimientos"
                                  className="w-full px-3 py-2 border rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Contenido *
                                </label>
                                <textarea
                                  value={newDocContent.content}
                                  onChange={e => setNewDocContent({ ...newDocContent, content: e.target.value })}
                                  placeholder="Pegá el contenido del documento aquí..."
                                  rows={8}
                                  className="w-full px-3 py-2 border rounded-lg text-sm"
                                />
                              </div>
                              <button
                                onClick={addDocument}
                                disabled={!newDocContent.title || !newDocContent.content}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                              >
                                <Upload className="w-4 h-4" />
                                Procesar documento
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              setShowNewDocForm(false)
                              setNewDocContent({ title: '', content: '' })
                              setUrlInput({ url: '', crawl: false, maxPages: 5 })
                            }}
                            className="w-full px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}

                      {documents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No hay documentos todavía</p>
                          <p className="text-sm">Agregá documentos para que el agente use como contexto</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {documents.map(doc => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">
                                  {doc.source_type === 'web' ? '🌐' : doc.source_type === 'file' ? '📁' : '📝'}
                                </span>
                                <div>
                                  <div className="font-medium text-sm">{doc.title}</div>
                                  <div className="text-xs text-gray-500">
                                    {doc.source_type === 'web' ? 'Web' : doc.source_type === 'file' ? 'Archivo' : 'Manual'} · {new Date(doc.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => deleteDocument(doc.id)}
                                  className="p-1.5 hover:bg-red-50 rounded text-red-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'tools' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-1">Herramientas del Agente</h3>
                        <p className="text-sm text-gray-500">
                          Habilitá las herramientas que este agente puede usar durante las conversaciones.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {AVAILABLE_TOOLS.map(tool => {
                          const agentTool = agentTools.find(at => at.tool_slug === tool.slug)
                          const isEnabled = agentTool?.enabled ?? false
                          
                          return (
                            <div 
                              key={tool.slug}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{tool.icon}</span>
                                <div>
                                  <div className="font-medium">{tool.name}</div>
                                  <div className="text-sm text-gray-500">{tool.description}</div>
                                </div>
                              </div>
                              <button 
                                onClick={() => toggleTool(tool.slug)}
                                className="text-blue-600"
                              >
                                {isEnabled 
                                  ? <ToggleRight className="w-8 h-8" /> 
                                  : <ToggleLeft className="w-8 h-8 text-gray-400" />
                                }
                              </button>
                            </div>
                          )
                        })}
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
                        <strong>💡 Tip:</strong> Cuando la búsqueda web está habilitada, el agente puede buscar 
                        información actualizada en internet cuando sea necesario para responder preguntas.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Modal para crear nuevo agente */}
      {showNewAgentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-lg">Nuevo Agente</h2>
              <button 
                onClick={() => setShowNewAgentForm(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={newAgentData.name}
                    onChange={e => setNewAgentData({ ...newAgentData, name: e.target.value })}
                    placeholder="Tuqui Ventas"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <input
                    type="text"
                    value={newAgentData.slug}
                    onChange={e => setNewAgentData({ ...newAgentData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="ventas"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icono</label>
                  <select
                    value={newAgentData.icon}
                    onChange={e => setNewAgentData({ ...newAgentData, icon: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <optgroup label="General">
                      <option value="Bot">🤖 Bot</option>
                      <option value="Brain">🧠 Brain</option>
                      <option value="Sparkles">✨ Sparkles</option>
                      <option value="Lightbulb">💡 Lightbulb</option>
                      <option value="Zap">⚡ Zap</option>
                    </optgroup>
                    <optgroup label="Negocios">
                      <option value="Scale">⚖️ Scale (Legal)</option>
                      <option value="Users">👥 Users (HR)</option>
                      <option value="Briefcase">💼 Briefcase</option>
                      <option value="TrendingUp">📈 TrendingUp (Ventas)</option>
                      <option value="ShoppingCart">🛒 ShoppingCart</option>
                      <option value="Calculator">🧮 Calculator</option>
                    </optgroup>
                    <optgroup label="Soporte">
                      <option value="HeadphonesIcon">🎧 Headphones</option>
                      <option value="MessageSquare">💬 MessageSquare</option>
                      <option value="Wrench">🔧 Wrench</option>
                      <option value="Shield">🛡️ Shield</option>
                    </optgroup>
                    <optgroup label="Educación">
                      <option value="GraduationCap">🎓 GraduationCap</option>
                      <option value="FileText">📄 FileText</option>
                      <option value="Code">💻 Code</option>
                      <option value="Globe">🌐 Globe</option>
                    </optgroup>
                    <optgroup label="Otros">
                      <option value="Heart">❤️ Heart</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <select
                    value={newAgentData.color}
                    onChange={e => setNewAgentData({ ...newAgentData, color: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="blue">Azul</option>
                    <option value="green">Verde</option>
                    <option value="purple">Violeta</option>
                    <option value="orange">Naranja</option>
                    <option value="red">Rojo</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={newAgentData.description}
                  onChange={e => setNewAgentData({ ...newAgentData, description: e.target.value })}
                  placeholder="Asistente de ventas para empresas"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                <textarea
                  value={newAgentData.systemPrompt}
                  onChange={e => setNewAgentData({ ...newAgentData, systemPrompt: e.target.value })}
                  placeholder="Eres un asistente de ventas especializado..."
                  rows={5}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Si lo dejás vacío, se generará uno básico</p>
              </div>
            </div>
            
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowNewAgentForm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={createAgent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear Agente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function seedGeneralAgent() {
  console.log('🚀 Creating General Agent in database...')

  // Verificar si ya existe
  const { data: existing } = await supabase
    .from('tuqui_agents')
    .select('id')
    .eq('slug', 'general')
    .maybeSingle()

  if (existing) {
    console.log('✅ General agent already exists with ID:', existing.id)
    return
  }

  // Crear agente (dejar que gen_random_uuid() genere el ID)
  const { data: agent, error: agentError } = await supabase
    .from('tuqui_agents')
    .insert({
      slug: 'general',
      name: 'Tuqui Chat',
      description: 'Asistente general para cualquier tarea',
      icon: 'Sparkles',
      color: 'violet',
      is_active: true,
      rag_enabled: false,
    })
    .select()
    .single()

  if (agentError) {
    console.error('❌ Error creating agent:', agentError)
    process.exit(1)
  }

  console.log('✅ General agent created:', agent.id)

  // Crear system prompt
  const { data: prompt, error: promptError } = await supabase
    .from('tuqui_prompts')
    .insert({
      agent_id: agent.id,
      version: 1,
      system_prompt: `Sos Tuqui, un asistente de IA general para empleados de la empresa.

Tu Rol:
- Ayudar con cualquier tarea o consulta del día a día
- Redactar textos, emails, documentos
- Responder preguntas generales
- Ayudar con análisis, resúmenes y organización de información
- Dar ideas y sugerencias creativas
- Explicar conceptos de forma clara

Tu Tono:
- Amigable y profesional
- Claro y conciso
- Proactivo en ofrecer ayuda adicional
- Usá "vos" (español argentino)

Capacidades:
- Redacción y corrección de textos
- Resúmenes y análisis
- Brainstorming e ideas
- Explicaciones y tutoriales
- Organización de información
- Cálculos y estimaciones básicas

Reglas:
1. Siempre ofrecé alternativas o mejoras cuando sea posible
2. Si no sabés algo, decilo honestamente
3. Usá Markdown para formatear las respuestas cuando sea útil
4. Sé conciso pero completo`,
      welcome_message: '¡Hola! Soy Tuqui, tu asistente general. ¿En qué puedo ayudarte hoy?',
      placeholder_text: 'Preguntame lo que necesites...',
      is_active: true,
    })
    .select()
    .single()

  if (promptError) {
    console.error('❌ Error creating prompt:', promptError)
    process.exit(1)
  }

  console.log('✅ Prompt created for general agent')

  // Crear features
  const features = [
    { agent_id: agent.id, name: 'Redacción y corrección', sort_order: 1 },
    { agent_id: agent.id, name: 'Análisis y resúmenes', sort_order: 2 },
    { agent_id: agent.id, name: 'Brainstorming', sort_order: 3 },
    { agent_id: agent.id, name: 'Organización', sort_order: 4 },
  ]

  const { error: featuresError } = await supabase
    .from('tuqui_features')
    .insert(features)

  if (featuresError) {
    console.error('❌ Error creating features:', featuresError)
    process.exit(1)
  }

  console.log('✅ Features created for general agent')
  console.log('\n✨ General agent is ready! You can now save chat history for it.')
}

seedGeneralAgent()

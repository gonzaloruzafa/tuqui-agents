import { supabaseAdmin } from './supabase'

export interface CompanyConfig {
  id: string
  name: string
  description: string
  industry: string
  context: string  // Contexto general que se inyecta a todos los agentes
  values: string   // Valores/cultura
  contact_info: string
  created_at: string
  updated_at: string
}

// Cache para evitar llamadas repetidas a la DB
let cachedConfig: CompanyConfig | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 60000 // 1 minuto

export async function getCompanyConfig(): Promise<CompanyConfig | null> {
  // Verificar cache
  if (cachedConfig && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedConfig
  }

  try {
    const supabase = supabaseAdmin()
    
    const { data, error } = await supabase
      .from('tuqui_company_config')
      .select('*')
      .single()

    if (error) {
      console.error('[Company] Error obteniendo config:', error)
      return null
    }

    cachedConfig = data
    cacheTimestamp = Date.now()
    return data
  } catch (error) {
    console.error('[Company] Error:', error)
    return null
  }
}

export async function updateCompanyConfig(config: Partial<CompanyConfig>): Promise<CompanyConfig | null> {
  try {
    const supabase = supabaseAdmin()
    
    // Primero verificamos si existe
    const { data: existing } = await supabase
      .from('tuqui_company_config')
      .select('id')
      .single()

    let result
    if (existing) {
      // Update
      result = await supabase
        .from('tuqui_company_config')
        .update({
          ...config,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      // Insert
      result = await supabase
        .from('tuqui_company_config')
        .insert({
          ...config,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('[Company] Error guardando config:', result.error)
      return null
    }

    // Invalidar cache
    cachedConfig = result.data
    cacheTimestamp = Date.now()
    
    return result.data
  } catch (error) {
    console.error('[Company] Error:', error)
    return null
  }
}

// Generar el contexto de empresa para inyectar en los prompts
export function generateCompanyContext(config: CompanyConfig): string {
  const parts: string[] = []
  
  if (config.name) {
    parts.push(`Trabajás para ${config.name}.`)
  }
  
  if (config.description) {
    parts.push(config.description)
  }
  
  if (config.industry) {
    parts.push(`Industria: ${config.industry}.`)
  }
  
  if (config.values) {
    parts.push(`\nValores y cultura:\n${config.values}`)
  }
  
  if (config.context) {
    parts.push(`\nContexto adicional:\n${config.context}`)
  }
  
  if (config.contact_info) {
    parts.push(`\nInformación de contacto:\n${config.contact_info}`)
  }

  if (parts.length === 0) return ''
  
  return `CONTEXTO DE LA EMPRESA:\n${parts.join('\n')}\n`
}

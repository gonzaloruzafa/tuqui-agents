import { ToolResult } from './types'
import { getCompanyConfig } from '../company'

// Interfaz para los parámetros esperados por la tool
export interface OdooToolParams {
  model: string // Ej: 'res.partner'
  domain?: any[] // Ej: [['customer', '=', true]]
  fields?: string[] // Ej: ['name', 'email']
  limit?: number
}

// Esta función debería recibir la config de Odoo (url, apiKey, db, user)
// En este ejemplo, se asume que la config viene por env vars (luego se puede leer de la base por empresa)
export async function queryOdoo(params: OdooToolParams): Promise<ToolResult> {
  // Leer config Odoo de la empresa (url, db, user)
  const companyConfig = await getCompanyConfig()
  const apiKey = process.env.ODOO_API_KEY
  if (!companyConfig || !companyConfig.odoo_url || !companyConfig.odoo_db || !companyConfig.odoo_user) {
    return { success: false, error: 'Faltan datos de Odoo en la configuración de la empresa' }
  }
  if (!apiKey) {
    return { success: false, error: 'Falta la API key de Odoo en las variables de entorno' }
  }

  const url = `${companyConfig.odoo_url}/jsonrpc`
  const body = {
    jsonrpc: '2.0',
    method: 'call',
    id: Date.now(),
    params: {
      service: 'object',
      method: 'execute_kw',
      args: [
        companyConfig.odoo_db,
        companyConfig.odoo_user,
        apiKey,
        params.model,
        'search_read',
        [params.domain || []],
        {
          fields: params.fields || [],
          limit: params.limit || 10
        }
      ]
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      return { success: false, error: `Odoo error: ${res.status}` }
    }
    const data = await res.json()
    if (data.error) {
      return { success: false, error: data.error.message }
    }
    return { success: true, data: data.result }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export const odooToolConfig = {
  slug: 'odoo',
  name: 'Odoo',
  description: 'Consultar datos de Odoo (clientes, facturas, productos, etc).',
  type: 'builtin' as const,
  parameters: [
    { name: 'model', type: 'string' as const, description: 'Modelo de Odoo (ej: res.partner)', required: true },
    { name: 'domain', type: 'array', description: 'Filtro de búsqueda (Odoo domain)', required: false },
    { name: 'fields', type: 'array', description: 'Campos a devolver', required: false },
    { name: 'limit', type: 'number', description: 'Máximo de resultados', required: false }
  ]
}

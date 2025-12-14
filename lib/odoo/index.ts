/**
 * Odoo Module Index
 * 
 * Exporta todos los componentes del módulo Odoo
 */

// Schema Layer
export {
  ODOO_MODELS,
  generateSchemaDocumentation,
  getModel,
  isValidModel,
  getValidFields,
  getModelList,
  type OdooModel,
  type OdooField
} from './schema'

// Client Layer
export {
  OdooClient,
  getOdooClient,
  invalidateOdooClientCache,
  type OdooConfig,
  type OdooSearchReadParams,
  type OdooResponse
} from './client'

// Tools Layer (Vercel AI SDK)
export {
  odooTools,
  queryOdooTool,
  countOdooTool,
  getRecordTool,
  type QueryOdooParams,
  type CountOdooParams,
  type GetRecordParams
} from './tools'

// Prompts
export {
  generateOdooSystemPrompt,
  generateOdooToolsContext
} from './prompts'

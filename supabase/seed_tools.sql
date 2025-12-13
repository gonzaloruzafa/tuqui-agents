-- Seed inicial de tools (web_search y odoo)

-- Insertar web_search tool
INSERT INTO tuqui_tools (slug, name, description, type, parameters, config, enabled, created_at, updated_at)
VALUES (
  'web_search',
  'Web Search',
  'Searches the internet using Tavily API to find up-to-date information, news, and web content.',
  'builtin',
  '[
    {
      "name": "query",
      "type": "string",
      "description": "The search query to execute",
      "required": true
    }
  ]'::jsonb,
  '{
    "env_vars": ["TAVILY_API_KEY"],
    "notes": "Requires TAVILY_API_KEY environment variable to be set in Vercel."
  }'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  parameters = EXCLUDED.parameters,
  config = EXCLUDED.config,
  updated_at = NOW();

-- Insertar odoo tool
INSERT INTO tuqui_tools (slug, name, description, type, parameters, config, enabled, created_at, updated_at)
VALUES (
  'odoo',
  'Odoo ERP',
  'Queries Odoo ERP system to fetch business data (invoices, products, customers, orders, etc.).',
  'builtin',
  '[
    {
      "name": "model",
      "type": "string",
      "description": "Odoo model name (e.g., account.move, product.product, res.partner)",
      "required": true
    },
    {
      "name": "domain",
      "type": "array",
      "description": "Search domain filters in Odoo format",
      "required": false
    },
    {
      "name": "fields",
      "type": "array",
      "description": "List of fields to retrieve",
      "required": false
    },
    {
      "name": "limit",
      "type": "number",
      "description": "Maximum number of records to return",
      "required": false
    }
  ]'::jsonb,
  '{
    "env_vars": ["ODOO_API_KEY"],
    "company_config": ["odoo_url", "odoo_db", "odoo_user"],
    "notes": "Requires ODOO_API_KEY env var and company Odoo configuration (URL, database, user)."
  }'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  parameters = EXCLUDED.parameters,
  config = EXCLUDED.config,
  updated_at = NOW();

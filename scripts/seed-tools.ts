import { createClient } from '@supabase/supabase-js'

// Usar las env vars directamente (asegurate que estén en .env.local)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zwtvnxhjypomldokssbt.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dHZueGhqeXBvbWxkb2tzc2J0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDUyNjE2MiwiZXhwIjoyMDgwMTAyMTYyfQ.E0_My45lH0xMmFvNmdjk8l9pxyEvK3gceMLfUDtUg4A'

const seedTools = async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const tools = [
    {
      slug: 'web_search',
      name: 'Web Search',
      description: 'Searches the internet using Tavily API to find up-to-date information, news, and web content.',
      type: 'builtin',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'The search query to execute',
          required: true
        }
      ],
      config: {
        env_vars: ['TAVILY_API_KEY'],
        notes: 'Requires TAVILY_API_KEY environment variable to be set in Vercel.'
      },
      enabled: true
    },
    {
      slug: 'odoo',
      name: 'Odoo ERP',
      description: 'Queries Odoo ERP system to fetch business data (invoices, products, customers, orders, etc.). IMPORTANT: Dates must be in ISO format (YYYY-MM-DD HH:MM:SS). Example: 2024-12-13 00:00:00',
      type: 'builtin',
      parameters: [
        {
          name: 'model',
          type: 'string',
          description: 'Odoo model name (e.g., sale.order for sales orders, account.move for invoices, res.partner for customers)',
          required: true
        },
        {
          name: 'domain',
          type: 'array',
          description: 'Search domain filters in Odoo format. Example: [[\'date_order\', \'>=\', \'2024-12-13 00:00:00\']]',
          required: false
        },
        {
          name: 'fields',
          type: 'array',
          description: 'List of fields to retrieve. Example: [\'name\', \'amount_total\', \'date_order\']',
          required: false
        },
        {
          name: 'limit',
          type: 'number',
          description: 'Maximum number of records to return (default: 10)',
          required: false
        }
      ],
      config: {
        env_vars: ['ODOO_API_KEY'],
        notes: 'Requires ODOO_API_KEY env var and tool config (URL, database, user). Configure in Admin → Tools → Odoo.'
      },
      enabled: true
    }
  ]

  console.log('Seeding tools...')

  for (const tool of tools) {
    const { data, error } = await supabase
      .from('tuqui_tools')
      .upsert(tool, { onConflict: 'slug' })
      .select()

    if (error) {
      console.error(`Error seeding tool ${tool.slug}:`, error)
    } else {
      console.log(`✓ Tool ${tool.slug} seeded successfully`)
    }
  }

  console.log('Done!')
  process.exit(0)
}

seedTools()

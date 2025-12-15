import { MeliPublicClient } from './lib/mercadolibre/client.ts'

const client = new MeliPublicClient()

console.log('Testing Mercado Libre API...')

try {
  const result = await client.searchItems({
    siteId: 'MLA',
    query: 'notebook',
    limit: 5
  })

  console.log('\nResult:', {
    success: result.success,
    hasData: !!result.data,
    itemCount: result.data?.items?.length || 0,
    total: result.data?.total,
    error: result.error
  })

  if (result.success && result.data) {
    console.log('\nFirst item:', {
      title: result.data.items[0]?.title,
      price: result.data.items[0]?.price,
      currency: result.data.items[0]?.currency_id
    })
  }
} catch (error) {
  console.error('Error:', error)
}

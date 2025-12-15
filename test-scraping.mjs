import { getMeliClient } from './lib/mercadolibre/client.ts'

console.log('🧪 Testing Mercado Libre Scraper\n')

const client = getMeliClient()

// Test 1: Buscar productos
console.log('📦 Test 1: Searching for "notebook"...')
try {
  const searchResult = await client.searchItems({
    siteId: 'MLA',
    query: 'notebook',
    limit: 5
  })
  
  if (searchResult.success) {
    console.log(`✅ Found ${searchResult.data.items.length} items`)
    searchResult.data.items.forEach((item, i) => {
      console.log(`   ${i+1}. ${item.title}`)
      console.log(`      Price: $${item.price} ${item.currency_id}`)
      console.log(`      ID: ${item.id}`)
      console.log(`      URL: ${item.permalink}`)
    })
  } else {
    console.log(`❌ Search failed: ${searchResult.error}`)
  }
} catch (err) {
  console.error('❌ Error:', err.message)
}

console.log('\n' + '='.repeat(60) + '\n')

// Test 2: Obtener detalle de un item (usaremos el primero del search)
console.log('🔍 Test 2: Getting item detail...')
try {
  const itemResult = await client.getItem('MLA1381407246')
  
  if (itemResult.success) {
    console.log(`✅ Item details:`)
    console.log(`   Title: ${itemResult.data.title}`)
    console.log(`   Price: $${itemResult.data.price} ${itemResult.data.currency_id}`)
    console.log(`   Condition: ${itemResult.data.condition}`)
    console.log(`   Available: ${itemResult.data.available_quantity}`)
    console.log(`   Sold: ${itemResult.data.sold_quantity}`)
    console.log(`   Free shipping: ${itemResult.data.shipping.free_shipping}`)
    console.log(`   Pictures: ${itemResult.data.pictures.length}`)
    console.log(`   Attributes: ${itemResult.data.attributes.length}`)
  } else {
    console.log(`❌ Item fetch failed: ${itemResult.error}`)
  }
} catch (err) {
  console.error('❌ Error:', err.message)
}

console.log('\n✨ Test completed!')

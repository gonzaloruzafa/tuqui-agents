# MercadoLibre Integration - Puppeteer Scraping

## ✅ Implementación Actual

**Método**: Puppeteer web scraping  
**Estado**: ✅ Funcionando perfectamente  
**Sin tokens ni autenticación requerida**

## 🎯 Funcionalidades

### Búsqueda Libre
- ✅ Búsqueda por texto libre en MercadoLibre
- ✅ Extrae hasta 20 productos por búsqueda
- ✅ Información completa de cada producto:
  - Título
  - Precio (correctamente parseado)
  - Condición (nuevo/usado)
  - Envío gratis
  - Cantidad vendida
  - Link directo al producto
  - ID del producto

### Ejemplo de Resultados
```
Búsqueda: "cortadora de pasto"
Total encontrados: 18,944 productos
Mostrando: 10 items

Precios: $85,500 - $605,386
Promedio: $313,053
```

## 🏗️ Arquitectura

### Local Development
- **Chrome**: Usa Chrome/Chromium instalado en el sistema
- **Path**: `/usr/bin/google-chrome` o `/usr/bin/chromium-browser`

### Vercel Production
- **Chrome**: Usa `@sparticuz/chromium` (optimizado para Lambda)
- **Memory**: 1024MB asignados
- **Timeout**: 60 segundos máximo
- **Costo**: ~$0.20 por 1000 búsquedas

## 🔧 Configuración

### Requisitos
```bash
npm install puppeteer-core @sparticuz/chromium
```

### Variables de entorno (opcional)
```bash
DEBUG_PUPPETEER=1  # Para guardar screenshots de debug
```

### Vercel Config
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

## 📦 Uso

### En el agente
```typescript
import { getMeliClient } from '@/lib/mercadolibre/client'

const client = getMeliClient()

const result = await client.searchItems({
  siteId: 'MLA',  // Argentina
  query: 'notebook',
  limit: 10
})

if (result.success) {
  console.log(`Encontrados: ${result.data.total} productos`)
  result.data.items.forEach(item => {
    console.log(`${item.title} - $${item.price}`)
  })
}
```

### Test local
```bash
npx tsx test-puppeteer-search.ts
```

## 🌎 Sitios Soportados

- 🇦🇷 MLA - Argentina (com.ar)
- 🇧🇷 MLB - Brasil (com.br)
- 🇲🇽 MLM - México (com.mx)
- 🇨🇱 MLC - Chile (cl)
- 🇺🇾 MLU - Uruguay (com.uy)
- 🇨🇴 MCO - Colombia (com.co)

## ⚡ Performance

- **Tiempo de búsqueda**: 3-8 segundos
- **Timeout**: 30 segundos máximo
- **Rate limit**: Sin límites (pero ser responsable)
- **Cache**: Respuestas cacheadas 5 minutos

## 🚨 Limitaciones

1. **Velocidad**: Más lento que API oficial (3-8s vs 200ms)
2. **Recursos**: Consume más memoria (1024MB)
3. **Selectores**: MercadoLibre puede cambiar el HTML
4. **Paginación**: Limitado a primeros resultados

## 🔮 Futuras Mejoras

- [ ] Agregar paginación (offset/next page)
- [ ] Cachear más agresivamente
- [ ] Scraping de detalles de producto individual
- [ ] Extracción de más metadata (reviews, seller info)
- [ ] Pool de navegadores para mayor velocidad

## 💰 Costos Estimados (Vercel Pro)

- **Búsqueda**: ~$0.0002 por request
- **1000 búsquedas/mes**: ~$0.20
- **10,000 búsquedas/mes**: ~$2.00

**Mucho más barato que servicios de scraping comerciales ($50-200/mes)**

---

**Status**: ✅ Producción ready  
**Última actualización**: Diciembre 2025

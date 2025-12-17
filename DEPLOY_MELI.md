# Deployment Guide - MercadoLibre Puppeteer Integration

## 📦 Pre-Deploy Checklist

1. **Dependencias instaladas**
   ```bash
   npm install puppeteer-core @sparticuz/chromium
   ```

2. **vercel.json configurado**
   - ✅ maxDuration: 60 segundos
   - ✅ memory: 1024MB

3. **Código limpiado**
   - ✅ Removidas referencias a tokens OAuth
   - ✅ Removido scraping simple (cheerio)
   - ✅ Solo Puppeteer como método de búsqueda

## 🚀 Deploy a Vercel

### Opción 1: CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Opción 2: GitHub
1. Push a GitHub
2. Conectar repo en vercel.com
3. Deploy automático

## ⚙️ Variables de Entorno (Vercel)

**No se requieren variables de entorno para MercadoLibre**

Las únicas variables necesarias son las que ya tienes:
- `GEMINI_API_KEY` - Para el agente AI
- `SUPABASE_URL` - Para la base de datos
- `SUPABASE_ANON_KEY` - Para Supabase

## 🧪 Testing Post-Deploy

### 1. Test de búsqueda local
```bash
npx tsx test-puppeteer-search.ts
```

### 2. Test en Vercel (después del deploy)
```bash
curl -X POST https://tu-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "mercadolibre",
    "message": "busca notebooks en mercado libre",
    "history": []
  }'
```

### 3. Test desde la UI
1. Ir a `/chat/mercadolibre`
2. Escribir: "busca cortadoras de pasto"
3. Verificar que retorna productos

## 📊 Monitoring

### Logs en Vercel
```bash
vercel logs --follow
```

Buscar:
- `[MeliClient] Initialized with Puppeteer scraping`
- `[MeliPuppeteer] Starting search for:`
- `[MeliPuppeteer] Success: Found X items`

### Errores Comunes

**Error: "Could not find Chrome"**
- Causa: @sparticuz/chromium no configurado
- Solución: Verificar que está en dependencies, no devDependencies

**Error: "Function timeout"**
- Causa: Búsqueda tarda más de 60s
- Solución: Aumentar maxDuration en vercel.json

**Error: "Out of memory"**
- Causa: Chrome consume mucha RAM
- Solución: Aumentar memory a 1536MB (plan Pro requerido)

## 🔧 Troubleshooting

### Debug local con screenshot
```bash
DEBUG_PUPPETEER=1 npx tsx test-puppeteer-search.ts
# Ver screenshot en: /tmp/meli-debug.png
```

### Check de recursos
```javascript
// En el código, agregar logs:
console.log('Memory usage:', process.memoryUsage())
console.log('Time elapsed:', Date.now() - startTime)
```

## 📈 Optimizaciones

### Reducir tiempo de respuesta
1. **Cache agresivo**: Respuestas cacheadas 10 minutos
2. **Límite de items**: Max 10-15 items por búsqueda
3. **Reuse browser**: Pool de navegadores (próxima versión)

### Reducir costos
1. **Cache**: Evitar búsquedas repetidas
2. **Lazy loading**: Solo buscar cuando sea necesario
3. **Batch requests**: Agrupar múltiples búsquedas

## 🎯 Performance Targets

- ✅ **Tiempo de respuesta**: < 8 segundos
- ✅ **Success rate**: > 95%
- ✅ **Memory usage**: < 1GB
- ✅ **Cost per search**: < $0.001

## 🔄 Updates

Para actualizar después de cambios:
```bash
git add .
git commit -m "Update MercadoLibre integration"
git push
# Deploy automático en Vercel
```

## 📞 Support

Si hay problemas:
1. Check logs en Vercel dashboard
2. Test local primero: `npx tsx test-puppeteer-search.ts`
3. Verificar que Chrome está instalado localmente
4. Revisar MELI_STATUS.md para limitaciones conocidas

---

**Ready to deploy!** 🚀

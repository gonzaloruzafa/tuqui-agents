/**
 * Test de contexto conversacional para el agente Odoo
 * Usa Google Native SDK directamente (no AI SDK)
 */
import 'dotenv-flow/config'
import { GoogleGenerativeAI, Content } from '@google/generative-ai'
import { generateOdooSystemPrompt } from '../lib/odoo/prompts'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface Message {
  role: 'user' | 'assistant'
  content: string
}

async function chat(message: string, history: Message[] = []): Promise<{ response: string, history: Message[] }> {
  const MAX_HISTORY = 20
  const recentHistory = history.slice(-MAX_HISTORY)
  
  // Convertir historial a formato Google
  const googleHistory: Content[] = recentHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))
  
  // Detectar si necesita contexto
  const contextualKeywords = [
    'desglosame', 'desglosa', 'por vendedor', 'por producto', 'por mes', 'por cliente',
    'el primero', 'el segundo', 'el tercero', 'el cuarto', 'el quinto',
    'ese', 'esa', 'eso', 'esos', 'esas', 'este', 'esta',
    'dale', 'pasame', 'mostrá', 'mostrame',
    'pero', 'no,', 'digo', 'digo,', 'quiero decir',
    'y de', 'y los', 'y las', 'también',
    'más detalle', 'detallame', 'expandí', 'ampliá'
  ]
  const messageLower = message.toLowerCase()
  const needsContext = contextualKeywords.some(kw => messageLower.includes(kw)) || message.length < 30
  
  let enhancedMessage = message
  if (needsContext && recentHistory.length > 0) {
    const lastExchanges = recentHistory.slice(-4)
    const contextSummary = lastExchanges.map(m => `${m.role}: ${m.content.substring(0, 300)}`).join('\n')
    
    enhancedMessage = `[CONTEXTO DE CONVERSACIÓN RECIENTE - USALO PARA ENTENDER MI PEDIDO]
${contextSummary}

[MI MENSAJE ACTUAL]
${message}

Nota: Si mi mensaje es corto o hace referencia a algo anterior (como "desglosame", "el segundo", "por vendedor"), usá el contexto de arriba para entender qué quiero. Respondé directamente SIN pedir clarificación si el contexto es suficiente.`
  }
  
  const systemPrompt = generateOdooSystemPrompt()
  
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt
  })
  
  try {
    const chat = model.startChat({ history: googleHistory })
    const result = await chat.sendMessage(enhancedMessage)
    const responseText = result.response.text()
    
    const newHistory = [
      ...history,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: responseText }
    ]
    
    return { response: responseText, history: newHistory }
  } catch (error: any) {
    console.error('Error:', error.message)
    return { response: `Error: ${error.message}`, history }
  }
}

async function runTest() {
  console.log('\n🧪 Test de Contexto Conversacional\n')
  console.log('=' .repeat(60))
  
  let history: Message[] = []
  
  // Test 1: Pregunta inicial
  console.log('\n📝 Pregunta 1: "dame las ventas de abril 2025"')
  const r1 = await chat('dame las ventas de abril 2025', history)
  console.log('🤖 Respuesta:', r1.response.substring(0, 200) + '...')
  history = r1.history
  
  // Test 2: Desglosame (DEBE usar contexto)
  console.log('\n📝 Pregunta 2: "desglosame por vendedor"')
  const r2 = await chat('desglosame por vendedor', history)
  console.log('🤖 Respuesta:', r2.response.substring(0, 300) + '...')
  history = r2.history
  
  // Verificar si entendió el contexto
  const entendioContexto = r2.response.toLowerCase().includes('vendedor') && 
                          !r2.response.toLowerCase().includes('clarif')
  console.log(entendioContexto ? '✅ ENTENDIÓ el contexto' : '❌ NO entendió el contexto')
  
  // Test 3: Referencia ordinal
  console.log('\n📝 Pregunta 3: "el segundo?"')
  const r3 = await chat('el segundo?', history)
  console.log('🤖 Respuesta:', r3.response.substring(0, 200) + '...')
  history = r3.history
  
  // Test 4: Corrección
  console.log('\n📝 Pregunta 4: "pero sin el vendedor sin asignar"')
  const r4 = await chat('pero sin el vendedor sin asignar', history)
  console.log('🤖 Respuesta:', r4.response.substring(0, 300) + '...')
  
  console.log('\n' + '=' .repeat(60))
  console.log('Test completado!')
}

runTest().catch(console.error)

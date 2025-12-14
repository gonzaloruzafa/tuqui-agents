/**
 * Odoo Agent Chat API
 * 
 * Endpoint de chat especializado para el agente Odoo usando Vercel AI SDK.
 * Implementa el patrón Text-to-Odoo-Domain con function calling.
 * 
 * Características:
 * - Streaming de respuestas
 * - Multi-step reasoning con stopWhen
 * - Tools tipadas con Zod
 * - Schema semántico inyectado
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, CoreMessage, stepCountIs } from 'ai'
import { NextRequest } from 'next/server'
import { odooTools, generateOdooSystemPrompt } from '@/lib/odoo'

// Configuración del provider con la API key de Gemini
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || ''
})

// Configuración del modelo
const model = google('gemini-2.0-flash-exp')

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generar system prompt con schema y fecha actual
    const systemPrompt = generateOdooSystemPrompt()

    // Convertir mensajes al formato de Vercel AI SDK
    const coreMessages: CoreMessage[] = messages.map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))

    // Stream con tools y multi-step
    const result = streamText({
      model,
      system: systemPrompt,
      messages: coreMessages,
      tools: odooTools,
      // Permite hasta 5 pasos de razonamiento multi-turno
      stopWhen: stepCountIs(5),
      temperature: 0.3, // Más determinístico para consultas de datos
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        // Log para debugging
        if (toolCalls && toolCalls.length > 0) {
          console.log('[OdooAgent] Tool calls:', toolCalls.map(t => t.toolName))
        }
        if (toolResults && toolResults.length > 0) {
          console.log('[OdooAgent] Tool results received')
        }
      }
    })

    // Devolver stream compatible con useChat de Vercel AI SDK
    return result.toUIMessageStreamResponse()

  } catch (error: any) {
    console.error('[OdooAgent] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

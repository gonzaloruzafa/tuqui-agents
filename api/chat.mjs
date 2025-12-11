import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuración de agentes
const agentConfigs = {
  'tuqui-legal': {
    name: 'Tuqui Legal',
    systemPrompt: `
Eres Tuqui Legal, un asistente de asesoramiento legal especializado para empresas argentinas.

**Tu Rol:**
- Asistente legal que ayuda a entender documentos, contratos y normativas
- NO sos abogado ni das asesoramiento legal vinculante
- Siempre aclarás que tus respuestas son orientativas y que deben consultar con un profesional para decisiones importantes

**Tu Tono:**
- Profesional pero accesible
- Claro y didáctico al explicar términos legales
- Empático con las preocupaciones del usuario
- Usá "vos" (español argentino)

**Tu Conocimiento:**
- Derecho laboral argentino (LCT, convenios colectivos)
- Contratos comerciales
- Normativas de privacidad y datos (Ley 25.326)
- Compliance empresarial
- Sociedades comerciales
- Normativas fiscales básicas

**Reglas Importantes:**
1. Siempre aclarás que no sos abogado y que tus respuestas son orientativas
2. Ante casos complejos, recomendás consultar con un profesional
3. Usás lenguaje claro, evitando jerga legal innecesaria
4. Si no tenés información suficiente, lo decís claramente
5. Citás las fuentes cuando te basás en documentos específicos

**Formato de Respuesta:**
- Usá Markdown para formatear
- Sé conciso pero completo
- Incluí ejemplos prácticos cuando sea útil
- Estructurá la información con bullets y secciones
`
  },
  'tuqui-hr': {
    name: 'Tuqui HR',
    systemPrompt: `
Eres Tuqui HR, un asistente de Recursos Humanos diseñado para ayudar a empleados y managers.

**Tu Rol:**
- Facilitador del proceso de onboarding
- Fuente de información sobre políticas de la empresa
- Guía para trámites y procesos de RRHH
- Punto de contacto amigable para consultas laborales

**Tu Tono:**
- Cálido y acogedor
- Paciente y comprensivo
- Profesional pero cercano
- Usá "vos" (español argentino)

**Tu Conocimiento:**
- Procesos de onboarding
- Políticas internas de la empresa
- Beneficios y compensaciones
- Licencias y vacaciones
- Evaluaciones de desempeño
- Normativas laborales básicas de Argentina

**Capacidades:**
- Responder consultas sobre políticas
- Guiar en procesos de RRHH
- Explicar beneficios disponibles
- Orientar sobre trámites internos

**Reglas Importantes:**
1. Sé empático, especialmente con empleados nuevos
2. Si no tenés la información, indicá a quién contactar (RRHH)
3. Mantené la confidencialidad de información sensible
4. Derivá casos complejos al equipo de RRHH humano
5. Celebrá los logros y bienvenidas 🎉

**Formato de Respuesta:**
- Usá Markdown para formatear
- Sé claro y paso a paso en procesos
- Incluí links o referencias cuando sea útil
- Usá emojis con moderación para ser amigable 👋
`
  }
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId, message, history = [] } = req.body;

  if (!agentId || !message) {
    return res.status(400).json({ error: 'Missing agentId or message' });
  }

  const agentConfig = agentConfigs[agentId];
  if (!agentConfig) {
    return res.status(400).json({ error: 'Agent not found' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Construir historial para el chat
    const chatHistory = [
      {
        role: "user",
        parts: [{ text: agentConfig.systemPrompt }],
      },
      {
        role: "model",
        parts: [{ text: `Entendido. Soy ${agentConfig.name}. ¿En qué puedo ayudarte hoy?` }],
      },
    ];

    // Agregar historial previo de la conversación
    for (const msg of history) {
      chatHistory.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    const chat = model.startChat({ history: chatHistory });

    // TODO: Aquí se agregaría contexto de PDFs/documentos si están disponibles
    const contextNote = '';
    
    const promptWithContext = contextNote 
      ? `${contextNote}\n\nPregunta del usuario:\n${message}`
      : message;

    const result = await chat.sendMessage(promptWithContext);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ text });
    
  } catch (error) {
    console.error("Error in chat API:", error);
    return res.status(500).json({ 
      error: 'Error processing request',
      details: error.message 
    });
  }
}

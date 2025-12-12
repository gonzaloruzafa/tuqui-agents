import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de agentes
const agentConfigs = {
  'tuqui-legal': {
    name: 'Tuqui Legal',
    systemPrompt: `Eres Tuqui Legal, un asistente de asesoramiento legal especializado para empresas argentinas.

**Tu Rol:**
- Asistente legal que ayuda a entender documentos, contratos y normativas
- NO sos abogado ni das asesoramiento legal vinculante
- Siempre aclarás que tus respuestas son orientativas

**Tu Tono:**
- Profesional pero accesible
- Claro y didáctico
- Usá "vos" (español argentino)

**Formato de Respuesta:**
- Usá Markdown para formatear
- Sé conciso pero completo`
  },
  'tuqui-hr': {
    name: 'Tuqui HR',
    systemPrompt: `Eres Tuqui HR, un asistente de Recursos Humanos.

**Tu Rol:**
- Facilitador del proceso de onboarding
- Fuente de información sobre políticas de la empresa
- Guía para trámites y procesos de RRHH

**Tu Tono:**
- Cálido y acogedor
- Profesional pero cercano
- Usá "vos" (español argentino)

**Formato de Respuesta:**
- Usá Markdown para formatear
- Sé claro y paso a paso`
  }
};

app.post('/api/chat', async (req, res) => {
  const { agentId, message, history = [] } = req.body;

  if (!agentId || !message) {
    return res.status(400).json({ error: 'Missing agentId or message' });
  }

  const agentConfig = agentConfigs[agentId];
  if (!agentConfig) {
    return res.status(400).json({ error: 'Agent not found' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY in .env.local' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const chatHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: agentConfig.systemPrompt }] },
        { role: 'model', parts: [{ text: `Entendido. Soy ${agentConfig.name} y seguiré estas instrucciones.` }] },
        ...chatHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Error al procesar la solicitud' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
  console.log(`   POST /api/chat`);
});

import { marked } from 'marked';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const sendMessageToAgent = async (
  agentId: string, 
  message: string, 
  history: Message[]
): Promise<string> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api/chat';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId,
        message,
        history: history.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    const data = await response.json();
    
    // Convertir markdown a HTML
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
    
    return marked.parse(data.text || data.response || '');
  } catch (error: any) {
    console.error('Error calling chat API:', error);
    throw new Error(error.message || 'Error al comunicarse con el agente');
  }
};

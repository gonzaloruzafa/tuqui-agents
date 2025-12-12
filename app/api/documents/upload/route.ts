import { NextRequest, NextResponse } from 'next/server'
import { addDocument } from '@/lib/rag'
// @ts-ignore - pdf-parse types issue
import pdfParse from 'pdf-parse'

// Extraer texto de PDF
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const agentId = formData.get('agentId') as string
    const title = formData.get('title') as string

    if (!file || !agentId) {
      return NextResponse.json(
        { error: 'Missing file or agentId' },
        { status: 400 }
      )
    }

    // Leer el archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    let content: string
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.pdf')) {
      // Extraer texto del PDF
      content = await extractTextFromPDF(buffer)
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      // Archivo de texto plano
      content = buffer.toString('utf-8')
    } else {
      return NextResponse.json(
        { error: 'Formato no soportado. Use PDF, TXT o MD.' },
        { status: 400 }
      )
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'No se pudo extraer contenido del archivo' },
        { status: 400 }
      )
    }

    // Usar el título proporcionado o el nombre del archivo
    const docTitle = title || file.name.replace(/\.[^/.]+$/, '')

    // Agregar documento con RAG
    const doc = await addDocument(
      agentId, 
      docTitle, 
      content, 
      'file',
      file.name
    )
    
    return NextResponse.json({
      ...doc,
      extractedLength: content.length
    })
  } catch (error: any) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: error.message || 'Error procesando archivo' },
      { status: 500 }
    )
  }
}

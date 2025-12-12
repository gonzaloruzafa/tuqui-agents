import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { addDocument } from '@/lib/rag'

// GET - Listar documentos de un agente
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')

  if (!agentId) {
    return NextResponse.json(
      { error: 'Missing agentId' },
      { status: 400 }
    )
  }

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('tuqui_documents')
    .select('id, title, source_type, source_url, created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

// POST - Agregar documento
export async function POST(request: NextRequest) {
  try {
    const { agentId, title, content, sourceType, sourceUrl } = await request.json()

    if (!agentId || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const doc = await addDocument(agentId, title, content, sourceType, sourceUrl)
    
    return NextResponse.json(doc)
  } catch (error: any) {
    console.error('Error adding document:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar documento
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('id')

  if (!documentId) {
    return NextResponse.json(
      { error: 'Missing document id' },
      { status: 400 }
    )
  }

  const supabase = supabaseAdmin()
  
  // Los chunks se eliminan automáticamente por ON DELETE CASCADE
  const { error } = await supabase
    .from('tuqui_documents')
    .delete()
    .eq('id', documentId)

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

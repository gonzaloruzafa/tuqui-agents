import { NextRequest, NextResponse } from 'next/server'
import { getCompanyConfig, updateCompanyConfig } from '@/lib/company'

// GET - Obtener configuración de empresa
export async function GET() {
  try {
    const config = await getCompanyConfig()
    return NextResponse.json(config || {})
  } catch (error: any) {
    console.error('Company config API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Actualizar configuración de empresa
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    
    const config = await updateCompanyConfig({
      name: data.name,
      description: data.description,
      industry: data.industry,
      context: data.context,
      values: data.values,
      contact_info: data.contact_info
    })

    if (!config) {
      return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
    }

    return NextResponse.json(config)
  } catch (error: any) {
    console.error('Company config API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

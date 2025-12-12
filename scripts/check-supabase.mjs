// Script para ejecutar el schema en Supabase
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = 'https://zwtvnxhjypomldokssbt.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está definida')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Creando tablas en Supabase...\n')

  try {
    // 1. Crear tabla agents
    console.log('📦 Creando tabla agents...')
    let { error } = await supabase.from('agents').select('id').limit(1)
    
    if (error && error.code === '42P01') {
      // Tabla no existe, necesitamos crearla via SQL Editor
      console.log('⚠️  Las tablas no existen. Necesitas ejecutar el schema manualmente.')
      console.log('   Ve a: https://supabase.com/dashboard/project/zwtvnxhjypomldokssbt/sql')
      console.log('   Y pega el contenido de: supabase/schema.sql')
      return
    }
    
    if (!error) {
      console.log('✅ Tabla agents ya existe')
    }

    // Verificar si hay datos
    const { data: agents } = await supabase.from('agents').select('*')
    console.log(`\n📊 Agentes encontrados: ${agents?.length || 0}`)
    
    if (agents && agents.length > 0) {
      console.log('\nAgentes:')
      agents.forEach(a => console.log(`  - ${a.name} (${a.slug})`))
    }

    console.log('\n✅ Conexión a Supabase verificada!')

  } catch (err) {
    console.error('❌ Error:', err)
  }
}

runMigration()

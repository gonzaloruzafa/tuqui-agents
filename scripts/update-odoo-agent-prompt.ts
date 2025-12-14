import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateOdooAgentPrompt() {
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];
  
  // Primero, asegurar que existe el agente Odoo
  const { data: existingAgent } = await supabase
    .from('tuqui_agents')
    .select('id')
    .eq('slug', 'odoo')
    .maybeSingle();

  let agentId: string;

  if (!existingAgent) {
    console.log('Creating Odoo agent...');
    const { data: newAgent, error: createError } = await supabase
      .from('tuqui_agents')
      .insert({
        slug: 'odoo',
        name: 'Odoo ERP',
        description: 'Experto en consultas al sistema Odoo ERP',
        icon: '🟣',
        color: 'purple',
        is_active: true,
        rag_enabled: false
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating Odoo agent:', createError);
      process.exit(1);
    }

    agentId = newAgent.id;
    console.log('✅ Odoo agent created');
  } else {
    agentId = existingAgent.id;
    console.log('Odoo agent already exists');
  }
  
  const systemPrompt = `Eres un experto en Odoo ERP con acceso directo a la base de datos a través de la API JSON-RPC.

IMPORTANTE - FECHAS Y HORAS:
- Fecha actual: ${todayISO} (hoy es ${today.getDate()} de ${today.toLocaleString('es', { month: 'long' })} de ${today.getFullYear()})
- SIEMPRE usa formato ISO: YYYY-MM-DD HH:MM:SS
- Para "hoy": usa ${todayISO} 00:00:00 hasta ${todayISO} 23:59:59
- Para "esta semana": calcula el lunes de la semana actual hasta el domingo
- Para "este mes": usa día 1 del mes actual hasta el último día del mes
- NO uses términos como "hoy", "ayer", "esta semana" en las queries - siempre convierte a fechas ISO

MODELOS PRINCIPALES:

1. sale.order (Órdenes de venta)
   - Estados: state='sale' (confirmada), state='done' (completada), state='draft' (borrador), state='cancel' (cancelada)
   - Fechas: date_order (fecha de orden), create_date (fecha de creación)
   - Campos: id, name, partner_id, amount_total, state, date_order
   - IMPORTANTE: Para ventas confirmadas, SIEMPRE incluye [['state', 'in', ['sale', 'done']]]

2. sale.order.line (Líneas/productos de una orden de venta)
   - Relación: order_id → sale.order.id (ID de la orden de venta)
   - Campos: id, order_id, product_id, name, product_uom_qty (cantidad), price_unit, price_subtotal
   - Para ver productos de una orden: [['order_id', '=', ID_DE_ORDEN]]
   - IMPORTANTE: El campo product_id devuelve [ID, "Nombre"] - usa solo el ID para consultas adicionales

3. product.product (Productos)
   - Campos: id, name, default_code, list_price, qty_available, categ_id
   - Para buscar por ID: [['id', '=', PRODUCT_ID]]
   
4. res.partner (Clientes/Contactos)
   - Campos: id, name, email, phone, vat, customer_rank, supplier_rank
   - Para buscar por ID: [['id', '=', PARTNER_ID]]

5. account.move (Facturas)
   - Estados: state='posted' (publicada), state='draft' (borrador)
   - Tipos: move_type='out_invoice' (factura cliente), 'out_refund' (nota crédito)
   - Campos: id, name, invoice_date, amount_total, partner_id, state, move_type

TIPS PARA QUERIES EFECTIVAS:
- Para ventas confirmadas: SIEMPRE incluye [['state', 'in', ['sale', 'done']]]
- Para facturas validadas: usa [['state', '=', 'posted'], ['move_type', '=', 'out_invoice']]
- Para filtrar por fecha: usa [['campo_fecha', '>=', 'FECHA_INICIO'], ['campo_fecha', '<=', 'FECHA_FIN']]
- limit=10 por defecto (si el usuario no especifica, usa 10)
- Usa fields=['campo1', 'campo2'] para seleccionar solo los campos necesarios
- Para búsquedas por texto: usa [['name', 'ilike', '%texto%']]

WORKFLOW PARA CONSULTAS COMPLEJAS:

Ejemplo 1 - "¿Qué productos se vendieron en la orden S00066?"
1. Buscar la orden: model='sale.order', domain=[['name', '=', 'S00066']], fields=['id', 'name']
2. Con el ID de la orden (ej: 64), buscar líneas: model='sale.order.line', domain=[['order_id', '=', 64]], fields=['product_id', 'name', 'product_uom_qty', 'price_unit']
3. Interpretar resultado: product_id devuelve [ID, "Nombre"], product_uom_qty es la cantidad vendida

Ejemplo 2 - "¿Cuál fue el producto más vendido hoy?"
1. Buscar órdenes de hoy: model='sale.order', domain=[['date_order', '>=', 'HOY 00:00:00'], ['date_order', '<=', 'HOY 23:59:59'], ['state', 'in', ['sale', 'done']]]
2. Obtener IDs de órdenes
3. Por cada ID, consultar sale.order.line para sumar cantidades por producto

Ejemplo 3 - "¿Qué cliente compró más este mes?"
1. Buscar órdenes del mes: model='sale.order', domain con rango de fechas del mes + state confirmado
2. Analizar partner_id (cliente) y amount_total para identificar el de mayor compra
3. Si es necesario, consultar res.partner con el partner_id para obtener más datos del cliente

CHECKLIST ANTES DE CADA QUERY:
1. ¿Convertí las fechas relativas a formato ISO? (YYYY-MM-DD HH:MM:SS)
2. ¿Incluí el filtro de estado correcto? (sale/done para ventas, posted para facturas)
3. ¿Seleccioné los campos que necesito mostrar?
4. ¿El limit es apropiado para la consulta?
5. ¿Necesito hacer queries relacionadas? (ej: orden → líneas → productos)

IMPORTANTE SOBRE QUERIES MÚLTIPLES:
Actualmente solo puedo ejecutar UNA query por vez. Si necesito información de múltiples tablas:
- Primero hago la query principal (ej: buscar la orden)
- Analizo el resultado y obtengo los IDs necesarios
- Luego hago una segunda query con esos IDs (ej: buscar líneas de esa orden)
- Explico al usuario el proceso paso a paso

Responde siempre en español y explica los resultados de forma clara. Si no hay resultados, sugiere verificar los filtros de estado y fechas.`;

  // Obtener el último número de versión
  const { data: latestPrompt } = await supabase
    .from('tuqui_prompts')
    .select('version')
    .eq('agent_id', agentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const newVersion = latestPrompt ? latestPrompt.version + 1 : 1;

  // Desactivar prompts anteriores
  await supabase
    .from('tuqui_prompts')
    .update({ is_active: false })
    .eq('agent_id', agentId);

  // Insertar nuevo prompt activo
  const { data, error } = await supabase
    .from('tuqui_prompts')
    .insert({
      agent_id: agentId,
      system_prompt: systemPrompt,
      welcome_message: '¡Hola! Soy tu asistente de Odoo ERP. Puedo ayudarte a consultar ventas, productos, facturas y más.',
      placeholder_text: 'Pregunta sobre ventas, productos, clientes...',
      version: newVersion,
      is_active: true
    })
    .select();

  if (error) {
    console.error('Error updating agent prompt:', error);
    process.exit(1);
  }

  console.log('✅ Odoo agent prompt updated successfully');
  console.log('New prompt version:', data[0].version);
  
  // Habilitar la tool de odoo para este agente
  const { error: toolError } = await supabase
    .from('tuqui_agent_tools')
    .upsert({
      agent_id: agentId,
      tool_slug: 'odoo',
      enabled: true
    }, {
      onConflict: 'agent_id,tool_slug'
    });

  if (toolError) {
    console.error('Error enabling Odoo tool:', toolError);
  } else {
    console.log('✅ Odoo tool enabled for agent');
  }
}

updateOdooAgentPrompt();

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cliente con service_role — vive seguro aquí en el servidor
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extraer el usuario que hace la petición del JWT
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(token)

    const { dni, nombre_completo, correo, password, cargo, rol_id, especialidad_id, obra_id, es_admin, es_gerencia } = await req.json()

    // 1. Crear en auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: correo,
      password: password,
      email_confirm: true,
    })

    if (authError) throw authError

    // 2. Insertar en tabla usuarios
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authData.user.id,
        dni,
        nombre_completo,
        correo,
        cargo: cargo || null,
        rol_id: rol_id || null,
        especialidad_id: especialidad_id || null,
        obra_id: obra_id || null,
        es_admin: es_admin || false,
        es_gerencia: es_gerencia || false,
        creado_por: adminUser?.id || null,
        activo: true,
      })

    if (dbError) throw dbError

    return new Response(
      JSON.stringify({ id: authData.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's integration config to retrieve Velaris token
    const { data: config, error: configError } = await supabase
      .from('integration_configs')
      .select('velaris_token_encrypted')
      .eq('user_id', user.id)
      .single();

    if (configError || !config?.velaris_token_encrypted) {
      throw new Error('Velaris token not found. Please configure your integration first.');
    }

    console.log('Fetching activity types from Velaris API');

    // Fetch activity types from Velaris API
    const response = await fetch('https://ua4t4so3ba.execute-api.eu-west-2.amazonaws.com/prod/activity-type', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.velaris_token_encrypted}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Velaris API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw Velaris response:', JSON.stringify(data, null, 2));

    // Filter for active types and map to expected format
    const activeTypes = data.data?.filter((type: any) => type.isActive) || [];
    
    const mappedTypes = activeTypes.map((type: any) => ({
      id: type.activityTypeId,
      name: type.displayName,
      description: type.description,
      iconName: type.iconName
    }));

    console.log('Mapped activity types:', mappedTypes);

    return new Response(JSON.stringify(mappedTypes), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching activity types:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
};

serve(handler);

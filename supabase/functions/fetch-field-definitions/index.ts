
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

    console.log('Fetching integration config for user:', user.id);

    // Get user's integration config to retrieve Velaris token
    const { data: config, error: configError } = await supabase
      .from('integration_configs')
      .select('velaris_token_encrypted')
      .eq('user_id', user.id)
      .single();

    if (configError || !config?.velaris_token_encrypted) {
      throw new Error('Velaris token not found. Please configure your integration first.');
    }

    console.log('Making separate API calls to Velaris for organisation and account fields');
    
    const headers = {
      'Authorization': `Bearer ${config.velaris_token_encrypted}`,
      'Content-Type': 'application/json',
    };

    async function fetchFor(entityType: string) {
      const url = `https://ua4t4so3ba.execute-api.eu-west-2.amazonaws.com/prod/csm/v1/bfp/field-definitions?entityType=${entityType}`;
      console.log(`Fetching ${entityType} fields from:`, url);
      
      const res = await fetch(url, { method: 'GET', headers });

      console.log(`${entityType} API response status:`, res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.log(`${entityType} API error response:`, errorText);
        throw new Error(`Failed to fetch ${entityType} fields: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      console.log(`${entityType} fields response:`, JSON.stringify(json, null, 2));
      
      return (json.data || []).map((field: any) => ({
        name: field.fieldName || field.name || field.id,
        label: field.displayName || field.label || field.fieldName || field.name || field.id,
        entity_type: entityType, // needed by frontend filter logic
      }));
    }

    // Fetch both entity types
    const organisationFields = await fetchFor("organisation");
    const accountFields = await fetchFor("account");

    // Combine the results
    const allFields = [...organisationFields, ...accountFields];

    // If we still don't have any field definitions, provide some common defaults
    if (allFields.length === 0) {
      console.log('No field definitions found in responses, using defaults');
      const defaultFields = [
        { name: "name", label: "Name", entity_type: "organisation" },
        { name: "external_id", label: "External ID", entity_type: "organisation" },
        { name: "crm_id", label: "CRM ID", entity_type: "organisation" },
        { name: "parent_company", label: "Parent Company", entity_type: "organisation" },
        { name: "name", label: "Name", entity_type: "account" },
        { name: "external_id", label: "External ID", entity_type: "account" },
        { name: "custom_account_id", label: "Custom Account ID", entity_type: "account" }
      ];
      allFields.push(...defaultFields);
    }

    console.log('Final merged field definitions:', JSON.stringify(allFields, null, 2));

    return new Response(JSON.stringify(allFields), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching field definitions:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
};

serve(handler);

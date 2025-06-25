
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

    console.log('Fetching field definitions from Velaris API');
    
    // Call Velaris API using the user's token
    const fieldDefinitionsUrl = 'https://ua4t4so3ba.execute-api.eu-west-2.amazonaws.com/prod/field-definitions?entityType=organisation,account';
    console.log('Calling URL:', fieldDefinitionsUrl);
    
    const response = await fetch(fieldDefinitionsUrl, {
      headers: {
        'Authorization': `Bearer ${config.velaris_token_encrypted}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response body:', errorText);
      
      throw new Error(`Velaris API error: ${response.status} ${response.statusText}. Response: ${errorText}`);
    }

    const data = await response.json();
    console.log('Raw Velaris field definitions response:', JSON.stringify(data, null, 2));

    // Transform the response to match our expected format
    const fieldDefinitions = [];
    
    // Handle the expected response format from Velaris
    if (data.data) {
      // Handle organisation fields
      if (data.data.organisation && Array.isArray(data.data.organisation)) {
        data.data.organisation.forEach((field: any) => {
          fieldDefinitions.push({
            name: field.fieldName || field.name,
            label: field.displayName || field.label || field.fieldName || field.name,
            entity_type: 'organisation'
          });
        });
      }
      
      // Handle account fields
      if (data.data.account && Array.isArray(data.data.account)) {
        data.data.account.forEach((field: any) => {
          fieldDefinitions.push({
            name: field.fieldName || field.name,
            label: field.displayName || field.label || field.fieldName || field.name,
            entity_type: 'account'
          });
        });
      }
    }

    // Handle alternative response formats
    if (data.organisation?.fields) {
      data.organisation.fields.forEach((field: string) => {
        fieldDefinitions.push({
          name: field,
          label: field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '),
          entity_type: 'organisation'
        });
      });
    }
    
    if (data.account?.fields) {
      data.account.fields.forEach((field: string) => {
        fieldDefinitions.push({
          name: field,
          label: field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '),
          entity_type: 'account'
        });
      });
    }

    // If we still don't have any field definitions, provide some common defaults
    if (fieldDefinitions.length === 0) {
      console.log('No field definitions found in response, using defaults');
      const defaultFields = [
        { name: "name", label: "Name", entity_type: "organisation" },
        { name: "external_id", label: "External ID", entity_type: "organisation" },
        { name: "crm_id", label: "CRM ID", entity_type: "organisation" },
        { name: "parent_company", label: "Parent Company", entity_type: "organisation" },
        { name: "name", label: "Name", entity_type: "account" },
        { name: "external_id", label: "External ID", entity_type: "account" },
        { name: "custom_account_id", label: "Custom Account ID", entity_type: "account" }
      ];
      fieldDefinitions.push(...defaultFields);
    }

    console.log('Mapped field definitions:', fieldDefinitions);

    return new Response(JSON.stringify(fieldDefinitions), {
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

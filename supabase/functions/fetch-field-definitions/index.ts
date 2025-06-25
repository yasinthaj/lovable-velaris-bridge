
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
    
    const baseUrl = 'https://ua4t4so3ba.execute-api.eu-west-2.amazonaws.com/prod/csm/v1/bfp/field-definitions';
    const headers = {
      'Authorization': `Bearer ${config.velaris_token_encrypted}`,
      'Content-Type': 'application/json',
    };

    // Make separate API calls for organisation and account
    const [orgResponse, accountResponse] = await Promise.all([
      fetch(`${baseUrl}?entityType=organisation`, { headers }),
      fetch(`${baseUrl}?entityType=account`, { headers })
    ]);

    console.log('Organisation API response status:', orgResponse.status);
    console.log('Account API response status:', accountResponse.status);

    // Check if both requests were successful
    if (!orgResponse.ok) {
      const orgErrorText = await orgResponse.text();
      console.log('Organisation API error response:', orgErrorText);
      throw new Error(`Velaris API error for organisation: ${orgResponse.status} ${orgResponse.statusText}`);
    }

    if (!accountResponse.ok) {
      const accountErrorText = await accountResponse.text();
      console.log('Account API error response:', accountErrorText);
      throw new Error(`Velaris API error for account: ${accountResponse.status} ${accountResponse.statusText}`);
    }

    // Parse responses
    const orgData = await orgResponse.json();
    const accountData = await accountResponse.json();

    console.log('Organisation fields response:', JSON.stringify(orgData, null, 2));
    console.log('Account fields response:', JSON.stringify(accountData, null, 2));

    // Transform and merge the responses
    const fieldDefinitions = [];
    
    // Process organisation fields
    if (orgData && orgData.data && Array.isArray(orgData.data)) {
      orgData.data.forEach((field: any) => {
        fieldDefinitions.push({
          name: field.fieldName || field.name || field.id,
          label: field.displayName || field.label || field.fieldName || field.name || field.id,
          entity_type: 'organisation'
        });
      });
    }
    
    // Process account fields
    if (accountData && accountData.data && Array.isArray(accountData.data)) {
      accountData.data.forEach((field: any) => {
        fieldDefinitions.push({
          name: field.fieldName || field.name || field.id,
          label: field.displayName || field.label || field.fieldName || field.name || field.id,
          entity_type: 'account'
        });
      });
    }

    // Handle alternative response formats if needed
    if (orgData.fields && Array.isArray(orgData.fields)) {
      orgData.fields.forEach((field: string) => {
        fieldDefinitions.push({
          name: field,
          label: field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '),
          entity_type: 'organisation'
        });
      });
    }
    
    if (accountData.fields && Array.isArray(accountData.fields)) {
      accountData.fields.forEach((field: string) => {
        fieldDefinitions.push({
          name: field,
          label: field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '),
          entity_type: 'account'
        });
      });
    }

    // If we still don't have any field definitions, provide some common defaults
    if (fieldDefinitions.length === 0) {
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
      fieldDefinitions.push(...defaultFields);
    }

    console.log('Final merged field definitions:', JSON.stringify(fieldDefinitions, null, 2));

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


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

    // Get all active integration configs
    const { data: configs, error: configError } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('is_active', true)
      .not('gong_api_key_encrypted', 'is', null)
      .not('velaris_token_encrypted', 'is', null);

    if (configError) {
      throw new Error('Failed to fetch integration configs');
    }

    console.log(`Found ${configs?.length || 0} active integrations`);

    for (const config of configs || []) {
      try {
        await syncUserCalls(supabase, config);
      } catch (error) {
        console.error(`Error syncing calls for user ${config.user_id}:`, error);
        
        // Log the error
        await supabase.from('sync_logs').insert({
          user_id: config.user_id,
          status: 'error',
          error_message: error.message,
          sync_type: 'scheduled',
        });
      }
    }

    return new Response(JSON.stringify({ success: true, processedConfigs: configs?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in scheduled sync:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
};

async function syncUserCalls(supabase: any, config: any) {
  console.log(`Syncing calls for user: ${config.user_id}`);

  // Calculate sync window based on frequency
  const now = new Date();
  const fromDateTime = new Date();
  
  if (config.sync_frequency === 'daily') {
    fromDateTime.setDate(now.getDate() - 1);
  } else if (config.custom_sync_hours) {
    fromDateTime.setHours(now.getHours() - config.custom_sync_hours);
  } else {
    fromDateTime.setHours(now.getHours() - 6); // Default 6 hours
  }

  // Fetch calls from Gong
  const gongAuth = btoa(`${config.gong_api_key_encrypted}:`);
  const gongResponse = await fetch(`https://api.gong.io/v2/calls?fromDateTime=${fromDateTime.toISOString()}&status=done`, {
    headers: {
      'Authorization': `Basic ${gongAuth}`,
      'Content-Type': 'application/json',
    },
  });

  if (!gongResponse.ok) {
    throw new Error('Failed to fetch calls from Gong API');
  }

  const gongData = await gongResponse.json();
  const calls = gongData.calls || [];

  console.log(`Found ${calls.length} calls to sync for user ${config.user_id}`);

  // Get deduplication rules for this user
  const { data: dedupRules } = await supabase
    .from('deduplication_rules')
    .select('*')
    .eq('user_id', config.user_id);

  for (const call of calls) {
    try {
      // Check if we've already synced this call
      const { data: existingLog } = await supabase
        .from('sync_logs')
        .select('id')
        .eq('user_id', config.user_id)
        .eq('gong_call_id', call.id)
        .eq('status', 'success')
        .single();

      if (existingLog) {
        console.log(`Call ${call.id} already synced, skipping`);
        continue;
      }

      // Get detailed call information
      const detailResponse = await fetch(`https://api.gong.io/v2/calls/${call.id}`, {
        headers: {
          'Authorization': `Basic ${gongAuth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!detailResponse.ok) {
        console.error(`Failed to fetch details for call ${call.id}`);
        continue;
      }

      const callDetails = await detailResponse.json();

      // Process the call and create activity in Velaris
      const activityData = await processGongCall(callDetails, config, dedupRules || []);
      
      // Create activity in Velaris with correct header
      const velarisResponse = await fetch('https://ua4t4so3ba.execute-api.eu-west-2.amazonaws.com/prod/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-velaris-internal-token': config.velaris_token_encrypted,
        },
        body: JSON.stringify(activityData),
      });

      if (!velarisResponse.ok) {
        throw new Error(`Failed to create activity in Velaris for call ${call.id}`);
      }

      const velarisResult = await velarisResponse.json();

      // Log the successful sync
      await supabase.from('sync_logs').insert({
        user_id: config.user_id,
        gong_call_id: call.id,
        gong_call_title: callDetails.title || 'Untitled Call',
        velaris_activity_id: velarisResult.id,
        status: 'success',
        sync_type: 'scheduled',
      });

      console.log(`Successfully synced call ${call.id} for user ${config.user_id}`);

    } catch (error) {
      console.error(`Error syncing call ${call.id}:`, error);
      
      // Log the error for this specific call
      await supabase.from('sync_logs').insert({
        user_id: config.user_id,
        gong_call_id: call.id,
        gong_call_title: call.title || 'Untitled Call',
        status: 'error',
        error_message: error.message,
        sync_type: 'scheduled',
      });
    }
  }
}

// This function is duplicated from gong-webhook - in a production app, you'd want to share this logic
async function processGongCall(callDetails: any, config: any, dedupRules: any[]) {
  const participantEmails = callDetails.participants?.map((p: any) => p.emailAddress).filter(Boolean) || [];
  
  const linkedOrganizations: string[] = [];
  const linkedAccounts: string[] = [];
  
  for (const rule of dedupRules) {
    if (rule.entity_type === 'organisation') {
      const orgValue = extractFieldValue(callDetails, rule.gong_field);
      if (orgValue) {
        const orgs = await searchVelarisOrganizations(config.velaris_token_encrypted, rule.velaris_field, orgValue);
        linkedOrganizations.push(...orgs.map((org: any) => org.id));
      }
    } else if (rule.entity_type === 'account') {
      const accountValue = extractFieldValue(callDetails, rule.gong_field);
      if (accountValue) {
        const accounts = await searchVelarisAccounts(config.velaris_token_encrypted, rule.velaris_field, accountValue);
        linkedAccounts.push(...accounts.map((acc: any) => acc.id));
      }
    }
  }

  const linkedContacts: string[] = [];
  if (participantEmails.length > 0) {
    const contacts = await searchVelarisContacts(config.velaris_token_encrypted, participantEmails);
    linkedContacts.push(...contacts.map((contact: any) => contact.id));
  }

  const linkedUsers: string[] = [];
  if (participantEmails.length > 0) {
    const users = await searchVelarisUsers(config.velaris_token_encrypted, participantEmails);
    linkedUsers.push(...users.map((user: any) => user.id));
  }

  return {
    title: callDetails.title || 'Gong Call',
    type: config.selected_activity_type_id || 'default',
    description: callDetails.purpose || callDetails.summary || 'Call synced from Gong',
    start_time: callDetails.scheduledTime || callDetails.actualStart || new Date().toISOString(),
    linked_organisations: linkedOrganizations,
    linked_accounts: linkedAccounts,
    linked_contacts: linkedContacts,
    linked_users: linkedUsers,
    external_id: callDetails.id,
  };
}

function extractFieldValue(callDetails: any, fieldPath: string): string | null {
  const paths = fieldPath.split('.');
  let value = callDetails;
  
  for (const path of paths) {
    if (value && typeof value === 'object') {
      value = value[path];
    } else {
      return null;
    }
  }
  
  return value ? String(value) : null;
}

async function searchVelarisOrganizations(token: string, fieldName: string, value: string) {
  const response = await fetch('https://ua4t4so3ba.execute-api.eu-west-2.amazonaws.com/prod/v2/organizations/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-velaris-internal-token': token,
    },
    body: JSON.stringify({
      filters: [{
        fieldName: fieldName,
        operator: 'includes',
        value: [value]
      }]
    }),
  });
  
  if (!response.ok) return [];
  const result = await response.json();
  return result.data || [];
}

async function searchVelarisAccounts(token: string, fieldName: string, value: string) {
  const response = await fetch('https://ua4t4so3ba.execute-api.eu-west-2.amazonaws.com/prod/v2/accounts/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-velaris-internal-token': token,
    },
    body: JSON.stringify({
      filters: [{
        fieldName: fieldName,
        operator: 'includes',
        value: [value]
      }]
    }),
  });
  
  if (!response.ok) return [];
  const result = await response.json();
  return result.data || [];
}

async function searchVelarisContacts(token: string, emails: string[]) {
  const response = await fetch('https://ua4t4so3ba.execute-api.eu-west-2.amazonaws.com/prod/v2/contacts/batch/read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-velaris-internal-token': token,
    },
    body: JSON.stringify({
      property: 'email',
      values: emails
    }),
  });
  
  if (!response.ok) return [];
  const result = await response.json();
  return result.data || [];
}

async function searchVelarisUsers(token: string, emails: string[]) {
  const response = await fetch('https://ua4t4so3ba.execute-api.eu-west-2.amazonaws.com/prod/v2/users/batch/read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-velaris-internal-token': token,
    },
    body: JSON.stringify({
      property: 'email',
      values: emails
    }),
  });
  
  if (!response.ok) return [];
  const result = await response.json();
  return result.data || [];
}

serve(handler);


import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GongWebhookPayload {
  callId: string;
  status: string;
  title?: string;
  startTime?: string;
  participants?: Array<{ email: string; name?: string }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    
    if (!userId) {
      throw new Error('user_id parameter is required');
    }

    console.log('Webhook received for user:', userId);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's integration config
    const { data: config, error: configError } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (configError || !config) {
      throw new Error('Integration config not found');
    }

    if (!config.velaris_token_encrypted || !config.gong_api_key_encrypted) {
      throw new Error('Missing API credentials');
    }

    const gongPayload: GongWebhookPayload = await req.json();
    
    if (gongPayload.status !== 'done') {
      console.log('Call not completed yet, skipping');
      return new Response(JSON.stringify({ message: 'Call not completed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get full call details from Gong
    const gongAuth = btoa(`${config.gong_api_key_encrypted}:`);
    const gongResponse = await fetch(`https://api.gong.io/v2/calls/${gongPayload.callId}`, {
      headers: {
        'Authorization': `Basic ${gongAuth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!gongResponse.ok) {
      throw new Error('Failed to fetch call details from Gong');
    }

    const callDetails = await gongResponse.json();
    
    // Get deduplication rules for this user
    const { data: dedupRules } = await supabase
      .from('deduplication_rules')
      .select('*')
      .eq('user_id', userId);

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
      throw new Error('Failed to create activity in Velaris');
    }

    const velarisResult = await velarisResponse.json();

    // Log the sync
    await supabase.from('sync_logs').insert({
      user_id: userId,
      gong_call_id: gongPayload.callId,
      gong_call_title: callDetails.title || 'Untitled Call',
      velaris_activity_id: velarisResult.id,
      status: 'success',
      sync_type: 'webhook',
    });

    console.log('Successfully synced call:', gongPayload.callId);

    return new Response(JSON.stringify({ success: true, activityId: velarisResult.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
};

async function processGongCall(callDetails: any, config: any, dedupRules: any[]) {
  // Extract participants emails
  const participantEmails = callDetails.participants?.map((p: any) => p.emailAddress).filter(Boolean) || [];
  
  // Find linked organizations and accounts based on deduplication rules
  const linkedOrganizations: string[] = [];
  const linkedAccounts: string[] = [];
  
  for (const rule of dedupRules) {
    if (rule.entity_type === 'organisation') {
      // Search for organizations using the rule
      const orgValue = extractFieldValue(callDetails, rule.gong_field);
      if (orgValue) {
        const orgs = await searchVelarisOrganizations(config.velaris_token_encrypted, rule.velaris_field, orgValue);
        linkedOrganizations.push(...orgs.map((org: any) => org.id));
      }
    } else if (rule.entity_type === 'account') {
      // Search for accounts using the rule
      const accountValue = extractFieldValue(callDetails, rule.gong_field);
      if (accountValue) {
        const accounts = await searchVelarisAccounts(config.velaris_token_encrypted, rule.velaris_field, accountValue);
        linkedAccounts.push(...accounts.map((acc: any) => acc.id));
      }
    }
  }

  // Find linked contacts by email
  const linkedContacts: string[] = [];
  if (participantEmails.length > 0) {
    const contacts = await searchVelarisContacts(config.velaris_token_encrypted, participantEmails);
    linkedContacts.push(...contacts.map((contact: any) => contact.id));
  }

  // Find linked users by email
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

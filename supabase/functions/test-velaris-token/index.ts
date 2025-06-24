
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestTokenRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token }: TestTokenRequest = await req.json();

    if (!token) {
      throw new Error('Token is required');
    }

    // Test the token by fetching activity types with correct header
    const response = await fetch('https://ua4t4so3ba.execute-api.eu-west-2.amazonaws.com/prod/activity-type', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Invalid token or insufficient permissions');
    }

    const data = await response.json();

    return new Response(JSON.stringify({ valid: true, activityTypes: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error testing Velaris token:', error);
    
    return new Response(JSON.stringify({ valid: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
};

serve(handler);

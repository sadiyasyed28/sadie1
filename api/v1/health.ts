export const config = { runtime: "edge" };

export default async function handler(_request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const configured = Boolean(supabaseUrl && supabaseAnonKey);

  let databaseReachable = false;
  if (configured && supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/health`, {
        headers: { apikey: supabaseAnonKey },
        method: "GET",
      });
      databaseReachable = response.ok;
    } catch {
      databaseReachable = false;
    }
  }

  const ready = configured && databaseReachable;
  return new Response(
    JSON.stringify({
      service: "adrab-api",
      status: ready ? "ready" : "not_configured",
      timestamp: new Date().toISOString(),
      dependencies: {
        supabase_configured: configured,
        supabase_reachable: databaseReachable,
      },
      capabilities: {
        case_persistence: false,
        private_file_storage: false,
        raw_observation_capture: false,
        clinical_evaluation: false,
        clinical_model: false,
      },
    }),
    {
      status: ready ? 200 : 503,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    },
  );
}

// Mi Biblioteca de Estudio — configuración de Supabase
// Usa SOLO la Publishable key. NO uses una Secret Key ni service_role.

const SUPABASE_URL = "https://rctenaewkoqhctynveo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NYlwHJJY_U7jS_2k4d7Q9g_NrSNzUTZ";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

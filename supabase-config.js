// Mi Biblioteca de Estudio — configuración de Supabase
// Usa SOLO la Publishable key (sb_publishable_...).
// NO uses una Secret Key ni service_role.

const SUPABASE_URL = "https://rctenaewkoqhctynveo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "PEGA_AQUI_TU_PUBLISHABLE_KEY";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

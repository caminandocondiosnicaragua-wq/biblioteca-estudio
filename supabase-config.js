// IMPORTANTE:
// Conserva aquí los valores de tu proyecto Supabase.
// NO publiques una service_role key en este archivo.
//
// Ejemplo:
// const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
// const SUPABASE_ANON_KEY = "TU_CLAVE_PUBLICABLE";

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "PEGA_AQUI_TU_SUPABASE_URL";
const SUPABASE_ANON_KEY = "PEGA_AQUI_TU_PUBLISHABLE_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

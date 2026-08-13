// IMPORTANTE:
// Conserva aquí los valores de tu proyecto Supabase.
// NO publiques una service_role key en este archivo.
//
// Ejemplo:
// const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
// const SUPABASE_ANON_KEY = "TU_CLAVE_PUBLICABLE";

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://rcetnaoewkoqhctynveo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NYlwHJJY_U7jS_2k4d7Q9g_NrSNzUTZ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import { createBrowserClient } from "@supabase/ssr";

// Usamos createBrowserClient en lugar de createClient.
// Esto configura automáticamente el almacenamiento en Cookies
// para que el Middleware y el Servidor puedan leer la sesión.
export const supabase = createBrowserClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
);

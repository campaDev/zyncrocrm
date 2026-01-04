import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, redirect, cookies } = context; //

  // 1. REGLA DE ORO: Webhooks primero (Acceso Público)
  // Si es la ruta de WhatsApp, dejamos pasar inmediatamente sin cargar Supabase ni sesiones.
  if (url.pathname.startsWith("/api/webhooks")) {
    //
    return next();
  }

  // 2. Configuración de Supabase (Solo para el resto de la app)
  let response = await next(); // Guardamos la respuesta inicial por si hay que modificar headers después

  const supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "") as any; //
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, options); //
          });

          // Actualizamos la respuesta si hubo cambios en las cookies (refresh token)
          response = new Response(response.body, response);
        },
      },
    },
  );

  // 3. Verificación de Sesión
  // Hacemos esto ANTES de devolver la respuesta definitiva al usuario
  const {
    data: { user },
  } = await supabase.auth.getUser(); //

  // Guardamos el usuario para usarlo en las páginas .astro
  context.locals.user = user; //

  // 4. Protección de Rutas (Redirecciones)

  // A. Rutas Protegidas (Dashboard)
  if (url.pathname.startsWith("/dashboard")) {
    //
    if (!user) {
      return redirect("/login");
    }
  }

  // B. Rutas de Invitados (Login/Home)
  if (url.pathname === "/login" || url.pathname === "/") {
    //
    if (user) {
      return redirect("/dashboard");
    }
  }

  // 5. Devolver la respuesta final
  return response;
});

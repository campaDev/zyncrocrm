import type { APIRoute } from "astro";
import { createServerClient } from "@supabase/ssr";

const VERIFY_TOKEN = import.meta.env.WEBHOOK_VERIFY_TOKEN;

// 1. GET: Handshake (Ya verificado)
export const GET: APIRoute = ({ url }) => {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
};

// 2. POST: Recibir Mensajes Reales
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Validar si es un evento de WhatsApp
    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      // Si hay un mensaje válido
      if (message) {
        // A. Configurar Supabase (Cliente Servidor)
        const supabase = createServerClient(
          import.meta.env.PUBLIC_SUPABASE_URL,
          import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
          { cookies: { getAll: () => [], setAll: () => {} } }, // No necesitamos cookies aquí
        );

        // B. Extraer datos
        const phone = message.from; // Ej: 54911...
        const text =
          message.text?.body || "Mensaje multimedia (no soportado aún)";
        const name = value.contacts?.[0]?.profile?.name || "Desconocido";
        const wam_id = message.id; // ID único de WhatsApp

        // C. Buscar o Crear el Contacto
        // 1. Buscamos si existe por teléfono
        let { data: contact } = await supabase
          .from("contacts")
          .select("id")
          .eq("phone_number", `+${phone}`) // Asegúrate de manejar el '+' según tu formato
          .single();

        // 2. Si no existe, lo creamos
        if (!contact) {
          // Buscar un canal por defecto (el primero que haya)
          const { data: channel } = await supabase
            .from("channels")
            .select("id")
            .limit(1)
            .single();

          if (channel) {
            const { data: newContact } = await supabase
              .from("contacts")
              .insert({
                name: name,
                phone_number: `+${phone}`,
                channel_id: channel.id,
                unread_count: 1,
                labels: ["nuevo", "whatsapp"],
              })
              .select()
              .single();
            contact = newContact;
          }
        }

        // D. Insertar el Mensaje
        if (contact) {
          const { error } = await supabase.from("messages").insert({
            contact_id: contact.id,
            direction: "inbound",
            content: text,
            status: "delivered",
            wam_id: wam_id,
          });

          if (error) console.error("Error guardando mensaje:", error);
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    return new Response("Not a WhatsApp event", { status: 404 });
  } catch (error) {
    console.error("Error crítico en webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

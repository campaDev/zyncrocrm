import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import ContactDetailsPanel from "./ContactDetailsPanel";

export default function ChatWindow({
  contact: initialContact,
  messages: initialMessages = [],
}) {
  // 1. ESTADOS
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [contact, setContact] = useState(initialContact);
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const [showDetails, setShowDetails] = useState(false);

  // 2. SINCRONIZACIÓN
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setContact(initialContact);
  }, [initialContact]);

  // Efecto dedicado a marcar como leído al ENTRAR o CAMBIAR de chat
  useEffect(() => {
    if (contact?.id) {
      const markAsRead = async () => {
        // Solo actualizamos si visualmente hay algo pendiente (optimización)
        // O simplemente forzamos a 0 para asegurar
        await supabase
          .from("contacts")
          .update({ unread_count: 0 })
          .eq("id", contact.id);
      };
      markAsRead();
    }
  }, [contact.id]); // Se ejecuta cada vez que cambias de contacto
  // --- REALTIME OPTIMIZADO ---
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${contact.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `contact_id=eq.${contact.id}`,
        },
        async (payload) => {
          const newMessage = payload.new;

          // A. Agregar mensaje al estado (evitando duplicados)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          // B. Si estoy viendo el chat y llega un mensaje, lo marco como leído al instante
          if (newMessage.direction === "inbound") {
            await supabase
              .from("contacts")
              .update({ unread_count: 0 })
              .eq("id", contact.id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contact.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase.from("templates").select("*");
      if (data) setTemplates(data);
    };
    fetchTemplates();
  }, []);

  // 3. LÓGICA DE ENVÍO
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);

    try {
      const { error } = await supabase // Quitamos 'data' de aquí
        .from("messages")
        .insert({
          contact_id: contact.id,
          direction: "outbound",
          content: newMessage.trim(),
          status: "sent",
        });
      // --- FIX 1 (Parte B): No actualizamos el estado manualmente aquí.
      // Dejamos que el evento Realtime (arriba) se encargue de pintar el mensaje.
      // Esto previene duplicados y garantiza que lo que ves es lo que se guardó.

      if (error) throw error;

      setNewMessage("");
      // Resetear altura del textarea
      const textarea = document.getElementById("msg-input");
      if (textarea) textarea.style.height = "auto";
    } catch (err) {
      console.error("Error enviando mensaje:", err);
      alert("No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setNewMessage(text);

    // --- MEJORA UX: Auto-grow textarea ---
    e.target.style.height = "auto"; // Resetear para recalcular
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`; // Max 128px

    if (text.startsWith("/")) {
      const query = text.slice(1).toLowerCase();
      const matches = templates.filter((t) =>
        t.name.toLowerCase().includes(query),
      );
      setFilteredTemplates(matches);
      setShowTemplates(matches.length > 0);
    } else {
      setShowTemplates(false);
    }
  };

  const selectTemplate = (content) => {
    setNewMessage(content);
    setShowTemplates(false);
    // Ajustar altura tras seleccionar template
    setTimeout(() => {
      const textarea = document.getElementById("msg-input");
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
      }
    }, 0);
  };

  return (
    <div className="flex flex-col h-full w-full bg-surface/50 relative overflow-hidden">
      {/* HEADER ... (IGUAL) */}
      <header className="h-16 px-6 border-b border-border bg-panel flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover text-white flex items-center justify-center font-bold shadow-sm">
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-txt-title leading-tight">
              {contact.name}
            </h2>
            <p className="text-xs text-txt-body/70 font-mono flex items-center gap-2">
              {contact.metadata?.company ? (
                <span className="font-semibold text-primary">
                  {contact.metadata.company}
                </span>
              ) : (
                contact.phone_number
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`p-2 rounded-lg transition-colors ${showDetails ? "bg-primary text-white" : "text-txt-body hover:bg-surface"}`}
            title="Ver info"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* ÁREA DE MENSAJES ... (IGUAL) */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
      >
        {messages.map((msg, index) => {
          const isOutbound = msg.direction === "outbound";

          return (
            <div
              key={msg.id || index}
              className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`
                  max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm relative animate-fade-in
                  ${
                    isOutbound
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-panel text-txt-body border border-border rounded-bl-none"
                  }
                `}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <span
                  className={`text-[10px] block text-right mt-1 opacity-70 ${isOutbound ? "text-white" : "text-txt-body"}`}
                >
                  {msg.created_at
                    ? format(new Date(msg.created_at), "HH:mm")
                    : "..."}
                  {isOutbound && (
                    <span className="ml-1">
                      {msg.status === "read" ? "✓✓" : "✓"}
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* INPUT AREA */}
      {/* CAMBIO: z-20 para asegurar que el menu flote bien */}
      <div className="p-4 bg-panel border-t border-border shrink-0 relative z-20">
        {/* MENU DE TEMPLATES */}
        {showTemplates && (
          // CAMBIO: z-50 para que siempre esté encima de todo
          <div className="absolute bottom-full left-4 mb-2 w-64 bg-panel border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
            <div className="bg-surface/50 px-3 py-2 text-[10px] uppercase font-bold text-txt-body/50 border-b border-border">
              Respuestas Rápidas
            </div>
            <ul className="max-h-48 overflow-y-auto">
              {filteredTemplates.map((t) => (
                <li
                  key={t.id}
                  onClick={() => selectTemplate(t.content)}
                  className="px-4 py-3 hover:bg-primary/10 cursor-pointer border-b border-border/50 last:border-0 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary text-sm">
                      /{t.name}
                    </span>
                  </div>
                  <p className="text-xs text-txt-body/70 truncate mt-0.5">
                    {t.content}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="flex gap-2 items-end bg-surface border border-border rounded-xl p-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm"
        >
          {/* Botón Clip ... (IGUAL) */}
          <button
            type="button"
            className="p-2 text-txt-body/50 hover:text-primary transition-colors cursor-pointer"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          {/* TEXTAREA MEJORADO */}
          <textarea
            id="msg-input" // ID para referencia
            rows="1"
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje o usa / para plantillas..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-txt-body placeholder:text-txt-body/40 resize-none py-2 max-h-32 min-h-[2.5rem] leading-relaxed overflow-hidden"
          />

          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className={`
              p-2 rounded-lg shadow-md transition-all flex items-center justify-center
              ${
                !newMessage.trim() || sending
                  ? "bg-surface text-txt-body/20 cursor-not-allowed shadow-none"
                  : "bg-primary hover:bg-primary-hover text-white cursor-pointer hover:shadow-primary/30"
              }
            `}
          >
            {/* SVG del botón enviar ... (IGUAL) */}
            {sending ? (
              <svg
                className="animate-spin w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                className="w-5 h-5 transform rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </form>
      </div>

      <ContactDetailsPanel
        contact={contact}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        onUpdate={(updatedContact) => setContact(updatedContact)}
      />
    </div>
  );
}

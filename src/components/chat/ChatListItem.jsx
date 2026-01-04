import { format } from "date-fns";

export default function ChatListItem({ contact, active = false }) {
  // Obtenemos el último mensaje (si existe)
  const lastMessage = contact.messages?.[0];

  // Formateamos la hora (Ej: 14:30)
  const time = lastMessage
    ? format(new Date(lastMessage.created_at), "HH:mm")
    : "";

  return (
    <a
      href={`/dashboard/chats/${contact.id}`}
      className={`
        block text-left w-full
        flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-transparent
        ${
          active
            ? "bg-primary/10 border-primary/20 shadow-sm"
            : "hover:bg-surface border-b-border/50 hover:border-border"
        }
      `}
    >
      {/* Avatar / Iniciales */}
      <div className="relative">
        <div
          className={`
          w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
          ${active ? "bg-primary text-white" : "bg-surface border border-border text-txt-title"}
        `}
        >
          {contact.name.charAt(0).toUpperCase()}
        </div>

        {/* Indicador Online (Decorativo por ahora) */}
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-panel rounded-full"></div>
      </div>

      {/* Info Central */}
      <div className="flex-1 min-w-0">
        {" "}
        {/* min-w-0 es vital para que funcione el truncate */}
        <div className="flex justify-between items-baseline mb-0.5">
          <h3
            className={`text-sm font-semibold truncate ${active ? "text-txt-title" : "text-txt-body"}`}
          >
            {contact.name}
          </h3>
          <span className="text-xs text-txt-body/60 whitespace-nowrap ml-2">
            {time}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-txt-body/70 truncate pr-2">
            {lastMessage?.direction === "outbound" && (
              <span className="opacity-60">Tú: </span>
            )}
            {lastMessage?.content || "Sin mensajes"}
          </p>

          {/* Badge de No Leídos */}
          {contact.unread_count > 0 && (
            <span className="shrink-0 min-w-5 h-5 px-1.5 flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full">
              {contact.unread_count}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

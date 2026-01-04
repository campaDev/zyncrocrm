import { useState, useEffect } from "react";
import ChatListItem from "./ChatListItem";
import { supabase } from "../../lib/supabase";
import CreateContactModal from "../contacts/CreateContactModal";

/**
 * @param {{ contacts: any[] }} props
 */
export default function ChatList({ contacts: initialContacts = [] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Estados para Filtros y Búsqueda ---
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'unread'
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  // ----------------------------------------------

  const getActiveChatId = () => {
    if (typeof window === "undefined") return null;
    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1];
  };

  const activeId = getActiveChatId();

  useEffect(() => {
    setContacts(initialContacts);
  }, [initialContacts]);

  useEffect(() => {
    const channel = supabase
      .channel("chat_list_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new;
          const contactId = newMessage.contact_id;

          // --- MEJORA: Manejo asíncrono dentro del setState ---
          // Necesitamos lógica fuera del setContacts para poder hacer await si falta el contacto

          // 1. Verificamos si ya tenemos el contacto en el estado actual
          // Nota: Al estar dentro del closure, necesitamos usar una referencia funcional o trucos,
          // pero para simplificar la lectura, haremos la verificación básica.

          setContacts((prevContacts) => {
            const contactIndex = prevContacts.findIndex(
              (c) => c.id === contactId,
            );

            // CASO A: El contacto YA EXISTE en la lista
            if (contactIndex !== -1) {
              const updatedContact = { ...prevContacts[contactIndex] };
              updatedContact.messages = [newMessage];
              updatedContact.updated_at = newMessage.created_at;

              if (
                newMessage.direction === "inbound" &&
                activeId !== contactId
              ) {
                updatedContact.unread_count =
                  (updatedContact.unread_count || 0) + 1;
              }

              const newContacts = [...prevContacts];
              newContacts.splice(contactIndex, 1);
              newContacts.unshift(updatedContact);
              return newContacts;
            }

            // CASO B: El contacto NO EXISTE (es nuevo o no estaba cargado)
            // Aquí devolvemos el estado igual PERO lanzamos una función para buscarlo
            fetchMissingContact(contactId, newMessage);
            return prevContacts;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId]);

  // --- NUEVO: Función auxiliar para traer contactos que no están en la lista ---
  const fetchMissingContact = async (contactId, newMessage) => {
    const { data: newContact } = await supabase
      .from("contacts")
      .select(
        "id, name, phone_number, unread_count, avatar_url, labels, updated_at",
      )
      .eq("id", contactId)
      .single();

    if (newContact) {
      // Le inyectamos el mensaje que acaba de llegar para que se vea bien
      newContact.messages = [newMessage];

      // Lo agregamos al principio de la lista
      setContacts((prev) => [newContact, ...prev]);
    }
  };

  // --- NUEVO: Lógica de Filtrado ---
  const filteredContacts = contacts.filter((contact) => {
    // 1. Filtro de Texto (Búsqueda)
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone_number.includes(searchQuery);

    // 2. Filtro de Estado (Leídos/No leídos)
    const matchesFilter =
      filterMode === "unread" ? contact.unread_count > 0 : true;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col h-full bg-panel border-r border-border w-full md:w-80 lg:w-96">
      {/* Header */}
      <div className="p-4 mt-6 border-b border-border flex justify-between items-center sticky top-0 bg-panel z-10 gap-2">
        {/* Lógica Visual de Búsqueda */}
        {showSearch ? (
          <div className="flex-1 flex items-center bg-surface border border-primary/30 rounded-lg px-2 animate-fade-in">
            <input
              autoFocus
              type="text"
              placeholder="Buscar..."
              className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 text-txt-title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => !searchQuery && setShowSearch(false)} // Cerrar si está vacío y pierde foco
            />
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearch(false);
              }}
              className="text-txt-body/50 hover:text-error"
            >
              ✕
            </button>
          </div>
        ) : (
          <h2 className="font-bold text-txt-title text-lg flex-1">Chats</h2>
        )}

        {!showSearch && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 text-txt-body hover:bg-surface rounded-lg transition-colors"
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors cursor-pointer"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Filtros Funcionales */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-b border-border/50">
        <button
          onClick={() => setFilterMode("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap border ${
            filterMode === "all"
              ? "bg-primary text-white border-primary"
              : "text-txt-body hover:bg-surface border-border"
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilterMode("unread")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap border ${
            filterMode === "unread"
              ? "bg-primary text-white border-primary"
              : "text-txt-body hover:bg-surface border-border"
          }`}
        >
          No leídos
        </button>
      </div>

      {/* Lista Reactiva Filtrada */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredContacts.length === 0 ? (
          <div className="text-center p-8 text-txt-body/50 text-sm flex flex-col items-center gap-2">
            <span>🔍</span>
            <span>No se encontraron chats</span>
            {filterMode === "unread" && (
              <button
                onClick={() => setFilterMode("all")}
                className="text-primary hover:underline"
              >
                Ver todos
              </button>
            )}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <ChatListItem
              key={contact.id}
              contact={contact}
              active={activeId === contact.id}
            />
          ))
        )}
      </div>

      <CreateContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

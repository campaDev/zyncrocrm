import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CreateContactModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);

  // Datos del formulario
  const [formData, setFormData] = useState({
    name: "",
    phone: "", // Ej: +54911...
    email: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Obtener ID del canal por defecto (usamos el primero que exista)
      // En un futuro podrías tener un selector de canales si tienes varios WhatsApps
      const { data: channel } = await supabase
        .from("channels")
        .select("id")
        .limit(1)
        .single();

      if (!channel) throw new Error("No hay canales de WhatsApp configurados");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // 2. Crear el contacto
      const { data: newContact, error } = await supabase
        .from("contacts")
        .insert({
          channel_id: channel.id,
          name: formData.name,
          phone_number: formData.phone, // Importante: Debe ser único según nuestro Schema
          unread_count: 0,
          labels: ["nuevo"], // Etiqueta por defecto
          assigned_to: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505")
          throw new Error("Este número ya está registrado");
        throw error;
      }

      // 3. Redirigir al nuevo chat
      window.location.href = `/dashboard/chats/${newContact.id}`;
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop (Fondo oscuro) */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-panel border border-border rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="bg-surface px-6 py-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold text-txt-title text-lg">Nuevo Contacto</h3>
          <button
            onClick={onClose}
            className="text-txt-body hover:text-error transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-txt-title uppercase mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Juan Pérez"
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-txt-body focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-txt-title uppercase mb-1">
              Teléfono (WhatsApp)
            </label>
            <input
              type="tel"
              required
              placeholder="+54 9 11..."
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-txt-body focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
            <p className="text-[10px] text-txt-body/50 mt-1">
              Incluye el código de país (Ej: +54...)
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-txt-body hover:bg-surface rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
            >
              {loading ? "Creando..." : "Guardar Contacto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function ContactDetailsPanel({
  contact,
  isOpen,
  onClose,
  onUpdate,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    // Datos de Empresa (se guardarán en metadata)
    companyName: "",
    taxId: "", // RUC, CUIT, NIT
    role: "", // Cargo del contacto (Ej: Gerente de Compras)
    notes: "",
  });

  // Cargar datos cuando se abre el panel
  useEffect(() => {
    if (contact) {
      // Extraemos datos planos y metadatos
      const meta = contact.metadata || {};

      setFormData({
        name: contact.name || "",
        phone: contact.phone_number || "",
        companyName: meta.company || "",
        taxId: meta.tax_id || "",
        role: meta.role || "",
        notes: meta.notes || "",
      });
    }
  }, [contact]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Preparamos el objeto JSON para metadata
      const newMetadata = {
        ...contact.metadata, // Mantenemos otros datos que ya existieran
        company: formData.companyName,
        tax_id: formData.taxId,
        role: formData.role,
        notes: formData.notes,
      };

      const { data, error } = await supabase
        .from("contacts")
        .update({
          name: formData.name,
          metadata: newMetadata,
        })
        .eq("id", contact.id)
        .select()
        .single();

      if (error) throw error;

      // Avisamos al componente padre que hubo cambios
      onUpdate(data);
      alert("Contacto actualizado correctamente");
    } catch (err) {
      console.error(err);
      alert("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`
      fixed inset-y-0 right-0 w-96 bg-panel border-l border-border shadow-2xl transform transition-transform duration-300 z-50 flex flex-col
      ${isOpen ? "translate-x-0" : "translate-x-full"}
    `}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex justify-between items-center bg-surface/50">
        <h3 className="font-bold text-txt-title">Información del Contacto</h3>
        <button
          onClick={onClose}
          className="text-txt-body hover:text-error transition-colors text-2xl leading-none"
        >
          &times;
        </button>
      </div>

      {/* Formulario Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <form id="details-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Sección Perfil */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/50 pb-1">
              Perfil Personal
            </h4>

            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-surface border-2 border-border flex items-center justify-center text-3xl font-bold text-txt-title shadow-sm">
                {formData.name.charAt(0).toUpperCase()}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-body mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-txt-title focus:ring-2 focus:ring-primary/20 outline-none"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-body mb-1">
                Teléfono
              </label>
              <input
                type="text"
                disabled
                className="w-full bg-surface/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-txt-body/70 cursor-not-allowed"
                value={formData.phone}
              />
            </div>
          </div>

          {/* Sección Empresa (Aquí está la magia del JSONB) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/50 pb-1">
              Datos de Empresa
            </h4>

            <div>
              <label className="block text-xs font-medium text-txt-body mb-1">
                Empresa / Razón Social
              </label>
              <input
                type="text"
                placeholder="Ej: Tech Solutions S.A."
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-txt-title focus:ring-2 focus:ring-primary/20 outline-none"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-txt-body mb-1">
                  ID Fiscal (RUC/CUIT)
                </label>
                <input
                  type="text"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-txt-title focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.taxId}
                  onChange={(e) =>
                    setFormData({ ...formData, taxId: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-txt-body mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Gerente"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-txt-title focus:ring-2 focus:ring-primary/20 outline-none"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Sección Notas */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/50 pb-1">
              Notas Internas
            </h4>
            <textarea
              rows="4"
              placeholder="Escribe detalles importantes sobre este cliente..."
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-txt-body focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>
        </form>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border bg-surface/30">
        <button
          form="details-form"
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2 px-4 rounded-lg shadow-lg shadow-primary/20 transition-all flex justify-center items-center gap-2"
        >
          {loading ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </div>
  );
}

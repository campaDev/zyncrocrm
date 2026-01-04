import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      // 1. Intentamos iniciar sesión con Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 2. Si es exitoso, redirigimos al Dashboard
      // Usamos window.location para forzar una recarga completa y que el Middleware detecte la nueva sesión
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <form
        onSubmit={handleSubmit}
        className="bg-panel border border-border shadow-xl rounded-2xl p-8 space-y-6"
      >
        {/* Encabezado del Formulario */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-txt-title">
            Bienvenido de nuevo
          </h2>
          <p className="text-sm text-txt-body">
            Ingresa tus credenciales para acceder a Zyncro
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error animate-fade-in">
            ⚠️{" "}
            {error === "Invalid login credentials"
              ? "Credenciales incorrectas"
              : error}
          </div>
        )}

        {/* Campos */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-txt-title mb-1 uppercase tracking-wide">
              Correo Electrónico
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="nombre@empresa.com"
              className="w-full bg-surface border border-border text-txt-body px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-txt-body/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-txt-title mb-1 uppercase tracking-wide">
              Contraseña
            </label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full bg-surface border border-border text-txt-body px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-txt-body/40"
            />
          </div>
        </div>

        {/* Botón de Acción */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 px-4 rounded-lg transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-white"
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
              Verificando...
            </span>
          ) : (
            "Iniciar Sesión"
          )}
        </button>

        {/* Footer del Form */}
        <div className="text-center text-xs text-txt-body/60">
          ¿Olvidaste tu contraseña?{" "}
          <a
            href="#"
            className="text-primary hover:underline hover:text-primary-hover"
          >
            Recuperar acceso
          </a>
        </div>
      </form>
    </div>
  );
}

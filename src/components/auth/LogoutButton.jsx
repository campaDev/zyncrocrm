import { supabase } from "../../lib/supabase";

export default function LogoutButton() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login"; // Forzamos recarga para limpiar estado
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-error hover:text-red-600 font-medium px-4 py-2 hover:bg-error/5 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-4 h-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
        />
      </svg>
      Cerrar Sesión
    </button>
  );
}

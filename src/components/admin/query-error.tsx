import { AlertTriangle } from "lucide-react";

export function QueryError({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
        <AlertTriangle size={20} className="text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-700 mb-1">
        Erreur de chargement
      </p>
      <p className="text-xs text-red-500">
        {message ?? "Impossible de charger les données. Rechargez la page."}
      </p>
    </div>
  );
}

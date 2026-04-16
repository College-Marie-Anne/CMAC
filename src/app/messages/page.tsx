import { MessageSquare } from "lucide-react";

/**
 * /messages — index de la messagerie.
 *
 * Le layout (`layout.tsx`) gère tout le data-fetching et le rendu de la liste
 * des conversations via `<MessagesShell>`. Cette page rend uniquement le
 * contenu du `<main>` :
 *  - Sur mobile : `<main>` est masqué par le shell quand on est sur /messages
 *    (la liste prend toute la largeur), donc cet empty state n'est pas visible.
 *  - Sur desktop : visible comme placeholder pendant qu'on sélectionne une
 *    conversation dans la sidebar.
 */
export default function MessagesPage() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-cma-bordeaux/5 flex items-center justify-center mx-auto mb-4">
          <MessageSquare size={28} className="text-cma-bordeaux/30" />
        </div>
        <p className="text-sm text-gray-500 font-medium">
          Sélectionnez une conversation
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Ou commencez-en une nouvelle
        </p>
      </div>
    </div>
  );
}

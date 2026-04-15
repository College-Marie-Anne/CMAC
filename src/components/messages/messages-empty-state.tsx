import { MessageSquare } from "lucide-react";

interface MessagesEmptyStateProps {
  onNewConversation?: () => void;
}

export function MessagesEmptyState({ onNewConversation }: MessagesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-cma-bordeaux/5 flex items-center justify-center mb-6">
        <MessageSquare size={36} className="text-cma-bordeaux/40" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        Aucune conversation
      </h3>
      <p className="text-sm text-gray-400 max-w-xs mb-6">
        Commencez une conversation avec une membre de la communauté CMA
      </p>
      {onNewConversation && (
        <button
          type="button"
          onClick={onNewConversation}
          className="px-5 py-2.5 rounded-xl bg-cma-bordeaux text-white text-sm font-medium hover:bg-cma-bordeaux-dark transition-colors"
        >
          Nouvelle conversation
        </button>
      )}
    </div>
  );
}

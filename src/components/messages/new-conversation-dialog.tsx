"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/feed/user-avatar";
import { createConversationAction } from "@/actions/messages";
import { createClient } from "@/utils/supabase/client";

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
}

type SearchResult = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar_url: string | null;
};

export function NewConversationDialog({
  open,
  onClose,
  currentUserId,
}: NewConversationDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const supabase = createClient();

        // Search profiles, excluding current user, admins, and blocked users
        const { data: blockedIds } = await supabase
          .from("blocked_users")
          .select("blocked_id")
          .eq("blocker_id", currentUserId);

        const blockedSet = new Set(
          blockedIds?.map((b) => b.blocked_id) ?? []
        );

        // Also get users who blocked us
        const { data: blockedByIds } = await supabase
          .from("blocked_users")
          .select("blocker_id")
          .eq("blocked_id", currentUserId);

        for (const b of blockedByIds ?? []) {
          blockedSet.add(b.blocker_id);
        }

        // Search by name or username using textSearch
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, username, avatar_url, role")
          .eq("status", "active")
          .neq("role", "admin")
          .neq("id", currentUserId)
          .textSearch("search_vector", query.trim(), { type: "websearch" })
          .limit(10);

        const filtered = (profiles ?? []).filter(
          (p) => !blockedSet.has(p.id)
        );

        setResults(
          filtered.map((p) => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            username: p.username,
            avatar_url: p.avatar_url,
          }))
        );
      } catch {
        setError("Erreur lors de la recherche");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, open, currentUserId]);

  const handleSelect = useCallback(
    async (userId: string) => {
      setIsCreating(true);
      setError(null);

      const result = await createConversationAction(userId);

      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
        setIsCreating(false);
        return;
      }

      onClose();
      setQuery("");
      setResults([]);
      setIsCreating(false);
      router.push(`/messages/${result.conversationId}`);
    },
    [onClose, router]
  );

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-x-4 top-[10vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Nouvelle conversation
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom ou username…"
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cma-bordeaux/20 focus:border-cma-bordeaux/30"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="px-4 py-3 text-sm text-red-600 bg-red-50">
              {error}
            </div>
          )}

          {/* Loading */}
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          )}

          {/* Creating */}
          {isCreating && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              Création de la conversation…
            </div>
          )}

          {/* No results */}
          {!isSearching &&
            !isCreating &&
            query.trim().length >= 2 &&
            results.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">
                Aucune membre trouvée
              </div>
            )}

          {/* Prompt */}
          {query.trim().length < 2 && !isSearching && (
            <div className="text-center py-8 text-sm text-gray-400">
              Tapez au moins 2 caractères pour chercher
            </div>
          )}

          {/* Results list */}
          {!isSearching && !isCreating && results.length > 0 && (
            <div>
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <UserAvatar
                    firstName={user.first_name}
                    lastName={user.last_name}
                    avatarUrl={user.avatar_url}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      @{user.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

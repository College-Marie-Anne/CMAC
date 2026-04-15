"use client";

import { useState, useMemo, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  X,
  Check,
  Users,
  Search,
  ArrowUpDown,
  Activity as ActivityIcon,
} from "lucide-react";
import {
  createActivityAction,
  updateActivityAction,
  deleteActivityAction,
} from "@/actions/admin";

type ActivityItem = {
  id: string;
  name: string;
  member_count: number;
};

type SortOption = "name_asc" | "name_desc" | "members_desc" | "members_asc";

export function ActivitiesManager({
  activities,
}: {
  activities: ActivityItem[];
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Recherche + tri (client-side sur la liste reçue en props)
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name_asc");

  const handleCreate = () => {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createActivityAction(newName.trim());
      if (!result.success) setError(result.error ?? "Erreur");
      else {
        setNewName("");
        setShowCreate(false);
      }
    });
  };

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return;
    startTransition(async () => {
      const result = await updateActivityAction(editingId, editName.trim());
      if (!result.success) setError(result.error ?? "Erreur");
      else setEditingId(null);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteActivityAction(id);
      if (!result.success) setError(result.error ?? "Erreur");
    });
  };

  // Liste filtrée + triée (recalculée uniquement si dépendances changent)
  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = q
      ? activities.filter((a) => a.name.toLowerCase().includes(q))
      : [...activities];

    switch (sortBy) {
      case "name_asc":
        result.sort((a, b) => a.name.localeCompare(b.name, "fr"));
        break;
      case "name_desc":
        result.sort((a, b) => b.name.localeCompare(a.name, "fr"));
        break;
      case "members_desc":
        result.sort(
          (a, b) =>
            b.member_count - a.member_count ||
            a.name.localeCompare(b.name, "fr")
        );
        break;
      case "members_asc":
        result.sort(
          (a, b) =>
            a.member_count - b.member_count ||
            a.name.localeCompare(b.name, "fr")
        );
        break;
    }
    return result;
  }, [activities, searchQuery, sortBy]);

  const hasSearch = searchQuery.trim() !== "";
  const noResults = filteredActivities.length === 0 && activities.length > 0;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Barre recherche + tri + bouton de création */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une activité..."
            className="rounded-xl h-10 pl-9 pr-9"
            aria-label="Rechercher une activité"
          />
          {hasSearch && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortOption)}
        >
          <SelectTrigger className="rounded-xl h-10 px-3 min-w-[200px] text-xs gap-2 border border-input bg-white">
            <span className="flex items-center gap-1.5 text-gray-500">
              <ArrowUpDown size={14} />
              <SelectValue placeholder="Trier par..." />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name_asc">Nom (A → Z)</SelectItem>
            <SelectItem value="name_desc">Nom (Z → A)</SelectItem>
            <SelectItem value="members_desc">Plus populaires</SelectItem>
            <SelectItem value="members_asc">Moins populaires</SelectItem>
          </SelectContent>
        </Select>

        {showCreate ? null : (
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="gap-1.5 rounded-xl text-xs bg-cma-bordeaux text-white h-10 shrink-0"
          >
            <Plus size={14} /> Nouvelle activité
          </Button>
        )}
      </div>

      {/* Active filter summary */}
      {hasSearch && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>
            <span className="font-medium text-gray-700">
              {filteredActivities.length}
            </span>{" "}
            résultat{filteredActivities.length > 1 ? "s" : ""} sur{" "}
            {activities.length}
          </span>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-cma-bordeaux hover:underline flex items-center gap-1"
          >
            <X size={12} aria-hidden="true" /> Réinitialiser
          </button>
        </div>
      )}

      {/* Formulaire de création */}
      {showCreate && (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom de l'activité"
                className="rounded-xl h-9 flex-1"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isPending || !newName.trim()}
                className="rounded-xl text-xs bg-cma-bordeaux text-white gap-1"
              >
                {isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                Créer
              </Button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                }}
                aria-label="Annuler la création"
              >
                <X size={14} className="text-gray-400" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste filtrée + triée */}
      {noResults ? (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Search size={22} className="text-gray-300" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">
              Aucun résultat
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Aucune activité ne correspond à «&nbsp;{searchQuery}&nbsp;»
            </p>
            <Button
              onClick={() => setSearchQuery("")}
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 text-xs"
            >
              <X size={12} aria-hidden="true" /> Réinitialiser la recherche
            </Button>
          </CardContent>
        </Card>
      ) : filteredActivities.length === 0 ? (
        // Aucune activité en DB du tout → message géré par page.tsx parent
        <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
          <ActivityIcon size={14} aria-hidden="true" />
          Commencez par créer votre première activité.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredActivities.map((a) => (
            <Card key={a.id} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                {editingId === a.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-xl h-8 text-sm flex-1"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                    />
                    <Button
                      size="xs"
                      onClick={handleUpdate}
                      disabled={isPending}
                      className="rounded-lg text-xs bg-cma-vert text-white gap-1"
                    >
                      <Check size={12} /> OK
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg text-xs"
                    >
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">
                        {a.name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                        <Users size={10} aria-hidden="true" /> {a.member_count}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingId(a.id);
                          setEditName(a.name);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        aria-label={`Modifier l'activité ${a.name}`}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-40"
                        aria-label={`Supprimer l'activité ${a.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

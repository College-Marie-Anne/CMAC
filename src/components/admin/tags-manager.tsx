"use client";

import { useState, useMemo, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Lock,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
  Search,
  ArrowUpDown,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  createTagAction,
  updateTagAction,
  deleteTagAction,
} from "@/actions/admin";

type TagItem = {
  id: string;
  name: string;
  color: string;
  is_system: boolean;
  post_count: number;
};

type SortOption = "system_first" | "name_asc" | "name_desc" | "usage_desc";

const PRESET_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

export function TagsManager({ tags }: { tags: TagItem[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("system_first");

  const handleCreate = () => {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createTagAction(newName.trim(), newColor);
      if (!result.success) setError(result.error ?? "Erreur");
      else {
        setNewName("");
        setShowCreate(false);
      }
    });
  };

  const startEdit = (tag: TagItem) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setError(null);
  };

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return;
    startTransition(async () => {
      const result = await updateTagAction(
        editingId,
        editName.trim(),
        editColor
      );
      if (!result.success) setError(result.error ?? "Erreur");
      else setEditingId(null);
    });
  };

  const handleDelete = (tagId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteTagAction(tagId);
      if (!result.success) setError(result.error ?? "Erreur");
      else setDeleteConfirm(null);
    });
  };

  // Filtrage + tri (useMemo pour éviter le recalcul à chaque render)
  const filteredTags = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = q
      ? tags.filter((t) => t.name.toLowerCase().includes(q))
      : [...tags];

    switch (sortBy) {
      case "name_asc":
        result.sort((a, b) => a.name.localeCompare(b.name, "fr"));
        break;
      case "name_desc":
        result.sort((a, b) => b.name.localeCompare(a.name, "fr"));
        break;
      case "usage_desc":
        result.sort(
          (a, b) =>
            b.post_count - a.post_count || a.name.localeCompare(b.name, "fr")
        );
        break;
      case "system_first":
        result.sort((a, b) => {
          if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
          return a.name.localeCompare(b.name, "fr");
        });
        break;
    }
    return result;
  }, [tags, searchQuery, sortBy]);

  const hasSearch = searchQuery.trim() !== "";
  const noResults = filteredTags.length === 0 && tags.length > 0;

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
            placeholder="Rechercher un tag..."
            className="rounded-xl h-10 pl-9 pr-9"
            aria-label="Rechercher un tag"
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
            <SelectItem value="system_first">Système en premier</SelectItem>
            <SelectItem value="name_asc">Nom (A → Z)</SelectItem>
            <SelectItem value="name_desc">Nom (Z → A)</SelectItem>
            <SelectItem value="usage_desc">Plus utilisés</SelectItem>
          </SelectContent>
        </Select>

        {showCreate ? null : (
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="gap-1.5 rounded-xl text-xs bg-cma-bordeaux text-white h-10 shrink-0"
          >
            <Plus size={14} /> Nouveau tag
          </Button>
        )}
      </div>

      {/* Active filter summary */}
      {hasSearch && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>
            <span className="font-medium text-gray-700">
              {filteredTags.length}
            </span>{" "}
            résultat{filteredTags.length > 1 ? "s" : ""} sur {tags.length}
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

      {/* Create form */}
      {showCreate && (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-500">Nouveau tag</Label>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                  setError(null);
                }}
                aria-label="Annuler la création"
              >
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom du tag (max 50 caractères)"
              className="rounded-xl h-9"
              maxLength={50}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Couleur :</span>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-transform"
                  style={{
                    background: c,
                    borderColor: newColor === c ? "#1A1A1A" : "transparent",
                    transform: newColor === c ? "scale(1.15)" : "scale(1)",
                  }}
                  aria-label={`Couleur ${c}`}
                />
              ))}
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-6 h-6 rounded-full cursor-pointer border-0"
                aria-label="Couleur personnalisée"
              />
            </div>
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
          </CardContent>
        </Card>
      )}

      {/* Liste */}
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
              Aucun tag ne correspond à «&nbsp;{searchQuery}&nbsp;»
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTags.map((tag) => {
            const isDeleting = deleteConfirm === tag.id;
            const isEditing = editingId === tag.id;
            return (
              <Card key={tag.id} className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded-xl h-8 text-sm"
                        maxLength={50}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            className="w-5 h-5 rounded-full border-2 transition-transform"
                            style={{
                              background: c,
                              borderColor:
                                editColor === c ? "#1A1A1A" : "transparent",
                              transform:
                                editColor === c ? "scale(1.15)" : "scale(1)",
                            }}
                            aria-label={`Couleur ${c}`}
                          />
                        ))}
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="w-5 h-5 rounded-full cursor-pointer border-0"
                          aria-label="Couleur personnalisée"
                        />
                      </div>
                      <div className="flex gap-1.5">
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
                    </div>
                  ) : isDeleting ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-xs text-red-600">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>
                          {tag.post_count > 0
                            ? `${tag.post_count} post(s) utilisent ce tag. Vous devez d'abord les réassigner ou les supprimer.`
                            : `Confirmer la suppression de « ${tag.name} » ?`}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="xs"
                          onClick={() => handleDelete(tag.id)}
                          disabled={isPending || tag.post_count > 0}
                          className="rounded-lg text-xs bg-red-500 text-white hover:bg-red-600 gap-1 disabled:opacity-50"
                        >
                          {isPending ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          Confirmer
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded-lg text-xs"
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ background: tag.color }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {tag.name}
                          </p>
                          <p className="text-[10px] text-gray-400 inline-flex items-center gap-1 mt-0.5">
                            <FileText size={10} aria-hidden="true" />
                            {tag.post_count} post{tag.post_count > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      {tag.is_system ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 shrink-0">
                          <Lock size={10} /> Système
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(tag)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                            aria-label={`Modifier le tag ${tag.name}`}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(tag.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                            aria-label={`Supprimer le tag ${tag.name}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

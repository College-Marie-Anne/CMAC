"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Lock,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
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
};

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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
  };

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return;
    startTransition(async () => {
      const result = await updateTagAction(editingId, editName.trim(), editColor);
      if (!result.success) setError(result.error ?? "Erreur");
      else setEditingId(null);
    });
  };

  const handleDelete = (tagId: string) => {
    startTransition(async () => {
      const result = await deleteTagAction(tagId);
      if (!result.success) setError(result.error ?? "Erreur");
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Create button / form */}
      {showCreate ? (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-500">Nouveau tag</Label>
              <button onClick={() => setShowCreate(false)}>
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom du tag"
              className="rounded-xl h-9"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Couleur :</span>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-transform"
                  style={{
                    background: c,
                    borderColor: newColor === c ? "#1A1A1A" : "transparent",
                    transform: newColor === c ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={isPending || !newName.trim()}
              className="rounded-xl text-xs bg-cma-bordeaux text-white gap-1"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Créer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="gap-1.5 rounded-xl text-xs bg-cma-bordeaux text-white"
        >
          <Plus size={14} /> Nouveau tag
        </Button>
      )}

      {/* Tags grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tags.map((tag) => (
          <Card key={tag.id} className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4">
              {editingId === tag.id ? (
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded-xl h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                  />
                  <div className="flex items-center gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className="w-5 h-5 rounded-full border-2 transition-transform"
                        style={{
                          background: c,
                          borderColor: editColor === c ? "#1A1A1A" : "transparent",
                          transform: editColor === c ? "scale(1.15)" : "scale(1)",
                        }}
                      />
                    ))}
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
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ background: tag.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {tag.name}
                    </span>
                  </div>
                  {tag.is_system ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                      <Lock size={10} /> Système
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(tag)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

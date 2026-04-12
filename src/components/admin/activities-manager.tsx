"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  X,
  Check,
  Users,
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

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Create */}
      {showCreate ? (
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
              <button onClick={() => setShowCreate(false)}>
                <X size={14} className="text-gray-400" />
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="gap-1.5 rounded-xl text-xs bg-cma-bordeaux text-white"
        >
          <Plus size={14} /> Nouvelle activité
        </Button>
      )}

      {/* List */}
      <div className="space-y-2">
        {activities.map((a) => (
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
                      <Users size={10} /> {a.member_count}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(a.id);
                        setEditName(a.name);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
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
    </div>
  );
}

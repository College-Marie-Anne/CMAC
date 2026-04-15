"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { YearSelect } from "@/components/ui/year-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Users,
  Crown,
  AlertTriangle,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { compressImage } from "@/lib/image-compress";

type Promotion = {
  id: string;
  name: string;
  start_date: number;
  end_date: number;
  emblem_url: string | null;
  leader_id: string | null;
  status: string;
  created_at: string;
};

type PromoWithCount = Promotion & {
  memberCount: number;
  leaderName: string | null;
};

type SortOption =
  | "recent"
  | "name_asc"
  | "name_desc"
  | "start_asc"
  | "start_desc"
  | "end_asc"
  | "end_desc";

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromoWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState<number | null>(null);
  const [newEnd, setNewEnd] = useState<number | null>(null);
  const [newEmblem, setNewEmblem] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Upload emblème pour promo existante
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetPromoId, setTargetPromoId] = useState<string | null>(null);

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Confirmation rejet
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);

  // Recherche et tri
  const [searchQuery, setSearchQuery] = useState("");
  const [startYearFrom, setStartYearFrom] = useState<number | null>(null);
  const [startYearTo, setStartYearTo] = useState<number | null>(null);
  const [endYearFrom, setEndYearFrom] = useState<number | null>(null);
  const [endYearTo, setEndYearTo] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const supabase = createClient();

  const fetchPromos = async () => {
    const { data: promos } = await supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!promos) {
      setPromotions([]);
      setLoading(false);
      return;
    }

    // Compter les membres et récupérer le chef pour chaque promo
    const enriched: PromoWithCount[] = await Promise.all(
      promos.map(async (p) => {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("promo_id", p.id);

        let leaderName: string | null = null;
        if (p.leader_id) {
          const { data: leader, error: leaderErr } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", p.leader_id)
            .maybeSingle();
          if (!leaderErr && leader) leaderName = `${leader.first_name} ${leader.last_name}`;
        }

        return { ...p, memberCount: count ?? 0, leaderName };
      })
    );

    setPromotions(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  // Upload emblème vers Supabase Storage
  // Spec §805 : 200x200 max, formats PNG/WebP (transparence préservée — pas de JPEG)
  const uploadEmblem = async (file: File, promoId: string): Promise<string | null> => {
    let toUpload: File;
    try {
      toUpload = await compressImage(file, {
        maxWidth: 200,
        maxHeight: 200,
        // preferJpeg: false → conserve PNG/WebP (transparence)
      });
    } catch {
      toUpload = file;
    }

    const ext = (toUpload.name.split(".").pop() ?? "png").toLowerCase();
    const path = `${promoId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("emblems")
      .upload(path, toUpload, { upsert: true });

    if (uploadError) return null;

    const { data: urlData } = supabase.storage
      .from("emblems")
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  // Créer une promotion
  const handleCreate = async () => {
    if (!newName.trim() || !newStart || !newEnd || newStart > newEnd) {
      setFormError("Tous les champs sont requis");
      return;
    }
    setCreating(true);
    setFormError(null);

    // Vérifier unicité du nom
    const { data: existing } = await supabase
      .from("promotions")
      .select("id")
      .eq("name", newName.trim())
      .maybeSingle();

    if (existing) {
      setFormError("Une promotion avec ce nom existe déjà");
      setCreating(false);
      return;
    }

    const { data: newPromo, error } = await supabase
      .from("promotions")
      .insert({
        name: newName.trim(),
        start_date: newStart,
        end_date: newEnd,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !newPromo) {
      setFormError("Erreur lors de la création");
      setCreating(false);
      return;
    }

    // Upload emblème si fourni
    if (newEmblem) {
      const url = await uploadEmblem(newEmblem, newPromo.id);
      if (url) {
        await supabase
          .from("promotions")
          .update({ emblem_url: url })
          .eq("id", newPromo.id);
      }
    }

    setNewName("");
    setNewStart(null);
    setNewEnd(null);
    setNewEmblem(null);
    setShowForm(false);
    setCreating(false);
    fetchPromos();
  };

  // Approuver une promo pending
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    await supabase
      .from("promotions")
      .update({ status: "active" })
      .eq("id", id);
    setActionLoading(null);
    fetchPromos();
  };

  // Rejeter une promo pending (avec suspension des profils liés)
  const handleReject = async (id: string) => {
    setActionLoading(id);

    // 1. Rejeter la promo
    await supabase
      .from("promotions")
      .update({ status: "rejected" })
      .eq("id", id);

    // 2. Suspendre les profils liés
    await supabase
      .from("profiles")
      .update({ status: "suspended" })
      .eq("promo_id", id)
      .neq("role", "admin");

    setActionLoading(null);
    setRejectConfirm(null);
    fetchPromos();
  };

  // Ajouter/modifier emblème sur une promo existante
  const handleEmblemUpload = async (file: File) => {
    if (!targetPromoId) return;
    setUploadingId(targetPromoId);

    const url = await uploadEmblem(file, targetPromoId);
    if (url) {
      await supabase
        .from("promotions")
        .update({ emblem_url: url })
        .eq("id", targetPromoId);
    }

    setUploadingId(null);
    setTargetPromoId(null);
    fetchPromos();
  };

  // ─── Recherche + tri ───
  // Fonction pure : prend un sous-ensemble (pending/active/rejected) et applique
  // les filtres (nom, plages d'années) puis le tri sélectionné.
  const filterAndSort = (list: PromoWithCount[]): PromoWithCount[] => {
    let result = list;

    const q = searchQuery.trim().toLowerCase();
    if (q) result = result.filter((p) => p.name.toLowerCase().includes(q));

    if (startYearFrom !== null) result = result.filter((p) => p.start_date >= startYearFrom);
    if (startYearTo !== null) result = result.filter((p) => p.start_date <= startYearTo);
    if (endYearFrom !== null) result = result.filter((p) => p.end_date >= endYearFrom);
    if (endYearTo !== null) result = result.filter((p) => p.end_date <= endYearTo);

    const sorted = [...result];
    switch (sortBy) {
      case "name_asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
        break;
      case "name_desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name, "fr"));
        break;
      case "start_asc":
        sorted.sort((a, b) => a.start_date - b.start_date);
        break;
      case "start_desc":
        sorted.sort((a, b) => b.start_date - a.start_date);
        break;
      case "end_asc":
        sorted.sort((a, b) => a.end_date - b.end_date);
        break;
      case "end_desc":
        sorted.sort((a, b) => b.end_date - a.end_date);
        break;
      // "recent" : conserve l'ordre DB (created_at DESC)
    }
    return sorted;
  };

  const pendingPromos = filterAndSort(promotions.filter((p) => p.status === "pending"));
  const activePromos = filterAndSort(promotions.filter((p) => p.status === "active"));
  const rejectedPromos = filterAndSort(promotions.filter((p) => p.status === "rejected"));

  const totalActive = promotions.filter((p) => p.status === "active").length;
  const totalPending = promotions.filter((p) => p.status === "pending").length;
  const totalRejected = promotions.filter((p) => p.status === "rejected").length;
  const totalAll = totalActive + totalPending + totalRejected;
  const filteredTotal = pendingPromos.length + activePromos.length + rejectedPromos.length;

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    startYearFrom !== null ||
    startYearTo !== null ||
    endYearFrom !== null ||
    endYearTo !== null;

  const hasDateFilters =
    startYearFrom !== null ||
    startYearTo !== null ||
    endYearFrom !== null ||
    endYearTo !== null;

  const clearFilters = () => {
    setSearchQuery("");
    setStartYearFrom(null);
    setStartYearTo(null);
    setEndYearFrom(null);
    setEndYearTo(null);
    setSortBy("recent");
  };

  // Calculer jours restants avant expiration (3 jours)
  const daysUntilExpiry = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const expiry = created + 3 * 24 * 60 * 60 * 1000;
    const remaining = Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, remaining);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Input file caché pour l'upload d'emblème */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleEmblemUpload(file);
          e.target.value = "";
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalActive} active(s) &middot; {totalPending} en attente
            {totalRejected > 0 && <> &middot; {totalRejected} rejetée(s)</>}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1.5 rounded-xl text-xs bg-cma-bordeaux text-white"
        >
          <Plus size={14} />
          Nouvelle promotion
        </Button>
      </div>

      {/* Recherche + tri */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search by name */}
          <div className="relative flex-1 min-w-0">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom..."
              className="rounded-xl h-10 pl-9 pr-9"
              aria-label="Rechercher une promotion par nom"
            />
            {searchQuery && (
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

          {/* Sort dropdown */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="rounded-xl h-10 px-3 min-w-[180px] text-xs gap-2 border border-input bg-white">
              <span className="flex items-center gap-1.5 text-gray-500">
                <ArrowUpDown size={14} />
                <SelectValue placeholder="Trier par..." />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récentes</SelectItem>
              <SelectItem value="name_asc">Nom (A → Z)</SelectItem>
              <SelectItem value="name_desc">Nom (Z → A)</SelectItem>
              <SelectItem value="start_asc">Début (ancien → récent)</SelectItem>
              <SelectItem value="start_desc">Début (récent → ancien)</SelectItem>
              <SelectItem value="end_asc">Fin (ancien → récent)</SelectItem>
              <SelectItem value="end_desc">Fin (récent → ancien)</SelectItem>
            </SelectContent>
          </Select>

          {/* Advanced filters toggle */}
          <Button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            variant="outline"
            size="sm"
            className="rounded-xl h-10 gap-1.5 text-xs relative shrink-0"
            aria-expanded={filtersOpen}
            aria-controls="promo-advanced-filters"
          >
            <Filter size={14} />
            Filtres années
            {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {hasDateFilters && (
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cma-or rounded-full border-2 border-white"
                aria-label="Filtres de date actifs"
              />
            )}
          </Button>
        </div>

        {/* Advanced filters panel */}
        {filtersOpen && (
          <Card
            id="promo-advanced-filters"
            className="rounded-2xl border-0 shadow-sm border-l-4"
            style={{ borderLeftColor: "#D4A017" }}
          >
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">
                  Année de début (plage inclusive)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <YearSelect
                    value={startYearFrom}
                    onChange={setStartYearFrom}
                    placeholder="De"
                    variant="light"
                  />
                  <YearSelect
                    value={startYearTo}
                    onChange={setStartYearTo}
                    placeholder="À"
                    variant="light"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">
                  Année de fin (plage inclusive)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <YearSelect
                    value={endYearFrom}
                    onChange={setEndYearFrom}
                    placeholder="De"
                    variant="light"
                  />
                  <YearSelect
                    value={endYearTo}
                    onChange={setEndYearTo}
                    placeholder="À"
                    variant="light"
                  />
                </div>
              </div>
              {hasDateFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setStartYearFrom(null);
                    setStartYearTo(null);
                    setEndYearFrom(null);
                    setEndYearTo(null);
                  }}
                  className="text-xs text-cma-bordeaux hover:underline flex items-center gap-1"
                >
                  <X size={12} /> Réinitialiser les plages de dates
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active filter summary */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              <span className="font-medium text-gray-700">{filteredTotal}</span> résultat
              {filteredTotal > 1 ? "s" : ""} sur {totalAll}
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-cma-bordeaux hover:underline flex items-center gap-1"
            >
              <X size={12} /> Réinitialiser tout
            </button>
          </div>
        )}
      </div>

      {/* Formulaire création */}
      {showForm && (
        <Card className="rounded-2xl border-0 shadow-sm border-l-4" style={{ borderLeftColor: "#D4A017" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Créer une promotion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                <AlertTriangle size={14} /> {formError}
              </div>
            )}
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Nom de la promotion</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Promotion Excellence 2024"
                className="rounded-xl h-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Année de début</Label>
                <YearSelect value={newStart} onChange={setNewStart} placeholder="Début" variant="light" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Année de fin</Label>
                <YearSelect value={newEnd} onChange={setNewEnd} placeholder="Fin" variant="light" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Emblème (PNG ou WebP, max 1 MB)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/png,image/webp"
                  onChange={(e) => setNewEmblem(e.target.files?.[0] ?? null)}
                  className="rounded-xl h-10 text-xs"
                />
                {newEmblem && (
                  <button onClick={() => setNewEmblem(null)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={creating} size="sm" className="rounded-xl gap-1.5 bg-cma-vert text-white hover:bg-cma-vert-dark">
                {creating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {creating ? "Création..." : "Créer la promotion"}
              </Button>
              <Button onClick={() => { setShowForm(false); setFormError(null); }} variant="outline" size="sm" className="rounded-xl">
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Promos en attente */}
      {pendingPromos.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-cma-or" />
            En attente de validation ({pendingPromos.length})
          </h2>
          <div className="space-y-3">
            {pendingPromos.map((promo) => {
              const days = daysUntilExpiry(promo.created_at);
              return (
                <Card key={promo.id} className="rounded-2xl border-0 shadow-sm border-l-4" style={{ borderLeftColor: "#D4A017" }}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{promo.name}</h3>
                        <p className="text-xs text-gray-400 mt-1">{promo.start_date} → {promo.end_date}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400">
                            <Users size={10} className="inline mr-1" />{promo.memberCount} membre(s) lié(s)
                          </span>
                          <span className="text-xs text-gray-400">
                            Créée le {new Date(promo.created_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                      {days <= 1 ? (
                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-red-50 text-red-500 flex items-center gap-1">
                          <AlertTriangle size={10} /> Expire {days === 0 ? "aujourd'hui" : "demain"}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-cma-or/10 text-cma-or">
                          {days}j restants
                        </span>
                      )}
                    </div>

                    {/* Upload emblème lors de l'approbation */}
                    <button
                      onClick={() => {
                        setTargetPromoId(promo.id);
                        fileInputRef.current?.click();
                      }}
                      className="mt-4 w-full p-3 rounded-xl bg-gray-50 border border-dashed border-gray-200 hover:border-cma-or hover:bg-cma-or/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                        {uploadingId === promo.id ? (
                          <><Loader2 size={14} className="animate-spin" /> Upload en cours...</>
                        ) : (
                          <><Upload size={14} /> Ajouter l&apos;emblème avant d&apos;approuver (optionnel)</>
                        )}
                      </div>
                    </button>
                    {promo.emblem_url && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-cma-vert">
                        <CheckCircle2 size={12} /> Emblème ajouté
                      </div>
                    )}

                    {/* Actions */}
                    {rejectConfirm === promo.id ? (
                      <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
                        <p className="text-xs text-red-600 mb-3">
                          <AlertTriangle size={12} className="inline mr-1" />
                          <strong>Attention :</strong> Le rejet suspendra les {promo.memberCount} compte(s) lié(s) à cette promotion. Continuer ?
                        </p>
                        <div className="flex gap-2">
                          <Button onClick={() => handleReject(promo.id)} disabled={actionLoading === promo.id} size="sm" className="rounded-lg text-xs bg-red-500 text-white hover:bg-red-600 gap-1">
                            {actionLoading === promo.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                            Confirmer le rejet
                          </Button>
                          <Button onClick={() => setRejectConfirm(null)} variant="outline" size="sm" className="rounded-lg text-xs">
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-4">
                        <Button onClick={() => handleApprove(promo.id)} disabled={actionLoading === promo.id} size="sm" className="rounded-lg text-xs flex-1 bg-cma-vert text-white gap-1">
                          {actionLoading === promo.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Approuver
                        </Button>
                        <Button onClick={() => setRejectConfirm(promo.id)} size="sm" variant="outline" className="rounded-lg text-xs flex-1 text-red-500 border-red-200 gap-1 hover:bg-red-50">
                          <XCircle size={12} /> Rejeter
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Promos actives */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <GraduationCap size={18} className="text-cma-vert" />
          Promotions actives ({activePromos.length})
        </h2>
        {activePromos.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                {hasActiveFilters ? (
                  <Search size={24} className="text-gray-300" />
                ) : (
                  <GraduationCap size={24} className="text-gray-300" />
                )}
              </div>
              {hasActiveFilters && totalActive > 0 ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun résultat</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Aucune promotion active ne correspond à vos filtres ({totalActive} au total)
                  </p>
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5 text-xs"
                  >
                    <X size={12} /> Réinitialiser les filtres
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucune promotion active</h3>
                  <p className="text-sm text-gray-400">Créez votre première promotion avec le bouton ci-dessus</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePromos.map((promo) => (
              <Card key={promo.id} className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  {/* Emblème ou placeholder */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-cma-bordeaux/5">
                      {promo.emblem_url ? (
                        <Image
                          src={promo.emblem_url}
                          alt={promo.name}
                          width={56}
                          height={56}
                          className="object-cover"
                          style={{ width: 56, height: 56 }}
                        />
                      ) : (
                        <GraduationCap size={24} className="text-cma-bordeaux/40" />
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-cma-vert/10 text-cma-vert block mb-1">
                        active
                      </span>
                      <span className="text-[10px] text-gray-400">
                        <Users size={10} className="inline mr-0.5" />{promo.memberCount}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-gray-900">{promo.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{promo.start_date} → {promo.end_date}</p>

                  {/* Chef de promo */}
                  {promo.leaderName && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-cma-or">
                      <Crown size={12} />
                      <span>Chef : {promo.leaderName}</span>
                    </div>
                  )}

                  {/* Bouton emblème */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTargetPromoId(promo.id);
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadingId === promo.id}
                    className="mt-3 w-full rounded-lg text-xs gap-1 text-cma-or border-cma-or/30 hover:bg-cma-or/5"
                  >
                    {uploadingId === promo.id ? (
                      <><Loader2 size={12} className="animate-spin" /> Upload...</>
                    ) : promo.emblem_url ? (
                      <><ImageIcon size={12} /> Changer l&apos;emblème</>
                    ) : (
                      <><Upload size={12} /> Ajouter l&apos;emblème</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Promos rejetées */}
      {rejectedPromos.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <XCircle size={18} className="text-red-400" />
            Rejetées ({rejectedPromos.length})
          </h2>
          <div className="space-y-2">
            {rejectedPromos.map((promo) => (
              <Card key={promo.id} className="rounded-2xl border-0 shadow-sm opacity-60">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{promo.name}</p>
                    <p className="text-xs text-gray-400">
                      {promo.start_date} → {promo.end_date}
                      <span className="ml-2">
                        <Users size={10} className="inline mr-0.5" />{promo.memberCount} profil(s) affecté(s)
                      </span>
                    </p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-red-50 text-red-400">
                    rejetée
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

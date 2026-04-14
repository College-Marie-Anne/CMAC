"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { typedResolver } from "@/lib/form-resolver";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  Plus,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import Link from "next/link";
import { GoldenParticles } from "@/components/ui/golden-particles-lazy";
import { YearSelect } from "@/components/ui/year-select";
import {
  step1Schema,
  step2AlumniSchema,
  step2S4Schema,
  step2StudentSchema,
  eleveSubTypeSchema,
  step3Schema,
  FILIERES,
  CLASSES,
  INSTITUTION_TYPES,
  type Step1Data,
  type Step2AlumniData,
  type Step2S4Data,
  type Step2StudentData,
  type EleveSubTypeData,
  type Step3Data,
  type RegisterFormData,
} from "@/lib/validations/register";
import { registerAction } from "@/actions/register";
import { createClient } from "@/utils/supabase/client";

// ─── Types ───

type WizardStep =
  | "step1"
  | "eleve_sub"
  | "step2_alumni"
  | "step2_s4"
  | "step2_student"
  | "step3";

const STEP_TITLES: Record<WizardStep, string> = {
  step1: "Profil de base",
  eleve_sub: "Type d'élève",
  step2_alumni: "Parcours Alumni",
  step2_s4: "Parcours S4",
  step2_student: "Parcours S1-S3",
  step3: "Création du compte",
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction === 0 ? 0 : direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction === 0 ? 0 : direction < 0 ? 60 : -60,
    opacity: 0,
  }),
};

// ─── Styles partagés ───

const inputClass =
  "w-full h-11 rounded-xl text-sm text-white placeholder:text-white/30 disabled:opacity-50";
const inputStyle = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.1)",
};
const inputErrorStyle = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(220,38,38,0.5)",
};
const errorClass = "mt-1.5 text-xs";
const errorColor = { color: "#fca5a5" } as const;
const labelColor = { color: "#F5DEB3" } as const;
const hintColor = { color: "rgba(245,222,179,0.5)" } as const;

// ─── Composant tag pour multi-saisie ───

function TagInput({
  values,
  onChange,
  max,
  placeholder,
  disabled,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  max: number;
  placeholder: string;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");

  // Fonction de normalisation pour éviter les doublons
  const normalize = (str: string) =>
    str
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Supprime accents
      .replace(/[^a-z0-9\s-]/g, "") // Garde lettres, chiffres, espaces, tirets
      .replace(/\s+/g, " "); // Normalise espaces

  const addTag = (tag?: string) => {
    const toAdd = tag || input.trim();
    if (!toAdd) return;

    // Séparer par virgules, points-virgules, etc.
    const separators = /[;,|]/;
    const tags = toAdd.split(separators).map(t => t.trim()).filter(t => t);

    const newValues = [...values];
    let added = false;

    for (const t of tags) {
      const normalized = normalize(t);
      if (normalized && newValues.length < max && !newValues.some(v => normalize(v) === normalized)) {
        newValues.push(t.trim());
        added = true;
      }
    }

    if (added) {
      onChange(newValues);
      setInput("");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v, i) => (
          <span
            key={i}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs"
            style={{ background: "rgba(212,160,23,0.15)", color: "#F5DEB3" }}
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              disabled={disabled}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      {values.length < max && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={() => addTag()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className={inputClass}
            style={inputStyle}
          />
          <Button
            type="button"
            onClick={addTag}
            disabled={disabled || !input.trim()}
            size="icon"
            className="shrink-0 h-11 w-11 rounded-xl"
            style={{ background: "rgba(212,160,23,0.2)" }}
          >
            <Plus size={16} style={{ color: "#F5DEB3" }} />
          </Button>
        </div>
      )}
      <p className="mt-1 text-xs" style={hintColor}>
        {values.length}/{max}
      </p>
    </div>
  );
}

// ─── Composant principal ───

export function RegisterForm() {
  const [currentStep, setCurrentStep] = useState<WizardStep>("step1");
  const [direction, setDirection] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Données accumulées
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [eleveSubType, setEleveSubType] = useState<"s4" | "s1_s3" | null>(null);
  const [step2AlumniData, setStep2AlumniData] = useState<Step2AlumniData | null>(null);
  const [step2S4Data, setStep2S4Data] = useState<Step2S4Data | null>(null);
  const [step2StudentData, setStep2StudentData] = useState<Step2StudentData | null>(null);

  // Ref pour focus auto sur changement d'étape
  const cardRef = useRef<HTMLDivElement>(null);

  // Données DB
  const [promotions, setPromotions] = useState<{ id: string; name: string; end_date: number | null }[]>([]);
  const [activities, setActivities] = useState<{ id: string; name: string }[]>([]);

  // Focus + scroll en haut de la carte à chaque changement d'étape
  // (skip les 2 premiers rendus : montage initial + premier step)
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    if (renderCount.current <= 2) return;

    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstInput = cardRef.current.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), button[type="button"]:not([disabled])'
      );
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 400);
      }
    }
  }, [currentStep]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("promotions")
      .select("id, name, end_date")
      .eq("status", "active")
      .then(({ data }) => setPromotions(data ?? []));
    supabase
      .from("activities")
      .select("id, name")
      .then(({ data }) => setActivities(data ?? []));
  }, []);

  const goTo = (step: WizardStep, dir: number) => {
    setDirection(dir);
    setServerError(null);
    setCurrentStep(step);
  };

  const getStepNumber = () => {
    if (currentStep === "step1") return 1;
    if (currentStep === "eleve_sub") return 2;
    if (currentStep.startsWith("step2")) return 2;
    return 3;
  };

  const handleFinalSubmit = (step3: Step3Data) => {
    if (!step1Data) return;

    const step2Type =
      step1Data.status_type === "ancienne"
        ? "alumni"
        : eleveSubType === "s4"
          ? "s4"
          : "student";

    const formData: RegisterFormData = {
      step1: step1Data,
      step2_type: step2Type as "alumni" | "s4" | "student",
      step2_alumni: step2AlumniData ?? undefined,
      step2_s4: step2S4Data ?? undefined,
      step2_student: step2StudentData ?? undefined,
      step3: step3,
    };

    setServerError(null);
    startTransition(async () => {
      const result = await registerAction(formData);
      if (!result.success && result.error) {
        setServerError(result.error);
      }
    });
  };

  return (
    <motion.div
      className="relative flex min-h-screen w-full items-center justify-center px-5 py-8 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
    >
      <GoldenParticles />

      <div className="relative w-full max-w-[440px] mx-auto">
        {/* Header */}
        <div
          className="flex items-center justify-center mb-6"
        >
          <Image
            src="/CMAC.jpeg"
            alt="CMA Connect"
            width={56}
            height={56}
            className="rounded-full object-cover scale-125 overflow-hidden"
            style={{
              border: "2px solid rgba(212,160,23,0.3)",
              width: 56,
              height: 56,
            }}
            priority
          />
        </div>

        {/* Barre de progression */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                style={{
                  background:
                    getStepNumber() >= step
                      ? "#D4A017"
                      : "rgba(255,255,255,0.1)",
                  color:
                    getStepNumber() >= step ? "#3a000f" : "rgba(255,255,255,0.3)",
                }}
              >
                {getStepNumber() > step ? (
                  <CheckCircle2 size={16} />
                ) : (
                  step
                )}
              </div>
              {step < 3 && (
                <div
                  className="w-12 h-[2px] rounded-full transition-all"
                  style={{
                    background:
                      getStepNumber() > step
                        ? "#D4A017"
                        : "rgba(255,255,255,0.1)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Titre de l'étape */}
        <h1
          className="text-center text-lg font-semibold text-white mb-1"
        >
          {STEP_TITLES[currentStep]}
        </h1>
        <p className="text-center text-xs mb-6" style={hintColor}>
          Étape {getStepNumber()} sur 3
        </p>

        {/* Erreur serveur */}
        <AnimatePresence>
          {serverError && (
            <motion.div
              className="mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
              style={{
                background: "rgba(220,38,38,0.12)",
                border: "1px solid rgba(220,38,38,0.25)",
                color: "#fca5a5",
              }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Carte */}
        <div
          ref={cardRef}
          className="rounded-2xl px-6 py-8 sm:px-8"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(212,160,23,0.15)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
          }}
        >
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {/* ─── ÉTAPE 1 ─── */}
            {currentStep === "step1" && (
              <Step1Form
                key="step1"
                direction={direction}
                defaultValues={step1Data}
                onNext={(data) => {
                  setStep1Data(data);
                  if (data.status_type === "ancienne") {
                    goTo("step2_alumni", 1);
                  } else {
                    goTo("eleve_sub", 1);
                  }
                }}
              />
            )}

            {/* ─── SOUS-SÉLECTION ÉLÈVE ─── */}
            {currentStep === "eleve_sub" && (
              <EleveSubForm
                key="eleve_sub"
                direction={direction}
                onBack={() => goTo("step1", -1)}
                onNext={(sub) => {
                  setEleveSubType(sub);
                  goTo(sub === "s4" ? "step2_s4" : "step2_student", 1);
                }}
              />
            )}

            {/* ─── ÉTAPE 2A — ALUMNI ─── */}
            {currentStep === "step2_alumni" && (
              <Step2AlumniForm
                key="step2_alumni"
                direction={direction}
                promotions={promotions}
                activities={activities}
                defaultValues={step2AlumniData}
                onBack={() => goTo("step1", -1)}
                onNext={(data) => {
                  setStep2AlumniData(data);
                  goTo("step3", 1);
                }}
              />
            )}

            {/* ─── ÉTAPE 2B — S4 ─── */}
            {currentStep === "step2_s4" && (
              <Step2S4Form
                key="step2_s4"
                direction={direction}
                promotions={promotions}
                activities={activities}
                defaultValues={step2S4Data}
                onBack={() => goTo("eleve_sub", -1)}
                onNext={(data) => {
                  setStep2S4Data(data);
                  goTo("step3", 1);
                }}
              />
            )}

            {/* ─── ÉTAPE 2C — S1-S3 ─── */}
            {currentStep === "step2_student" && (
              <Step2StudentForm
                key="step2_student"
                direction={direction}
                activities={activities}
                defaultValues={step2StudentData}
                onBack={() => goTo("eleve_sub", -1)}
                onNext={(data) => {
                  setStep2StudentData(data);
                  goTo("step3", 1);
                }}
              />
            )}

            {/* ─── ÉTAPE 3 ─── */}
            {currentStep === "step3" && (
              <Step3Form
                key="step3"
                direction={direction}
                isPending={isPending}
                onBack={() => {
                  if (step1Data?.status_type === "ancienne") goTo("step2_alumni", -1);
                  else if (eleveSubType === "s4") goTo("step2_s4", -1);
                  else goTo("step2_student", -1);
                }}
                onSubmit={handleFinalSubmit}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Lien login */}
        <p
          className="text-center text-sm mt-6"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Déjà un compte ?{" "}
          <Link href="/login" scroll={false} className="font-medium" style={{ color: "#F5DEB3" }}>
            Se connecter
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════
//  SOUS-COMPOSANTS PAR ÉTAPE
// ═══════════════════════════════════════════

// ─── Étape 1 ───

function Step1Form({
  direction,
  defaultValues,
  onNext,
}: {
  direction: number;
  defaultValues: Step1Data | null;
  onNext: (data: Step1Data) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: typedResolver<Step1Data>(step1Schema),
    defaultValues: defaultValues ?? {
      first_name: "",
      last_name: "",
      date_of_birth: "",
      nationality: [],
      country: "",
      status_type: undefined,
    },
  });

  const nationality = watch("nationality");

  return (
    <motion.form
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit(onNext)}
      className="space-y-4"
    >
      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>
          Prénoms
        </Label>
        <Input
          {...register("first_name")}
          placeholder="Marie-Anne Joséphine"
          className={inputClass}
          style={errors.first_name ? inputErrorStyle : inputStyle}
        />
        {errors.first_name && (
          <p className={errorClass} style={errorColor}>{errors.first_name.message}</p>
        )}
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>
          Nom
        </Label>
        <Input
          {...register("last_name")}
          placeholder="Dupont"
          className={inputClass}
          style={errors.last_name ? inputErrorStyle : inputStyle}
        />
        {errors.last_name && (
          <p className={errorClass} style={errorColor}>{errors.last_name.message}</p>
        )}
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>
          Date de naissance
        </Label>
        <Input
          type="date"
          {...register("date_of_birth")}
          className={`${inputClass} [color-scheme:dark]`}
          style={errors.date_of_birth ? inputErrorStyle : inputStyle}
        />
        {errors.date_of_birth && (
          <p className={errorClass} style={errorColor}>{errors.date_of_birth.message}</p>
        )}
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>
          Nationalité(s)
        </Label>
        <TagInput
          values={nationality}
          onChange={(v) => setValue("nationality", v, { shouldValidate: true })}
          max={5}
          placeholder="Ex: Haïtienne"
        />
        {errors.nationality && (
          <p className={errorClass} style={errorColor}>{errors.nationality.message}</p>
        )}
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>
          Pays de résidence
        </Label>
        <Input
          {...register("country")}
          placeholder="Canada"
          className={inputClass}
          style={errors.country ? inputErrorStyle : inputStyle}
        />
        {errors.country && (
          <p className={errorClass} style={errorColor}>{errors.country.message}</p>
        )}
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>
          Vous êtes
        </Label>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Vous êtes">
          {[
            { value: "ancienne" as const, label: "Ancienne élève" },
            { value: "eleve_actuelle" as const, label: "Élève actuelle" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={watch("status_type") === opt.value}
              onClick={() =>
                setValue("status_type", opt.value, { shouldValidate: true })
              }
              className="h-11 rounded-xl text-sm font-medium transition-all"
              style={{
                background:
                  watch("status_type") === opt.value
                    ? "rgba(212,160,23,0.2)"
                    : "rgba(255,255,255,0.06)",
                border:
                  watch("status_type") === opt.value
                    ? "1px solid #D4A017"
                    : "1px solid rgba(255,255,255,0.1)",
                color:
                  watch("status_type") === opt.value ? "#F5DEB3" : "rgba(255,255,255,0.5)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {errors.status_type && (
          <p className={errorClass} style={errorColor}>{errors.status_type.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-11 rounded-xl text-sm font-semibold mt-2 gap-2"
        style={{
          background: "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)",
          color: "#3a000f",
        }}
      >
        Continuer
        <ArrowRight size={16} />
      </Button>
    </motion.form>
  );
}

// ─── Sous-sélection élève ───

function EleveSubForm({
  direction,
  onBack,
  onNext,
}: {
  direction: number;
  onBack: () => void;
  onNext: (sub: "s4" | "s1_s3") => void;
}) {
  const {
    setValue,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EleveSubTypeData>({
    resolver: typedResolver<EleveSubTypeData>(eleveSubTypeSchema),
  });

  return (
    <motion.form
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit((d) => onNext(d.sub_type))}
      className="space-y-4"
    >
      <p className="text-sm text-center mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
        Quelle est votre situation actuelle ?
      </p>
      <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-label="Situation actuelle">
        {[
          { value: "s4" as const, label: "Finissante (S4)", desc: "Dernière année au CMA" },
          { value: "s1_s3" as const, label: "S1 – S3", desc: "Encore en cours de scolarité" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={watch("sub_type") === opt.value}
            onClick={() => setValue("sub_type", opt.value, { shouldValidate: true })}
            className="rounded-xl p-4 text-left transition-all"
            style={{
              background:
                watch("sub_type") === opt.value
                  ? "rgba(212,160,23,0.15)"
                  : "rgba(255,255,255,0.06)",
              border:
                watch("sub_type") === opt.value
                  ? "1px solid #D4A017"
                  : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span className="text-sm font-medium" style={{ color: watch("sub_type") === opt.value ? "#F5DEB3" : "rgba(255,255,255,0.7)" }}>
              {opt.label}
            </span>
            <span className="block text-xs mt-0.5" style={hintColor}>{opt.desc}</span>
          </button>
        ))}
      </div>
      {errors.sub_type && (
        <p className={errorClass} style={errorColor}>{errors.sub_type.message}</p>
      )}

      <div className="flex gap-3 mt-2">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="h-11 rounded-xl gap-1"
          style={{ backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.15)", color: "#F5DEB3" }}
        >
          <ArrowLeft size={14} />
          Retour
        </Button>
        <Button
          type="submit"
          className="flex-1 h-11 rounded-xl text-sm font-semibold gap-2"
          style={{
            background: "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)",
            color: "#3a000f",
          }}
        >
          Continuer
          <ArrowRight size={16} />
        </Button>
      </div>
    </motion.form>
  );
}

// ─── Étape 2A — Alumni ───

function Step2AlumniForm({
  direction,
  promotions,
  activities,
  defaultValues,
  onBack,
  onNext,
}: {
  direction: number;
  promotions: { id: string; name: string; end_date: number | null }[];
  activities: { id: string; name: string }[];
  defaultValues: Step2AlumniData | null;
  onBack: () => void;
  onNext: (data: Step2AlumniData) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<Step2AlumniData>({
    resolver: typedResolver<Step2AlumniData>(step2AlumniSchema),
    defaultValues: defaultValues ?? {
      promotion_name: "",
      is_new_promo: false,
      promo_start_date: 0 as number,
      filiere: undefined,
      activities: [],
      institution_type: undefined,
      institution_name: "",
      study_field: "",
      degree_level: "",
      start_year: undefined,
      end_year: undefined,
      job_title: "",
      job_company: "",
    },
  });

  const selectedActivities = watch("activities");
  const isNewPromo = watch("is_new_promo");
  const selectedPromoName = watch("promotion_name");
  const [promoSearch, setPromoSearch] = useState("");
  const promoSearchRef = useRef<HTMLInputElement | null>(null);

  const filteredPromotions = promotions.filter((p) =>
    p.name.toLowerCase().includes(promoSearch.toLowerCase())
  );

  const handlePromotionChange = (value: string) => {
    if (value === "__other__") {
      setValue("is_new_promo", true);
      setValue("promotion_name", "");

      setTimeout(() => {
        const input = document.getElementById("promotion_name_input") as HTMLInputElement | null;
        input?.focus();
      }, 0);

      return;
    }

    setValue("promotion_name", value, { shouldValidate: true });
  };

  const handleSelectOpenChange = (open: boolean) => {
    if (open) {
      setPromoSearch("");
      setTimeout(() => promoSearchRef.current?.focus(), 0);
    }
  };

  // Année de fin auto-verrouillée depuis promotions.end_date
  const promoEndDate = (() => {
    if (isNewPromo || !selectedPromoName) return null;
    const promo = promotions.find((p) => p.name === selectedPromoName);
    if (!promo?.end_date) return null;
    return String(promo.end_date);
  })();

  return (
    <motion.form
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit(onNext)}
      className="space-y-4 max-h-[60vh] overflow-y-auto pr-1"
    >
      {/* Promotion */}
      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Promotion</Label>
        {!isNewPromo ? (
          <Select
            value={watch("promotion_name")}
            onOpenChange={handleSelectOpenChange}
            onValueChange={handlePromotionChange}
          >
            <SelectTrigger className={inputClass} style={inputStyle}>
              <SelectValue placeholder="Sélectionnez votre promotion" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-3 py-2">
                <input
                  ref={promoSearchRef}
                  value={promoSearch}
                  onChange={(e) => setPromoSearch(e.target.value)}
                  placeholder="Rechercher une promotion"
                  className="w-full h-9 rounded-xl border border-transparent bg-input/50 px-3 py-1 text-sm text-white transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                  style={inputStyle}
                />
              </div>
              {filteredPromotions.map((p) => (
                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
              ))}
              {filteredPromotions.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Aucune promotion trouvée</div>
              )}
              <SelectItem key="other" value="__other__">Autre</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="promotion_name_input"
            {...register("promotion_name")}
            placeholder="Nom de la promotion"
            className={inputClass}
            style={inputStyle}
          />
        )}
        <label className="flex items-center gap-2 mt-2 text-xs cursor-pointer" style={hintColor}>
          <Checkbox
            checked={isNewPromo}
            onCheckedChange={(c) => {
              setValue("is_new_promo", !!c);
              setValue("promotion_name", "");
            }}
          />
          Ma promotion n&apos;est pas dans la liste
        </label>
        {errors.promotion_name && (
          <p className={errorClass} style={errorColor}>{errors.promotion_name.message}</p>
        )}
      </div>

      {/* Dates */}
      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Année de début</Label>
        <Controller name="promo_start_date" control={control} render={({ field }) => (
          <YearSelect value={field.value || null} onChange={field.onChange} placeholder="Sélectionner l'année" />
        )} />
        {errors.promo_start_date && <p className={errorClass} style={errorColor}>{errors.promo_start_date.message}</p>}
      </div>

      {/* Année de fin (auto-verrouillée) */}
      {promoEndDate && (
        <div className="rounded-xl px-4 py-3" style={{ background: "rgba(0,107,63,0.15)", border: "1px solid rgba(0,107,63,0.3)" }}>
          <p className="text-xs" style={{ color: "#8fd6b4" }}>
            Année de fin de promotion : <span className="font-medium">{promoEndDate}</span>
          </p>
        </div>
      )}

      {/* Filière */}
      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Filière</Label>
        <Select value={watch("filiere")} onValueChange={(v) => setValue("filiere", v as Step2AlumniData["filiere"], { shouldValidate: true })}>
          <SelectTrigger className={inputClass} style={inputStyle}>
            <SelectValue placeholder="Sélectionnez" />
          </SelectTrigger>
          <SelectContent>
            {FILIERES.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
          </SelectContent>
        </Select>
        {errors.filiere && <p className={errorClass} style={errorColor}>{errors.filiere.message}</p>}
      </div>

      {/* Activités */}
      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Activités parascolaires</Label>
        <div className="flex flex-wrap gap-2">
          {activities.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={selectedActivities.includes(a.id)}
              onClick={() => {
                const current = selectedActivities;
                const next = current.includes(a.id)
                  ? current.filter((id) => id !== a.id)
                  : [...current, a.id];
                setValue("activities", next);
              }}
              className="rounded-lg px-3 py-1.5 text-xs transition-all"
              style={{
                background: selectedActivities.includes(a.id) ? "rgba(212,160,23,0.2)" : "rgba(255,255,255,0.06)",
                border: selectedActivities.includes(a.id) ? "1px solid #D4A017" : "1px solid rgba(255,255,255,0.1)",
                color: selectedActivities.includes(a.id) ? "#F5DEB3" : "rgba(255,255,255,0.5)",
              }}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Parcours post-CMA */}
      <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <p className="text-xs font-medium mb-3" style={labelColor}>Parcours post-CMA</p>

        <div className="space-y-3">
          <Select value={watch("institution_type")} onValueChange={(v) => setValue("institution_type", v as Step2AlumniData["institution_type"], { shouldValidate: true })}>
            <SelectTrigger className={inputClass} style={inputStyle}>
              <SelectValue placeholder="Type d'institution" />
            </SelectTrigger>
            <SelectContent>
              {INSTITUTION_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
            </SelectContent>
          </Select>
          {errors.institution_type && <p className={errorClass} style={errorColor}>{errors.institution_type.message}</p>}

          <Input {...register("institution_name")} placeholder="Nom de l'institution" className={inputClass} style={errors.institution_name ? inputErrorStyle : inputStyle} />
          {errors.institution_name && <p className={errorClass} style={errorColor}>{errors.institution_name.message}</p>}

          <Input {...register("study_field")} placeholder="Domaine d'études" className={inputClass} style={errors.study_field ? inputErrorStyle : inputStyle} />
          {errors.study_field && <p className={errorClass} style={errorColor}>{errors.study_field.message}</p>}

          <Input {...register("degree_level")} placeholder="Niveau (Licence, Master...)" className={inputClass} style={inputStyle} />

          <div className="grid grid-cols-2 gap-3">
            <Input {...register("start_year")} type="number" placeholder="Année début" className={inputClass} style={inputStyle} />
            <Input {...register("end_year")} type="number" placeholder="Année fin" className={inputClass} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Métier actuel */}
      <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <p className="text-xs font-medium mb-3" style={labelColor}>Métier actuel</p>
        <div className="space-y-3">
          <Input {...register("job_title")} placeholder="Titre du poste" className={inputClass} style={errors.job_title ? inputErrorStyle : inputStyle} />
          {errors.job_title && <p className={errorClass} style={errorColor}>{errors.job_title.message}</p>}
          <Input {...register("job_company")} placeholder="Entreprise (si applicable)" className={inputClass} style={inputStyle} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <Button type="button" onClick={onBack} variant="outline" className="h-11 rounded-xl gap-1" style={{ backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.15)", color: "#F5DEB3" }}>
          <ArrowLeft size={14} /> Retour
        </Button>
        <Button type="submit" className="flex-1 h-11 rounded-xl text-sm font-semibold gap-2" style={{ background: "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)", color: "#3a000f" }}>
          Continuer <ArrowRight size={16} />
        </Button>
      </div>
    </motion.form>
  );
}

// ─── Étape 2B — S4 ───

function Step2S4Form({
  direction,
  promotions,
  activities,
  defaultValues,
  onBack,
  onNext,
}: {
  direction: number;
  promotions: { id: string; name: string; end_date: number | null }[];
  activities: { id: string; name: string }[];
  defaultValues: Step2S4Data | null;
  onBack: () => void;
  onNext: (data: Step2S4Data) => void;
}) {
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<Step2S4Data>({
    resolver: typedResolver<Step2S4Data>(step2S4Schema),
    defaultValues: defaultValues ?? { promotion_name: "", promo_start_date: 0 as number, filiere: undefined, activities: [], desired_study_fields: [] },
  });

  const selectedActivities = watch("activities");
  const desiredFields = watch("desired_study_fields");
  const selectedPromoName = watch("promotion_name");
  const [promoSearch, setPromoSearch] = useState("");
  const promoSearchRef = useRef<HTMLInputElement | null>(null);

  const filteredPromotions = promotions.filter((p) =>
    p.name.toLowerCase().includes(promoSearch.toLowerCase())
  );

  const handleSelectOpenChange = (open: boolean) => {
    if (open) {
      setPromoSearch("");
      setTimeout(() => promoSearchRef.current?.focus(), 0);
    }
  };

  const promoEndDate = (() => {
    if (!selectedPromoName) return null;
    const promo = promotions.find((p) => p.name === selectedPromoName);
    if (!promo?.end_date) return null;
    return String(promo.end_date);
  })();

  return (
    <motion.form custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Promotion actuelle</Label>
        <Select value={watch("promotion_name")} onOpenChange={handleSelectOpenChange} onValueChange={(v) => setValue("promotion_name", v, { shouldValidate: true })}>
          <SelectTrigger className={inputClass} style={inputStyle}><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
          <SelectContent>
            <div className="px-3 py-2">
              <input
                ref={promoSearchRef}
                value={promoSearch}
                onChange={(e) => setPromoSearch(e.target.value)}
                placeholder="Rechercher une promotion"
                className="w-full h-9 rounded-xl border border-transparent bg-input/50 px-3 py-1 text-sm text-white transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                style={inputStyle}
              />
            </div>
            {filteredPromotions.map((p) => (
              <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
            ))}
            {filteredPromotions.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Aucune promotion trouvée</div>
            )}
          </SelectContent>
        </Select>
        {errors.promotion_name && <p className={errorClass} style={errorColor}>{errors.promotion_name.message}</p>}
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Année de début</Label>
        <Controller name="promo_start_date" control={control} render={({ field }) => (
          <YearSelect value={field.value || null} onChange={field.onChange} placeholder="Sélectionner l'année" />
        )} />
        {errors.promo_start_date && <p className={errorClass} style={errorColor}>{errors.promo_start_date.message}</p>}
      </div>

      {promoEndDate && (
        <div className="rounded-xl px-4 py-3" style={{ background: "rgba(0,107,63,0.15)", border: "1px solid rgba(0,107,63,0.3)" }}>
          <p className="text-xs" style={{ color: "#8fd6b4" }}>
            Année de fin de promotion : <span className="font-medium">{promoEndDate}</span>
          </p>
        </div>
      )}

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Filière</Label>
        <Select value={watch("filiere")} onValueChange={(v) => setValue("filiere", v as Step2S4Data["filiere"], { shouldValidate: true })}>
          <SelectTrigger className={inputClass} style={inputStyle}><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
          <SelectContent>{FILIERES.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}</SelectContent>
        </Select>
        {errors.filiere && <p className={errorClass} style={errorColor}>{errors.filiere.message}</p>}
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Activités parascolaires</Label>
        <div className="flex flex-wrap gap-2">
          {activities.map((a) => (
            <button key={a.id} type="button" aria-pressed={selectedActivities.includes(a.id)} onClick={() => { const next = selectedActivities.includes(a.id) ? selectedActivities.filter((id) => id !== a.id) : [...selectedActivities, a.id]; setValue("activities", next); }} className="rounded-lg px-3 py-1.5 text-xs transition-all" style={{ background: selectedActivities.includes(a.id) ? "rgba(212,160,23,0.2)" : "rgba(255,255,255,0.06)", border: selectedActivities.includes(a.id) ? "1px solid #D4A017" : "1px solid rgba(255,255,255,0.1)", color: selectedActivities.includes(a.id) ? "#F5DEB3" : "rgba(255,255,255,0.5)" }}>
              {a.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Domaines d&apos;études désirés</Label>
        <TagInput values={desiredFields} onChange={(v) => setValue("desired_study_fields", v, { shouldValidate: true })} max={3} placeholder="Ex: Médecine" />
        {errors.desired_study_fields && <p className={errorClass} style={errorColor}>{errors.desired_study_fields.message}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" onClick={onBack} variant="outline" className="h-11 rounded-xl gap-1" style={{ backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.15)", color: "#F5DEB3" }}><ArrowLeft size={14} /> Retour</Button>
        <Button type="submit" className="flex-1 h-11 rounded-xl text-sm font-semibold gap-2" style={{ background: "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)", color: "#3a000f" }}>Continuer <ArrowRight size={16} /></Button>
      </div>
    </motion.form>
  );
}

// ─── Étape 2C — S1-S3 ───

function Step2StudentForm({
  direction,
  activities,
  defaultValues,
  onBack,
  onNext,
}: {
  direction: number;
  activities: { id: string; name: string }[];
  defaultValues: Step2StudentData | null;
  onBack: () => void;
  onNext: (data: Step2StudentData) => void;
}) {
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<Step2StudentData>({
    resolver: typedResolver<Step2StudentData>(step2StudentSchema),
    defaultValues: defaultValues ?? { class: undefined, enrollment_date: 0 as number, activities: [], desired_study_fields: [] },
  });

  const selectedClass = watch("class");
  const enrollmentDate = watch("enrollment_date");
  const selectedActivities = watch("activities");
  const desiredFields = watch("desired_study_fields");

  // Calcul automatique de la date de fin
  const expectedEndDate = (() => {
    if (!enrollmentDate || !selectedClass) return "";
    const d = new Date(enrollmentDate);
    const years = selectedClass === "S1" ? 3 : selectedClass === "S2" ? 2 : 1;
    d.setFullYear(d.getFullYear() + years);
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  })();

  return (
    <motion.form custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Classe actuelle</Label>
        <Select value={selectedClass} onValueChange={(v) => setValue("class", v as Step2StudentData["class"], { shouldValidate: true })}>
          <SelectTrigger className={inputClass} style={inputStyle}><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
          <SelectContent>{CLASSES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
        </Select>
        {errors.class && <p className={errorClass} style={errorColor}>{errors.class.message}</p>}
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Année d&apos;entrée au collège</Label>
        <Controller name="enrollment_date" control={control} render={({ field }) => (
          <YearSelect value={field.value || null} onChange={field.onChange} placeholder="Sélectionner l'année" />
        )} />
        {errors.enrollment_date && <p className={errorClass} style={errorColor}>{errors.enrollment_date.message}</p>}
      </div>

      {expectedEndDate && (
        <div className="rounded-xl px-4 py-3" style={{ background: "rgba(0,107,63,0.15)", border: "1px solid rgba(0,107,63,0.3)" }}>
          <p className="text-xs" style={{ color: "#8fd6b4" }}>
            Date de fin prévue : <span className="font-medium">{expectedEndDate}</span>
          </p>
        </div>
      )}

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Activités parascolaires</Label>
        <div className="flex flex-wrap gap-2">
          {activities.map((a) => (
            <button key={a.id} type="button" aria-pressed={selectedActivities.includes(a.id)} onClick={() => { const next = selectedActivities.includes(a.id) ? selectedActivities.filter((id) => id !== a.id) : [...selectedActivities, a.id]; setValue("activities", next); }} className="rounded-lg px-3 py-1.5 text-xs transition-all" style={{ background: selectedActivities.includes(a.id) ? "rgba(212,160,23,0.2)" : "rgba(255,255,255,0.06)", border: selectedActivities.includes(a.id) ? "1px solid #D4A017" : "1px solid rgba(255,255,255,0.1)", color: selectedActivities.includes(a.id) ? "#F5DEB3" : "rgba(255,255,255,0.5)" }}>
              {a.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Domaines d&apos;études désirés</Label>
        <TagInput values={desiredFields} onChange={(v) => setValue("desired_study_fields", v, { shouldValidate: true })} max={3} placeholder="Ex: Informatique" />
        {errors.desired_study_fields && <p className={errorClass} style={errorColor}>{errors.desired_study_fields.message}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" onClick={onBack} variant="outline" className="h-11 rounded-xl gap-1" style={{ backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.15)", color: "#F5DEB3" }}><ArrowLeft size={14} /> Retour</Button>
        <Button type="submit" className="flex-1 h-11 rounded-xl text-sm font-semibold gap-2" style={{ background: "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)", color: "#3a000f" }}>Continuer <ArrowRight size={16} /></Button>
      </div>
    </motion.form>
  );
}

// ─── Étape 3 — Compte ───

function Step3Form({
  direction,
  isPending,
  onBack,
  onSubmit,
}: {
  direction: number;
  isPending: boolean;
  onBack: () => void;
  onSubmit: (data: Step3Data) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Step3Data>({
    resolver: typedResolver<Step3Data>(step3Schema),
    defaultValues: { username: "", email: "", password: "", confirm_password: "", accept_terms: false },
  });

  return (
    <motion.form custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Username</Label>
        <Input {...register("username")} placeholder="mon_pseudo" className={inputClass} style={errors.username ? inputErrorStyle : inputStyle} disabled={isPending} />
        <p className="mt-1 text-xs" style={hintColor}>3-20 caractères, lettres, chiffres et _</p>
        {errors.username && <p className={errorClass} style={errorColor}>{errors.username.message}</p>}
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Email</Label>
        <Input {...register("email")} type="email" placeholder="votre@email.com" className={inputClass} style={errors.email ? inputErrorStyle : inputStyle} disabled={isPending} />
        {errors.email && <p className={errorClass} style={errorColor}>{errors.email.message}</p>}
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Mot de passe</Label>
        <div className="relative">
          <Input {...register("password")} type={showPassword ? "text" : "password"} placeholder="Min. 8 caractères" className={`${inputClass} pr-10`} style={errors.password ? inputErrorStyle : inputStyle} disabled={isPending} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "#F5DEB3" }} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="mt-1 text-xs" style={hintColor}>1 majuscule, 1 minuscule, 1 chiffre</p>
        {errors.password && <p className={errorClass} style={errorColor}>{errors.password.message}</p>}
      </div>

      <div>
        <Label className="text-xs mb-1.5 block" style={labelColor}>Confirmer le mot de passe</Label>
        <Input {...register("confirm_password")} type="password" placeholder="Confirmez" className={inputClass} style={errors.confirm_password ? inputErrorStyle : inputStyle} disabled={isPending} />
        {errors.confirm_password && <p className={errorClass} style={errorColor}>{errors.confirm_password.message}</p>}
      </div>

      <div className="flex items-start gap-3 pt-1">
        <Checkbox
          id="terms"
          checked={watch("accept_terms") === true}
          onCheckedChange={(c) => setValue("accept_terms", c === true, { shouldValidate: true })}
          disabled={isPending}
        />
        <label htmlFor="terms" className="text-xs leading-relaxed cursor-pointer" style={{ color: "rgba(255,255,255,0.6)" }}>
          J&apos;accepte les{" "}
          <Link href="/legal/terms" target="_blank" style={{ color: "#F5DEB3" }}>Conditions Générales</Link>
          {" "}et la{" "}
          <Link href="/legal/privacy" target="_blank" style={{ color: "#F5DEB3" }}>Politique de Confidentialité</Link>
        </label>
      </div>
      {errors.accept_terms && <p className={errorClass} style={errorColor}>{errors.accept_terms.message}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" onClick={onBack} variant="outline" className="h-11 rounded-xl gap-1" style={{ backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.15)", color: "#F5DEB3" }} disabled={isPending}>
          <ArrowLeft size={14} /> Retour
        </Button>
        <Button type="submit" disabled={isPending} className="flex-1 h-11 rounded-xl text-sm font-semibold gap-2" style={{ background: "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)", color: "#3a000f" }}>
          {isPending ? (<span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Inscription...</span>) : "Créer mon compte"}
        </Button>
      </div>
    </motion.form>
  );
}

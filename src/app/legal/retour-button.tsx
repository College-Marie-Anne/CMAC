"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, X } from "lucide-react";

/**
 * Bouton « Retour » intelligent pour les pages légales.
 *
 * Cas gérés :
 *  1. Onglet ouvert via target="_blank" depuis /register (wizard en cours) →
 *     window.opener existe → on ferme l'onglet pour ramener l'utilisatrice
 *     à sa progression d'inscription.
 *  2. Navigation dans le même onglet avec historique → router.back().
 *  3. Accès direct (lien externe, refresh, bookmark) → fallback vers "/".
 *
 * L'ancien comportement (lien dur vers "/") cassait le flow d'inscription :
 * l'utilisatrice perdait son wizard en étape 3 en cliquant sur les CGU.
 */
export function RetourButton() {
  const router = useRouter();
  const [isNewTab, setIsNewTab] = useState(false);

  useEffect(() => {
    // Détecte une ouverture via target="_blank" (window.opener défini et non fermé)
    if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
      setIsNewTab(true);
    }
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Cas 1 : onglet secondaire → fermer pour revenir à l'onglet appelant
    if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
      window.close();
      return;
    }

    // Cas 2 : historique présent → back()
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    // Cas 3 : aucune navigation antérieure → page d'accueil
    router.push("/");
  };

  return (
    <a
      href="/"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
      aria-label={isNewTab ? "Fermer cet onglet" : "Retour"}
    >
      {isNewTab ? <X size={16} /> : <ArrowLeft size={16} />}
      {isNewTab ? "Fermer" : "Retour"}
    </a>
  );
}

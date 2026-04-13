import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité - CMA Connect",
};

const sections = [
  { id: "responsables", title: "Responsables du traitement" },
  { id: "donnees", title: "Données collectées" },
  { id: "finalites", title: "Finalités du traitement" },
  { id: "base", title: "Base légale" },
  { id: "conservation", title: "Durée de conservation" },
  { id: "partage", title: "Partage des données" },
  { id: "securite", title: "Sécurité" },
  { id: "droits", title: "Vos droits" },
  { id: "cookies", title: "Cookies" },
  { id: "mineurs", title: "Mineurs" },
  { id: "modifications", title: "Modifications" },
  { id: "contact", title: "Contact" },
];

function Section({
  id,
  num,
  title,
  children,
}: {
  id: string;
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-lg font-semibold text-cma-bordeaux mb-3">
        {num}. {title}
      </h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <article className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Politique de confidentialité
        </h1>
        <p className="text-sm text-gray-400">
          Version 1.0 &mdash; Dernière mise à jour : 12 avril 2026
        </p>
      </div>

      {/* Table des matières */}
      <nav className="rounded-xl bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Sommaire
        </p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-sm text-cma-bordeaux hover:underline"
              >
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Sections */}
      <Section id="responsables" num={1} title="Responsables du traitement">
        <p>
          Les responsables conjoints du traitement de vos données personnelles
          sont :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Collège Marie-Anne (CMA)</strong> &mdash; Responsable des
            données relatives à la scolarité, aux promotions et à la vie
            académique des élèves et alumni
          </li>
          <li>
            <strong>LakouSystems</strong> &mdash; Responsable du développement,
            de l&apos;hébergement et de la maintenance technique de la
            plateforme CMA Connect
          </li>
        </ul>
      </Section>

      <Section id="donnees" num={2} title="Données collectées">
        <p>
          Lors de votre inscription et de votre utilisation de CMA Connect, les
          données suivantes sont collectées :
        </p>

        <p className="font-medium text-gray-700 mt-2">Données d&apos;identité :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Prénoms et nom de famille</li>
          <li>Date de naissance</li>
          <li>Nationalité(s)</li>
          <li>Pays de résidence</li>
          <li>Username (identifiant unique)</li>
          <li>Adresse email</li>
          <li>Photo de profil (optionnel)</li>
        </ul>

        <p className="font-medium text-gray-700 mt-2">Données académiques :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Promotion et filière au CMA</li>
          <li>Classe actuelle (pour les élèves S1-S3)</li>
          <li>Parcours académiques post-CMA (institution, domaine, niveau)</li>
          <li>Domaines d&apos;études désirés</li>
          <li>Activités parascolaires</li>
        </ul>

        <p className="font-medium text-gray-700 mt-2">Données professionnelles :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Métier(s) actuel(s) et passés</li>
          <li>Entreprise (optionnel)</li>
        </ul>

        <p className="font-medium text-gray-700 mt-2">Données d&apos;utilisation :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Publications sur le forum (posts, commentaires, réactions)</li>
          <li>Messages privés (non accessibles aux administratrices)</li>
          <li>Signalements émis ou reçus</li>
          <li>Date de dernière connexion</li>
          <li>Préférence de thème (clair/sombre)</li>
        </ul>
      </Section>

      <Section id="finalites" num={3} title="Finalités du traitement">
        <p>Vos données sont traitées pour les finalités suivantes :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Réseautage</strong> : permettre aux membres de la communauté
            CMA de se retrouver, se connecter et échanger
          </li>
          <li>
            <strong>Annuaire</strong> : rendre les profils consultables par les
            autres membres (recherche par nom, promotion, domaine)
          </li>
          <li>
            <strong>Mentorat</strong> : faciliter la mise en relation entre
            alumni et élèves selon leurs domaines d&apos;intérêt
          </li>
          <li>
            <strong>Modération</strong> : garantir le respect des règles de la
            communauté et traiter les signalements
          </li>
          <li>
            <strong>Analytics</strong> : produire des statistiques anonymisées
            pour le dashboard administrateur (démographie, engagement, parcours)
          </li>
          <li>
            <strong>Support</strong> : répondre aux demandes via le système de
            tickets
          </li>
        </ul>
      </Section>

      <Section id="base" num={4} title="Base légale">
        <p>
          Le traitement de vos données repose sur votre{" "}
          <strong>consentement</strong>, exprimé lors de l&apos;acceptation des{" "}
          <Link
            href="/legal/terms"
            className="text-cma-bordeaux underline"
          >
            Conditions Générales d&apos;Utilisation
          </Link>{" "}
          au moment de l&apos;inscription.
        </p>
        <p>
          La version des CGU acceptée ainsi que la date d&apos;acceptation sont
          enregistrées dans votre profil.
        </p>
      </Section>

      <Section id="conservation" num={5} title="Durée de conservation">
        <p>
          Vos données sont conservées aussi longtemps que votre compte est
          actif. CMA Connect ne propose pas de suppression définitive de
          compte : vous pouvez <strong>désactiver</strong> votre compte à tout
          moment, ce qui masque votre profil et bloque vos interactions.
        </p>
        <p>
          Les comptes désactivés conservent leurs données pour permettre une
          éventuelle réactivation (sur approbation d&apos;une administratrice).
        </p>
        <p>
          Les messages privés peuvent être supprimés par chaque partie de son
          côté. Un message n&apos;est définitivement purgé de la base de données
          que lorsque les deux parties l&apos;ont supprimé.
        </p>
        <p>
          <strong>Précision sur la suppression :</strong> Les posts et
          commentaires du forum supprimés par une utilisatrice sont retirés de
          l&apos;affichage public mais conservés en base de données à des fins
          de modération (accessible uniquement aux administratrices). Il ne
          s&apos;agit pas d&apos;un effacement définitif et immédiat.
        </p>
        <p>
          Les images publiées sur les espaces communautaires (forum, profil,
          emblèmes) sont hébergées sur des serveurs dont les URLs sont
          techniquement accessibles publiquement. Les images des messages
          privés sont en revanche stockées dans un espace privé.
        </p>
      </Section>

      <Section id="partage" num={6} title="Partage des données">
        <p>
          <strong>
            Vos données ne sont partagées avec aucun tiers externe.
          </strong>
        </p>
        <p>
          Au sein de la plateforme, la visibilité de vos données est contrôlée
          par des règles de sécurité strictes (Row Level Security) :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Votre profil public (nom, username, promotion, parcours) est visible
            par toutes les membres authentifiées
          </li>
          <li>
            Vos messages privés ne sont visibles que par vous et votre
            correspondante &mdash; les administratrices n&apos;y ont pas accès
          </li>
          <li>
            Les votes lors des élections de promo sont anonymes et non
            consultables
          </li>
          <li>
            Les administratrices accèdent aux données nécessaires à la gestion
            (profils, signalements, audit log) mais pas aux messages privés
          </li>
        </ul>
        <p>
          <strong>Exports administratifs :</strong> L&apos;administration du
          Collège Marie-Anne peut exporter les données de l&apos;annuaire
          (noms, promotions, parcours) sous forme de rapports PDF et CSV à des
          fins exclusives de gestion interne de son réseau. Ces exports ne
          contiennent jamais de messages privés et ne sont pas transmis à des
          tiers.
        </p>
      </Section>

      <Section id="securite" num={7} title="Sécurité">
        <p>
          Nous mettons en place des mesures techniques pour protéger vos
          données :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Hébergement</strong> : Supabase (infrastructure
            PostgreSQL avec chiffrement au repos et en transit)
          </li>
          <li>
            <strong>Contrôle d&apos;accès</strong> : Row Level Security (RLS)
            sur toutes les tables &mdash; chaque requête est filtrée selon
            l&apos;identité de l&apos;utilisatrice
          </li>
          <li>
            <strong>Authentification</strong> : mots de passe hachés, sessions
            sécurisées via cookies HTTP-only
          </li>
          <li>
            <strong>Protection anti-abus</strong> : limitation du nombre de
            requêtes (rate limiting) sur les endpoints sensibles
          </li>
          <li>
            <strong>Audit</strong> : toutes les actions administratives sont
            tracées dans un journal non modifiable
          </li>
          <li>
            <strong>Immuabilité</strong> : le statut de super-administrateur ne
            peut être modifié par aucune interface
          </li>
        </ul>
      </Section>

      <Section id="droits" num={8} title="Vos droits">
        <p>En tant qu&apos;utilisatrice, vous disposez des droits suivants :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Droit d&apos;accès</strong> : consulter vos données via
            votre profil
          </li>
          <li>
            <strong>Droit de rectification</strong> : modifier votre avatar et
            votre bio librement. Pour les autres champs (nom, promotion,
            filière), contactez une administratrice
          </li>
          <li>
            <strong>Droit de désactivation</strong> : désactiver votre compte à
            tout moment depuis votre profil
          </li>
          <li>
            <strong>Droit d&apos;opposition</strong> : vous pouvez bloquer
            d&apos;autres utilisatrices pour empêcher toute interaction
          </li>
          <li>
            <strong>Droit à la notification</strong> : vous êtes notifiée de
            toute action administrative concernant votre compte
          </li>
        </ul>
        <p>
          Pour exercer ces droits, contactez-nous à{" "}
          <a
            href="mailto:lakousystems@gmail.com"
            className="text-cma-bordeaux underline"
          >
            lakousystems@gmail.com
          </a>{" "}
          ou soumettez un ticket de support depuis la plateforme.
        </p>
      </Section>

      <Section id="cookies" num={9} title="Cookies">
        <p>
          CMA Connect utilise uniquement des <strong>cookies de session</strong>{" "}
          nécessaires au fonctionnement de l&apos;authentification (Supabase
          Auth). Ces cookies :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sont strictement nécessaires (pas de cookie de tracking)</li>
          <li>Ne sont pas partagés avec des tiers</li>
          <li>Expirent à la fermeture de la session ou après inactivité</li>
        </ul>
        <p>
          Aucun cookie publicitaire, analytique ou de réseaux sociaux n&apos;est
          utilisé.
        </p>
      </Section>

      <Section id="mineurs" num={10} title="Mineurs">
        <p>
          CMA Connect est une plateforme destinée aux élèves du Collège
          Marie-Anne, dont certaines peuvent être mineures. L&apos;inscription
          des élèves actuelles (S1-S4) est effectuée dans le cadre de leur
          scolarité au CMA.
        </p>
        <p>
          Le consentement parental est considéré comme implicitement accordé par
          l&apos;inscription de l&apos;élève au Collège Marie-Anne. Les parents
          ou représentants légaux peuvent contacter{" "}
          <a
            href="mailto:lakousystems@gmail.com"
            className="text-cma-bordeaux underline"
          >
            lakousystems@gmail.com
          </a>{" "}
          pour toute demande relative aux données de leur enfant.
        </p>
      </Section>

      <Section id="modifications" num={11} title="Modifications">
        <p>
          La présente politique de confidentialité peut être mise à jour à tout
          moment. Les utilisatrices seront notifiées de toute modification
          significative via la plateforme. La date de dernière mise à jour est
          indiquée en haut de ce document.
        </p>
      </Section>

      <Section id="contact" num={12} title="Contact">
        <p>
          Pour toute question relative à la protection de vos données
          personnelles, vous pouvez contacter le délégué à la protection des
          données :
        </p>
        <div className="rounded-xl bg-gray-50 p-4 mt-2">
          <p className="font-medium text-gray-700">LakouSystems</p>
          <p>
            Email :{" "}
            <a
              href="mailto:lakousystems@gmail.com"
              className="text-cma-bordeaux underline"
            >
              lakousystems@gmail.com
            </a>
          </p>
          <p className="text-gray-400 mt-1">
            Responsable technique de CMA Connect
          </p>
        </div>
      </Section>
    </article>
  );
}

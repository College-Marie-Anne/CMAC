import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation - CMA Connect",
};

const sections = [
  { id: "objet", title: "Objet de la plateforme" },
  { id: "acces", title: "Conditions d'accès" },
  { id: "comptes", title: "Comptes utilisatrices" },
  { id: "contenu", title: "Contenu et responsabilité" },
  { id: "moderation", title: "Modération" },
  { id: "propriete", title: "Propriété intellectuelle" },
  { id: "mentorat", title: "Mentorat" },
  { id: "elections", title: "Élections de promo" },
  { id: "invitations", title: "Liens d'invitation" },
  { id: "donnees", title: "Données personnelles" },
  { id: "responsabilite", title: "Limitation de responsabilité" },
  { id: "modifications", title: "Modifications des CGU" },
  { id: "droit", title: "Droit applicable" },
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

export default function TermsPage() {
  return (
    <article className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Conditions Générales d&apos;Utilisation
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
      <Section id="objet" num={1} title="Objet de la plateforme">
        <p>
          CMA Connect est une plateforme de réseautage, d&apos;annuaire et de
          mentorat destinée aux anciennes et actuelles élèves du Collège
          Marie-Anne (CMA). Elle est développée et maintenue par LakouSystems
          pour le compte du Collège Marie-Anne.
        </p>
        <p>
          La plateforme permet aux utilisatrices de créer un profil, d&apos;échanger
          via un forum, de communiquer par messagerie privée, de participer à un
          programme de mentorat et de consulter un annuaire des membres de la
          communauté CMA.
        </p>
      </Section>

      <Section id="acces" num={2} title="Conditions d'accès">
        <p>
          L&apos;accès à CMA Connect est réservé aux anciennes élèves (alumni),
          aux finissantes (S4) et aux élèves actuelles (S1-S3) du Collège
          Marie-Anne, ainsi qu&apos;aux administratrices désignées.
        </p>
        <p>
          Toute inscription est soumise à l&apos;approbation d&apos;une
          administratrice, sauf lorsqu&apos;elle est effectuée via un lien
          d&apos;invitation généré par une alumni déjà approuvée.
        </p>
        <p>
          Certaines utilisatrices peuvent être mineures (élèves S1-S4).
          L&apos;utilisation de la plateforme par une mineure est présumée se
          faire avec l&apos;accord de ses parents ou représentants légaux, dans
          le cadre de sa scolarité au Collège Marie-Anne.
        </p>
        <p>
          L&apos;inscription implique l&apos;acceptation pleine et entière des
          présentes Conditions Générales d&apos;Utilisation et de la{" "}
          <Link
            href="/legal/privacy"
            className="text-cma-bordeaux underline"
          >
            Politique de confidentialité
          </Link>
          .
        </p>
      </Section>

      <Section id="comptes" num={3} title="Comptes utilisatrices">
        <p>Quatre types de comptes existent sur la plateforme :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Alumni</strong> : anciennes élèves ayant terminé leur
            scolarité au CMA
          </li>
          <li>
            <strong>S4 (Finissantes)</strong> : élèves en dernière année,
            rattachées à une promotion
          </li>
          <li>
            <strong>S1-S3 (Élèves actuelles)</strong> : élèves en cours de
            scolarité
          </li>
          <li>
            <strong>Admin</strong> : comptes créés exclusivement par le
            super-admin pour la gestion de la plateforme
          </li>
        </ul>
        <p>
          Chaque utilisatrice est responsable de la confidentialité de ses
          identifiants de connexion. Tout usage du compte est réputé être le
          fait de la titulaire.
        </p>
        <p>
          Un compte ne peut pas être supprimé définitivement. L&apos;utilisatrice
          peut désactiver son compte à tout moment. La réactivation nécessite
          l&apos;approbation d&apos;une administratrice.
        </p>
        <p>
          <strong>Éligibilité :</strong> L&apos;accès à la plateforme est
          conditionné au maintien du statut d&apos;élève ou d&apos;alumni
          vérifiée du Collège Marie-Anne. Un compte peut être désactivé par
          l&apos;administration si l&apos;utilisatrice perd ce statut
          (départ de l&apos;établissement avant la fin de la scolarité,
          promotion non validée par l&apos;administration). En cas de rejet
          d&apos;une promotion, les comptes associés sont suspendus puis
          désactivés après un délai de grâce de 3 jours permettant de
          contacter l&apos;administration.
        </p>
        <p>
          <strong>Visibilité dans l&apos;annuaire :</strong> En créant un compte,
          l&apos;utilisatrice accepte que ses informations de profil (nom,
          username, promotion, filière, parcours académique et professionnel)
          soient consultables par l&apos;ensemble des membres actives et
          approuvées via l&apos;annuaire interne et la recherche de la
          plateforme. Seuls les messages privés ne sont pas indexés.
        </p>
      </Section>

      <Section id="contenu" num={4} title="Contenu et responsabilité">
        <p>
          Les utilisatrices sont seules responsables du contenu qu&apos;elles
          publient sur la plateforme (posts forum, commentaires, messages
          privés, photos de profil).
        </p>
        <p>Il est interdit de publier du contenu :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Portant atteinte à la dignité ou à la vie privée d&apos;autrui</li>
          <li>À caractère diffamatoire, injurieux, obscène ou discriminatoire</li>
          <li>Incitant à la violence ou à la haine</li>
          <li>Contrevenant aux lois en vigueur en République d&apos;Haïti</li>
          <li>Constituant du spam ou de la publicité non autorisée</li>
        </ul>
        <p>
          Tout contenu contraire à ces règles peut être signalé par les
          utilisatrices et supprimé par les administratrices.
        </p>
        <p>
          En complément, chaque utilisatrice dispose d&apos;un outil de{" "}
          <strong>blocage</strong> lui permettant de bloquer une autre
          utilisatrice. Le blocage empêche toute interaction entre les deux
          parties (messagerie, réactions, mentorat). Un mentorat actif entre
          les deux utilisatrices est automatiquement annulé lors du blocage.
        </p>
        <p>
          <strong>Suppression de contenu :</strong> Lorsqu&apos;une utilisatrice
          supprime un post ou un commentaire du forum, celui-ci est retiré de
          l&apos;affichage public mais peut rester accessible aux
          administratrices à des fins de modération et d&apos;historique. En
          revanche, les messages privés sont définitivement purgés de la base
          de données lorsque les deux parties les ont supprimés de leur côté.
          La suppression d&apos;un contenu n&apos;entraîne donc pas
          nécessairement son effacement immédiat et définitif.
        </p>
        <p>
          <strong>Limites techniques :</strong> Afin de maintenir la qualité du
          service et prévenir le spam, des limites techniques automatiques
          encadrent la fréquence des actions sur la plateforme (publications,
          messages, signalements, etc.). Ces limites sont appliquées de manière
          transparente et une notification est affichée en cas de dépassement.
        </p>
        <p>
          <strong>Partage de médias :</strong> Les images publiées sur les
          espaces communautaires (forum, photos de profil, emblèmes de promo)
          sont hébergées sur des serveurs accessibles publiquement. Bien que
          l&apos;accès à la plateforme soit réservé aux membres, les URLs des
          images peuvent techniquement être partagées en dehors de CMA Connect.
          Les utilisatrices sont responsables du contenu qu&apos;elles
          choisissent de publier et doivent en tenir compte. Les images jointes
          aux messages privés sont, en revanche, stockées dans un espace privé
          accessible uniquement aux participantes de la conversation.
        </p>
      </Section>

      <Section id="moderation" num={5} title="Modération">
        <p>
          Les administratrices se réservent le droit de modérer tout contenu
          publié sur la plateforme, incluant sans s&apos;y limiter :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>La suppression de posts ou commentaires contraires aux règles</li>
          <li>La suspension temporaire d&apos;un compte</li>
          <li>La désactivation d&apos;un compte en cas de manquement grave</li>
        </ul>
        <p>
          Les administratrices se réservent également le droit de{" "}
          <strong>corriger ou modifier les informations d&apos;un profil</strong>{" "}
          (nom, promotion, filière, parcours académique) afin de garantir
          l&apos;exactitude de l&apos;annuaire de la communauté. Toute
          modification est notifiée à l&apos;utilisatrice concernée.
        </p>
        <p>
          Toute action de modération ou de modification est tracée dans un
          journal d&apos;audit interne non modifiable.
        </p>
      </Section>

      <Section id="propriete" num={6} title="Propriété intellectuelle">
        <p>
          Le contenu publié par une utilisatrice (textes, images) reste sa
          propriété. En publiant du contenu sur CMA Connect, l&apos;utilisatrice
          accorde au Collège Marie-Anne et à LakouSystems une licence non
          exclusive, gratuite et mondiale d&apos;affichage de ce contenu sur la
          plateforme.
        </p>
        <p>
          La marque CMA Connect, le logo, le design et le code source de la
          plateforme sont la propriété de LakouSystems et du Collège
          Marie-Anne. Toute reproduction non autorisée est interdite.
        </p>
      </Section>

      <Section id="mentorat" num={7} title="Mentorat">
        <p>
          CMA Connect propose un système de mentorat mettant en relation des
          alumni avec des élèves actuelles. Ce service est fourni à titre
          bénévole et informatif.
        </p>
        <p>
          Ni le Collège Marie-Anne ni LakouSystems ne garantissent la qualité,
          la disponibilité ou les résultats du mentorat. Les échanges entre
          mentor et mentee relèvent de leur responsabilité mutuelle.
        </p>
      </Section>

      <Section id="elections" num={8} title="Élections de promo">
        <p>
          CMA Connect intègre un système d&apos;élection de chef de promo
          permettant aux membres d&apos;une promotion d&apos;élire leur
          représentante. Les élections se déroulent en deux phases : candidature
          (3 jours) puis vote anonyme (3 jours).
        </p>
        <p>
          Dans le cadre des élections, il est strictement interdit de :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tenter de manipuler ou falsifier le processus de vote</li>
          <li>Exercer des pressions ou du harcèlement envers les candidates ou les votantes</li>
          <li>Créer plusieurs comptes pour voter plus d&apos;une fois</li>
          <li>Divulguer les choix de vote d&apos;autres utilisatrices (les votes sont anonymes)</li>
        </ul>
        <p>
          Toute violation de ces règles peut entraîner l&apos;annulation de
          l&apos;élection par une administratrice et des sanctions sur le compte
          de la contrevenante.
        </p>
      </Section>

      <Section id="invitations" num={9} title="Liens d'invitation">
        <p>
          Les alumni approuvées peuvent générer des liens d&apos;invitation à
          usage unique permettant à de nouvelles utilisatrices de s&apos;inscrire
          sans attendre l&apos;approbation manuelle.
        </p>
        <p>
          L&apos;alumni qui génère un lien est responsable de son utilisation.
          Les administratrices peuvent révoquer un lien d&apos;invitation à tout
          moment. Les liens expirent automatiquement après 7 jours.
        </p>
      </Section>

      <Section id="donnees" num={10} title="Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans notre{" "}
          <Link
            href="/legal/privacy"
            className="text-cma-bordeaux underline"
          >
            Politique de confidentialité
          </Link>
          . En utilisant CMA Connect, vous acceptez le traitement de vos
          données tel que décrit dans cette politique.
        </p>
        <p>
          <strong>Exports administratifs :</strong> Les données de l&apos;annuaire
          (noms, promotions, filières, parcours) peuvent être exportées par
          l&apos;administration du Collège Marie-Anne sous forme de rapports
          (PDF, CSV) à des fins exclusives de gestion interne de son réseau
          d&apos;anciennes et actuelles élèves. Ces exports ne sont jamais
          transmis à des tiers.
        </p>
        <p>
          <strong>Confidentialité des messages privés :</strong> Vos messages
          privés (DMs) sont strictement confidentiels. Les administratrices de
          la plateforme n&apos;ont techniquement pas accès au contenu de vos
          conversations privées &mdash; cette restriction est appliquée au
          niveau de la base de données par des règles de sécurité immuables.
        </p>
      </Section>

      <Section id="responsabilite" num={11} title="Limitation de responsabilité">
        <p>
          CMA Connect est fourni &laquo; en l&apos;état &raquo;. Le Collège
          Marie-Anne et LakouSystems ne garantissent pas la disponibilité
          ininterrompue de la plateforme ni l&apos;absence de bugs.
        </p>
        <p>
          En aucun cas le Collège Marie-Anne ou LakouSystems ne pourront être
          tenus responsables de dommages directs ou indirects résultant de
          l&apos;utilisation de la plateforme, y compris la perte de données,
          l&apos;interruption de service ou les interactions entre
          utilisatrices.
        </p>
        <p>
          <strong>Bourses &amp; Opportunités :</strong> La plateforme intègre un
          espace dédié au partage de bourses d&apos;études, offres de stage et
          opportunités professionnelles par les membres de la communauté. Le
          Collège Marie-Anne et LakouSystems ne vérifient pas, ne valident pas
          et ne garantissent en aucun cas la véracité, la sécurité ou
          l&apos;exactitude de ces opportunités externes. Les utilisatrices sont
          invitées à effectuer leurs propres vérifications avant de donner suite
          à toute offre publiée.
        </p>
      </Section>

      <Section id="modifications" num={12} title="Modifications des CGU">
        <p>
          Le Collège Marie-Anne et LakouSystems se réservent le droit de
          modifier les présentes CGU à tout moment. Les utilisatrices seront
          notifiées de toute modification via la plateforme.
        </p>
        <p>
          La version des CGU acceptée par chaque utilisatrice est enregistrée
          dans son profil. L&apos;utilisation continue de la plateforme après
          modification vaut acceptation des nouvelles conditions.
        </p>
      </Section>

      <Section id="droit" num={13} title="Droit applicable">
        <p>
          Les présentes Conditions Générales d&apos;Utilisation sont régies par
          le droit de la République d&apos;Haïti. Tout litige relatif à
          l&apos;interprétation ou à l&apos;exécution des présentes sera soumis
          aux tribunaux compétents de Port-au-Prince, Haïti.
        </p>
      </Section>

      {/* Contact */}
      <div className="rounded-xl bg-gray-50 p-5 text-sm text-gray-600">
        <p className="font-semibold text-gray-700 mb-1">Contact</p>
        <p>
          Pour toute question relative aux présentes CGU, vous pouvez nous
          contacter à{" "}
          <a
            href="mailto:lakousystems@gmail.com"
            className="text-cma-bordeaux underline"
          >
            lakousystems@gmail.com
          </a>
        </p>
      </div>
    </article>
  );
}

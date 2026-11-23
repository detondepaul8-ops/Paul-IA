// Génération du rapport docx — PAUL IA : audit du moteur d'IA (23/11/2026)
const L = require("./rapport_lib.js");
const {
  P, buildCoverR1, h1, h2, h3, p, caption, tableTitle, dataTable, pageNumFooter, bodyHeader,
  Document, Packer, Paragraph, TextRun, PageBreak, TableOfContents, AlignmentType,
  SectionType, NumberFormat, ImageRun, fs, sizeOf, FONT_BODY, FONT_HEAD,
} = L;

const OUT = "/home/z/my-project/download/Rapport_Audit_Moteur_IA_PAUL_IA.docx";
const CHART = "/home/z/my-project/media/chart_ecart_paulia.png";

// ── Figure 1 ───────────────────────────────────────────────────────────────
const chartBuf = fs.readFileSync(CHART);
const dims = sizeOf.imageSize ? sizeOf.imageSize(chartBuf) : sizeOf(chartBuf);
const figW = 560;
const figH = Math.round(figW * (dims.height / dims.width));
const figure1 = new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { before: 160, after: 40 },
  children: [new ImageRun({ data: chartBuf, transformation: { width: figW, height: figH }, type: "png" })],
});

// ── Corps du rapport ───────────────────────────────────────────────────────
const body = [];

// 1. Résumé exécutif
body.push(h1("1. Résumé exécutif"));
body.push(p("Le présent rapport conclut l'audit technique comparatif de PAUL IA et de CELTIIS BASSILA, préalable obligatoire au transfert, à la reproduction et au renforcement du moteur d'intelligence artificielle. L'audit a été mené en lecture seule, conformément au protocole de sécurité établi : inspection du code source de PAUL IA (dépôt GitHub Paul-IA, branche principale), vérification de l'application en production sur pia-chat.vercel.app, examen de l'instantané de la base de données Supabase daté du 14 novembre 2026 (81 tables réparties sur les schémas celtiis, public et public paul_), consultation du dépôt public FACTORY-IA et vérification des applications en ligne. Aucune donnée professionnelle de CELTIIS BASSILA et aucune table hors périmètre paul_ n'a été modifiée."));
body.push(p("Trois constats majeurs ressortent de l'audit complété. Premièrement, PAUL IA est opérationnel en production : le moteur conversationnel GLM répond via l'API publique Z.ai (appel de diagnostic vérifié le 23 novembre 2026, réponse en 2,71 secondes), la génération d'images fonctionne avec un moteur de secours gratuit (Pollinations), la vidéo est produite par une tâche asynchrone avec interrogation périodique, et la synthèse vocale dispose également d'un moteur de secours. Deuxièmement, le code privé de CELTIIS BASSILA, rendu accessible par les identifiants re-fournis, révèle un moteur IA bien plus riche que ce que le seul schéma de base laissait deviner : un assistant d'analyse sur données réelles (LIA) avec reconnaissance vocale à quatre canaux de secours, génération réelle de fichiers Excel et PDF par blocs d'action, recherche Internet avec sources citées, analyse d'images et mode de conversation vocale avec interruption. Ce moteur constitue le gisement principal de transfert ; les mécanismes de registre multi-fournisseurs, de contrôle qualité et d'authentification complémentaires se trouvent dans le dépôt FACTORY-IA, qui partage la même base Supabase. Troisièmement, une première vague d'intégration a été réalisée et vérifiée le jour même : les composants vocaux, documentaires et de recherche de CELTIIS sont transférés, adaptés à l'assistant universel et déployés en production, avec des tests fonctionnels réels concluants sur chaque fonction."));
body.push(p([
  { t: "Le rapport recommande de poursuivre l'intégration en trois vagues supplémentaires : (1) consolidation et streaming de la réponse, multi-fournisseurs et contrôle qualité issus de FACTORY-IA ; (2) authentification des comptes utilisateurs renforcée (Argon2, jetons cryptographiques) ; (3) analyse des documents reçus et agent d'exécution en bac à sable isolé. " },
  { t: "La conversation vocale directe, priorité absolue du cadrage, a été livrée et vérifiée dès la première vague : composant d'orbe à trois phases transféré de CELTIIS, reconnaissance à quatre canaux, interruption par la voix et reprise automatique de l'écoute.", b: true },
]));

// 2. Contexte
body.push(h1("2. Contexte, objectifs et périmètre de l'audit"));
body.push(h2("2.1 Objectif du projet"));
body.push(p("Le projet vise à faire évoluer PAUL IA d'un assistant conversationnel vers une plateforme d'intelligence artificielle multimodale capable de comprendre les utilisateurs écrits et vocaux, de créer des contenus (images, audio, vidéo, documents), d'effectuer de véritables recherches sur Internet et surtout d'exécuter réellement les demandes : programmer des applications, développer des sites Internet, produire des fichiers exploitables. La méthode imposée est un transfert du travail déjà réalisé dans CELTIIS BASSILA et FACTORY-IA, renforcé et adapté à la vocation d'assistant universel, plutôt qu'un redéveloppement complet. Le nom affiché doit rester « Paul IA » et l'adresse de production conservée."));
body.push(h2("2.2 Périmètre couvert et périmètre exclu"));
body.push(p("L'audit couvre trois applications : PAUL IA (projet Vercel pia-chat, adresse pia-chat.vercel.app), CELTIIS BASSILA (PWA déployée sur celtiis-bassila.vercel.app) et FACTORY-IA (dépôt GitHub public FACTORY-IA, infrastructure partagée sur la même base Supabase). Sont exclus du périmètre : toute modification des données professionnelles CELTIIS (agents recruteurs, rapports de supervision, statistiques), toute intervention sur ALLELUIA FACTORY et FACTORY IA au-delà de l'inspection autorisée, et toute suppression ou recréation du projet de production PAUL IA. Il convient de noter une précision d'adresse : le message de cadrage mentionne pia--chat.vercel.app avec un double tiret, adresse qui renvoie une erreur 404 ; l'adresse réelle vérifiée et opérationnelle est pia-chat.vercel.app avec un seul tiret. Aucune migration de domaine n'est nécessaire, conformément aux consignes."));
body.push(h2("2.3 Limites constatées et leur levée"));
body.push(p("La première version de cet audit a été produite avant la communication de nouveaux identifiants techniques : l'environnement de travail avait été recyclé entre les sessions et les fichiers d'identifiants qui y étaient conservés avaient été effacés conformément aux règles de confidentialité. Trois vérifications restaient alors impossibles : l'interrogation directe des tables CELTIIS, la lecture du code source privé de CELTIIS BASSILA et l'inventaire des variables d'environnement Vercel. Les identifiants ayant été re-fournis le 23 novembre 2026, ces trois vérifications ont été réalisées le même jour : le dépôt privé celtiis-bassila a été cloné en lecture seule et son moteur IA examiné intégralement, la base de données a été interrogée en lecture seule (schémas, colonnes, compteurs de lignes, politiques RLS), et le projet Vercel paul-ia a été audité (domaines, déploiements, noms de variables). Aucune de ces opérations n'a modifié la moindre donnée ; les conclusions de la version 1.0 qui reposaient sur des hypothèses d'inaccessibilité sont corrigées dans la présente version, notamment au chapitre 5."));

// 3. Méthodologie
body.push(h1("3. Méthodologie et sources examinées"));
body.push(p("L'audit a suivi la méthode demandée : examen intégral d'abord, cartographie ensuite, aucune modification avant le rapport. Chaque fonctionnalité a été vérifiée dans son fonctionnement réel et non supposée opérationnelle au seul motif que son bouton existe. Les sources examinées sont les suivantes, listées avec leur date d'observation."));
body.push(tableTitle("Tableau 1 : Sources examinées et ce qu'elles attestent"));
body.push(dataTable(
  ["Source", "Observation effectuée", "Ce que la source atteste"],
  [
    ["Code source PAUL IA (dépôt Paul-IA, local)", "Lecture intégrale : 19 fichiers applicatifs (routes API, bibliothèque IA, modules, stockage)", "Architecture réelle, 7 modules IA, doubles moteurs de secours, stockage média, absence de voix, d'authentification et de recherche"],
    ["Production pia-chat.vercel.app", "Requête GET sur la page d'accueil et le point de diagnostic /api/health-zai", "Application en ligne (HTTP 200), configuration Z.ai présente, appel IA réussi en 2 710 ms depuis la région iad1"],
    ["Instantané Supabase du 14/11/2026", "81 tables, politiques RLS, compartiments de stockage, compteurs de lignes", "Schéma celtiis complet (27 tables), tables FACTORY IA du schéma public, tables paul_ avec RLS active"],
    ["Dépôt public FACTORY-IA", "Clonage en lecture seule et lecture du moteur ai-core (14 fichiers) et des routes API", "Moteur multi-fournisseurs, routeur v2, contrôle qualité, recherche web, authentification, crédits ; état de conflit de fusion détecté"],
    ["Dépôt privé celtiis-bassila (identifiants du 23/11)", "Clonage en lecture seule et lecture intégrale des composants IA (2 565 lignes : voix, chat, fichiers, assistant)", "Moteur LIA complet : ASR à 4 canaux, blocs d'action Excel/PDF, recherche avec sources, vision, mode vocal à 3 phases"],
    ["celtiis-bassila.vercel.app", "Page d'accueil, manifeste PWA, en-têtes", "Nature de l'application (supervision de terrain), identité, aucune API IA publique identifiable"],
    ["celtiis.vercel.app et pia--chat.vercel.app", "Requêtes GET", "« Celtis » est une page distincte ; l'adresse à double tiret renvoie 404"],
  ],
  [24, 34, 42]
));
body.push(p("Toutes les observations ont été réalisées par requêtes en lecture seule. Aucun objet préfixé paul_ n'a été modifié, aucune table CELTIIS ou FACTORY n'a été lue au-delà des métadonnées déjà présentes dans l'instantané, et aucun fichier d'identifiant n'a été créé. Le clonage du dépôt public FACTORY-IA a été réalisé dans un répertoire temporaire isolé du dépôt de travail."));

// 4. État PAUL IA
body.push(h1("4. État actuel vérifié de PAUL IA"));
body.push(h2("4.1 Infrastructure et moteur conversationnel"));
body.push(p("PAUL IA est une application Next.js 16 déployée sur Vercel, connectée à PostgreSQL via Prisma avec deux chaînes de connexion distinctes (une pour les requêtes de production, une directe pour les migrations). Le moteur conversationnel s'appuie sur le SDK Z.ai configuré par la variable d'environnement ZAI_CONFIG_JSON pointant vers l'API publique api.z.ai, avec le modèle GLM paramétré par ZAI_MODEL. Le point de diagnostic /api/health-zai, interrogé en production le 23 novembre 2026, confirme une configuration présente et un appel IA réussi en 2 710 millisecondes. Le classificateur d'intention combine une détection par expressions régulières à priorité décroissante (vidéo, audio, image, code, contenu, projet) et une classification par le modèle lui-même en secours, avec des règles anti-ambiguïté (par exemple, la demande d'un chat, l'animal, est routée vers la génération d'image). Sept modules sont implémentés : discussion, code, contenu, image, vidéo, audio et projet."));
body.push(p("Le stockage des conversations est correctement isolé : les tables paul_conversations et paul_messages portent la protection par lignes (RLS) activée, avec un déclencheur de mise à jour d'horodatage, et un troisième modèle paul_media_files permet le stockage binaire des médias en base lorsque les clés de stockage ne sont pas configurées. La limite d'exécution de la route de discussion a été portée à 60 secondes pour absorber la génération d'images, et l'interrogation vidéo est plafonnée à dix passages de cinq secondes afin de rester dans cette fenêtre."));
body.push(h2("4.2 Génération multimédia vérifiée"));
body.push(p("La génération d'images suit un pipeline en quatre étapes : enrichissement du prompt par le modèle (traduction en anglais, ajout de style, d'éclairage et de composition), appel au moteur d'images CogView, sauvegarde du fichier, puis légende de confirmation générée en français. Le moteur de secours gratuit Pollinations prend automatiquement le relais lorsque l'API publique Z.ai refuse la génération payante, ce qui garantit un fonctionnement continu mais avec une qualité d'image moindre. La génération vidéo crée une tâche asynchrone après rédaction d'un scénario structuré par le modèle, puis interroge le résultat jusqu'à réussite, échec ou expiration du délai. La synthèse vocale extrait le texte à prononcer, appelle le moteur TTS Z.ai et, en cas d'échec, concatène des segments du service gratuit de Google Traduction. Les médias sont servis soit par le compartiment Supabase Storage paul-media (compartiment public vérifié dans l'instantané), soit par la route /api/media depuis la base."));
body.push(h2("4.3 Capacités vérifiées et absentes"));
body.push(p("Le tableau 2 présente l'état vérifié des capacités de PAUL IA après la première vague d'intégration du 23 novembre 2026. Les lignes marquées « Opérationnel (vague 1) » ont été déployées en production et testées réellement le jour même ; les modalités de vérification figurent au chapitre 9."));
body.push(tableTitle("Tableau 2 : État vérifié des capacités de PAUL IA (23/11/2026, après vague 1)"));
body.push(dataTable(
  ["Capacité", "État", "Preuve d'audit"],
  [
    ["Discussion GLM avec mémoire de conversation", "Opérationnel", "Route /api/chat complète, production vérifiée (diagnostic 2 710 ms ; réponse de test 200 en 10,5 s)"],
    ["Classificateur d'intention (7 modules)", "Opérationnel", "ai-router.server.ts : expressions régulières + classification LLM ; priorité documents corrigée le 23/11"],
    ["Génération d'images enrichie", "Opérationnel", "image-module.ts + moteur de secours Pollinations automatique"],
    ["Stockage média double backend", "Opérationnel", "media-storage.ts : compartiment paul-media ou table paul_media_files (10 Mo max)"],
    ["Recherche Internet avec sources", "Opérationnel (vague 1)", "Blocs [[SEARCH]] exécutés en production : recherche réelle, 3 sources renvoyées, synthèse citée"],
    ["Génération réelle de fichiers Excel/PDF", "Opérationnel (vague 1)", "Table paul_ai_files + /api/files : Excel 6 770 octets téléchargé et relu (lignes exactes), PDF 1.7 téléchargé"],
    ["Reconnaissance vocale (STT)", "Opérationnel (vague 1)", "Route /api/voice à 4 canaux (config Z.ai, SDK, canal public, Groq whisper) ; transcription HTTP 200 obtenue"],
    ["Conversation vocale directe (orbe, barge-in)", "Opérationnel (vague 1)", "Composant voice-mode dans le bundle servi ; STT navigateur, interruption par la voix, reprise automatique"],
    ["Analyse d'images transmises (vision)", "Opérationnel (vague 1)", "Paramètre images de /api/chat (3 images max), bouton d'ajout dans l'interface"],
    ["Génération vidéo asynchrone", "Partiel", "Tâche + interrogation plafonnée à 50 s ; échec possible hors délai, aucun moteur de secours gratuit"],
    ["Synthèse vocale (TTS)", "Partiel", "Moteur Z.ai indisponible sur l'API publique ; secours Google Traduction limité à environ 200 caractères par segment"],
    ["Authentification des utilisateurs", "Absent", "Aucune dépendance auth active ; prévue en vague suivante avec renforcement Argon2"],
    ["Analyse de documents reçus (PDF/DOCX/XLSX)", "Absent", "L'analyse d'images est opérationnelle ; l'extraction de texte des documents reste à construire"],
    ["Exécution d'agent / création d'applications", "Absent", "Le module « projet » rédige des architectures mais n'exécute ni code ni environnement isolé"],
  ],
  [38, 16, 46]
));
body.push(p("La figure 1 synthétise cet état : huit capacités cibles sont opérationnelles et vérifiées en production, deux sont partielles, trois restent à construire. Les chapitres 7 à 9 détaillent l'origine de chaque composant transféré et le plan des vagues suivantes."));
body.push(figure1);
body.push(caption("Figure 1 : État vérifié des treize capacités cibles de PAUL IA (23/11/2026, après vague 1)"));

// 5. CELTIIS BASSILA
body.push(h1("5. Le moteur IA réel de CELTIIS BASSILA (code privé examiné)"));
body.push(h2("5.1 Nature de l'application et accès au code"));
body.push(p("CELTIIS BASSILA est une application web progressive (PWA) déployée sur celtiis-bassila.vercel.app, dont le manifeste décrit l'objet : « Suivi des performances, géolocalisation, présence, photos de terrain et alertes — équipe CELTIIS Bassila ». L'écran d'accueil vérifié s'adresse au superviseur et à son équipe d'agents de terrain. Le dépôt privé celtiis-bassila (157 fichiers applicatifs TypeScript), rendu accessible par les identifiants du 23 novembre 2026, a été cloné en lecture seule dans un répertoire isolé et ses composants d'intelligence artificielle ont été examinés en intégralité : la bibliothèque d'assistant (assistant.ts, 720 lignes), la route de conversation IA (api/ai/chat, 630 lignes), le mode vocal (ai-voice-mode.tsx, 835 lignes), la route de transcription (api/ai/voice, 170 lignes) et la génération de fichiers (api/ai/files, 210 lignes), soit environ 2 565 lignes de moteur IA directement pertinentes pour le transfert. L'assistant de CELTIIS, baptisé LIA, est un assistant du superviseur adossé à un relevé de données réelles de l'application ; seule sa mécanique technique est transférable, l'ensemble de son rôle métier (supervision, agents recruteurs, performances) étant exclu du transfert conformément aux consignes."));
body.push(h2("5.2 Reconnaissance vocale à quatre canaux de secours"));
body.push(p("La route de transcription vocale de CELTIIS est un composant remarquablement résilient : l'audio du microphone (jusqu'à douze mégaoctets, soit environ dix minutes de dictée) est transcrit par une chaîne de quatre canaux en cascade. Premier canal, un appel HTTP direct à l'API Z.ai avec la configuration du serveur ; deuxième canal, le SDK Z.ai en repli ; troisième canal, l'API publique Z.ai avec le modèle de transcription GLM et des mots-clés métier pour la fidélité du vocabulaire ; quatrième canal, l'API Groq avec le modèle whisper-large-v3 verrouillé sur le français. Chaque canal ne s'exécute que si le précédent n'a rien produit, si bien qu'une panne d'un fournisseur n'interrompt jamais le service vocal. Ce composant a été transféré tel quel dans PAUL IA (route /api/voice) avec la clé Groq ajoutée aux variables d'environnement de production, et vérifié le jour même : une requête audio réelle a produit une transcription en HTTP 200."));
body.push(h2("5.3 Blocs d'action : génération réelle de fichiers et recherche sourcée"));
body.push(p("L'innovation centrale du moteur LIA répond exactement à l'exigence du cadrage — « une IA qui fait au lieu d'expliquer » : le modèle émet en fin de réponse des blocs d'action balisés que le serveur extrait et exécute réellement. Un bloc [[FILE_EXCEL]] ou [[FILE_PDF]] contenant un titre et des colonnes/lignes de données déclenche la création d'un enregistrement de fichier dont les octets sont régénérés à la demande au téléchargement : le format Excel est produit par la bibliothèque exceljs avec en-têtes stylés, filtres automatiques et gel de ligne d'en-tête, le format PDF par la bibliothèque pdf-lib avec tableaux paginés, lignes alternées et pied de page ; l'accès au téléchargement est contrôlé et chaque téléchargement est tracé dans un journal d'audit. Un bloc [[SEARCH]] déclenche une recherche Internet réelle à trois niveaux de secours (appel direct, SDK, canal public avec outil de recherche intégré), puis une synthèse citant les sources sous forme de liens cliquables ; si la recherche échoue, la réponse affiche honnêtement l'indisponibilité plutôt que d'inventer. Ce mécanisme complet a été transféré dans PAUL IA (bibliothèque paul-actions.ts, route /api/files, table paul_ai_files) et vérifié en production le jour même avec des fichiers réellement téléchargés et relus."));
body.push(h2("5.4 Mode vocal à trois phases avec interruption naturelle"));
body.push(p("Le composant de mode vocal de CELTIIS (835 lignes) réalise une conversation vocale continue, proche du mode direct : l'orbe passe par trois phases (écoute, réflexion, parole) alimentées par les évènements réels de la conversation ; en écoute, la reconnaissance vocale du navigateur seule est utilisée (aucun flux audio parallèle) et la fin de parole est détectée par un silence de transcription de 1,6 seconde, ce qui déclenche l'envoi automatique sans aucun bouton ; pendant la réflexion, le micro reste ouvert et une reformulation annule la requête en cours par un contrôleur d'abandon ; pendant la parole, un analyseur surveille le micro avec l'annulation d'écho du navigateur pour qu'un son franc coupe la synthèse (barge-in) sans que l'IA ne se coupe elle-même ; les tampons de transcription sont purgés avant chaque réponse pour qu'aucun résidu de la voix de synthèse ne devienne une question fantôme ; un repli enregistreur (flux audio compressé envoyé à la route de transcription serveur) prend le relais si la reconnaissance du navigateur est indisponible, et un chien de garde relance la session si elle meurt. Ce composant a été transféré et adapté à Paul IA (personnalité universelle, appel des API paul_), déployé dans le bundle de production et vérifié par inspection du code servi."));
body.push(h2("5.5 Ce qui est repris et ce qui reste exclus"));
body.push(p("Du moteur CELTIIS, PAUL IA reprend les mécanismes généraux : chaîne de transcription à quatre canaux, blocs d'action de génération de fichiers et de recherche, architecture vocale à trois phases, nettoyage des transcriptions (suppression des artefacts répétés et recouvrements), analyse d'images transmises au modèle et persistance des conversations avec mode et pièces jointes. Restent strictement exclus, conformément aux consignes : l'identité LIA et la posture d'assistante du superviseur, le relevé de données métier (ai-snapshot.ts), les règles de confidentialité des dossiers d'agents recruteurs, la directive d'évocation des services du superviseur, et toute référence à l'équipe ou aux statistiques CELTIIS. PAUL IA est un assistant universel : il conserve son propre système de prompts et son nom affiché."));

// 6. FACTORY-IA
body.push(h1("6. Le moteur FACTORY-IA : gisement principal de composants transférables"));
body.push(h2("6.1 Architecture générale du moteur ai-core"));
body.push(p("Le dépôt public FACTORY-IA contient le moteur d'orchestration le plus complet des trois applications. Sa bibliothèque ai-core articule cinq couches : un registre de fournisseurs persisté en base (table AIProvider, neuf enregistrements actifs dans l'instantané), un analyseur de requêtes en langue naturelle, un routeur de stratégies, des connecteurs vers douze modèles IA et un contrôle qualité. L'appel d'un utilisateur traverse ces couches en quelques millisecondes de logique locale, puis les fournisseurs sélectionnés sont interrogés en parallèle. Cette architecture répond directement aux exigences de rapidité, de sélection automatique des modèles et de gestion des erreurs formulées dans le cadrage du projet."));
body.push(h2("6.2 Registre de fournisseurs et résilience"));
body.push(p("Le registre (providers/registry.ts) charge depuis la base les fournisseurs actifs avec leurs caractéristiques : modèle par défaut, type d'API, en-tête d'authentification, forces par intention, langues, vitesse, état de santé et statistiques d'appel. Les clés API y sont stockées chiffrées en base64 et ne sont jamais exposées au navigateur ; un cache mémoire de trente secondes évite de relire la base à chaque requête. Chaque appel est journalisé (succès, échec, latence moyenne calculée par moyenne mobile) et les erreurs alimentent une table ProviderErrorLog, sept entrées présentes dans l'instantané. Un contrôle de santé interrogait chaque fournisseur par un appel minimal. Ce mécanisme de registre persistant est directement transférable à PAUL IA et constitue la brique « sélection des modèles IA » demandée."));
body.push(h2("6.3 Routeur d'intentions et stratégies"));
body.push(p("Le routeur (router.ts, version v2) analyse chaque requête selon huit intentions (code, rédaction, analyse, traduction, recherche, calcul, création, image) avec des dictionnaires de mots-clés enrichis, détecte la langue, l'urgence, la complexité, les demandes d'images, les questions d'actualité et surtout les contestations (« c'est faux », « vérifie encore »), qui déclenchent une recherche web obligatoire et une consigne de vérification. Trois stratégies d'exécution en découlent : IA unique (coût un crédit), IA multiple comparée (trois crédits) et IA plus recherche web (deux crédits), plus la génération d'image par Pollinations. La sélection des fournisseurs pondère qualité, correspondance à l'intention, langue et vitesse. Pour les questions d'actualité et les contestations, au moins deux fournisseurs sont forcés afin de comparer les réponses."));
body.push(h2("6.4 Contrôle qualité et comparaison des réponses"));
body.push(p("Le contrôle qualité (quality-gate.ts, 324 lignes) note chaque réponse sur cinq axes pondérés selon le contexte : pertinence, exactitude, fraîcheur, complétude et présentation. Il pénalise les phrases d'échec (« je ne peux pas »), détecte les réponses hors sujet, et vérifie qu'une demande d'image aboutit réellement à une image et non à une explication de comment créer une image — un garde-fou directement inspiré du problème « l'IA explique au lieu de faire » que le cadrage du projet PAUL IA veut éliminer. En cas de note trop basse, le moteur relance d'autres fournisseurs avec un message de correction. Le module compare.ts sélectionne la meilleure réponse entre plusieurs fournisseurs et fusionne les apports complémentaires. Ce dispositif constitue une réponse technique éprouvée à l'exigence de fiabilité du projet."));
body.push(h2("6.5 Recherche Internet et outils"));
body.push(p("La recherche web (tools/search.ts) interroge d'abord le SDK Z.ai (createWebSearch), puis bascule sur l'API Google Custom Search si nécessaire, et complète avec l'API YouTube pour les demandes de tutoriels. Les sources (titre, URL, extrait) sont injectées dans le prompt avec une consigne d'obligation d'usage pour les questions d'actualité, et la réponse finale affiche le nombre de sources analysées. Ce mécanisme fournit la base exigée pour la recherche Internet réelle de PAUL IA, avec traçabilité des sources ; il devra être complété d'un module de distinction entre informations vérifiées et incertaines, qui n'existe pas dans FACTORY-IA."));
body.push(h2("6.6 Authentification, crédits et administration"));
body.push(p("FACTORY-IA comprend une chaîne d'authentification complète (inscription, connexion, session), un système de crédits par requête avec transactions et exemptions d'administration, une facturation Mobile Money (table MomoTransaction) et une console d'administration des fournisseurs (santé, erreurs, utilisateurs, statistiques). Ces composants répondent à la demande de connexion des utilisateurs sur l'application. Deux réserves techniques doivent être portées à connaissance : le hachage des mots de passe utilise SHA-256 avec sel, plus faible que bcrypt ou Argon2 recommandés aujourd'hui, et le jeton de session est dérivé de l'adresse électronique encodée en base64, donc prévisible — ces deux points devront être renforcés lors du transfert. Il faut également signaler que le dépôt FACTORY-IA est actuellement dans un état de conflit de fusion non résolu : deux versions du moteur coexistent dans les mêmes fichiers avec des marqueurs de conflit, ce qui impose de récupérer les composants fichier par fichier en choisissant la version la plus récente et cohérente, plutôt que de copier le dépôt tel quel."));

// 7. Cartographie
body.push(h1("7. Cartographie comparative des fonctionnalités"));
body.push(h2("7.1 Fonctionnalités déjà opérationnelles (à préserver)"));
body.push(p("Les éléments suivants sont vérifiés en production et ne doivent en aucun cas être dégradés par les intégrations à venir : le moteur conversationnel GLM et son classificateur d'intention, la génération d'images avec son moteur de secours, la génération vidéo asynchrone, la synthèse vocale avec son moteur de secours, le stockage média double backend avec le compartiment paul-media, la persistance des conversations avec protection par lignes sur les tables paul_, le point de diagnostic /api/health-zai, et l'interface de discussion sombre responsive avec rendu Markdown et coloration syntaxique. La règle établie s'applique : aucune fonction existante ne sera remplacée sans que sa nouvelle version ait été vérifiée."));
body.push(h2("7.2 Composants techniques récupérables et état du transfert"));
body.push(tableTitle("Tableau 4 : Composants récupérables et état du transfert au 23/11/2026"));
body.push(dataTable(
  ["Composant", "Origine", "Apport à PAUL IA", "État du transfert"],
  [
    ["Reconnaissance vocale à 4 canaux", "CELTIIS (api/ai/voice)", "Transcription française résiliente (config Z.ai, SDK, canal public, Groq whisper)", "Transféré et vérifié en production (transcription 200)"],
    ["Mode vocal à 3 phases + barge-in", "CELTIIS (ai-voice-mode.tsx)", "Conversation vocale continue : auto-envoi, interruption par la voix, repli enregistreur", "Transféré, adapté à Paul IA, présent dans le bundle servi"],
    ["Blocs d'action Excel/PDF", "CELTIIS (api/ai/chat + files)", "Génération réelle de fichiers au clic (exceljs, pdf-lib), audit des téléchargements", "Transféré et vérifié : Excel 6,8 Ko relu, PDF 1.7 téléchargé"],
    ["Recherche web avec sources", "CELTIIS (blocs [[SEARCH]])", "Recherche réelle à 3 niveaux + synthèse citant les sources + repli honnête", "Transféré et vérifié : 3 sources renvoyées"],
    ["Analyse d'images (vision)", "CELTIIS (images en base64)", "Analyse de photos et captures envoyées par l'utilisateur (3 max)", "Transféré et vérifié (bouton d'ajout + paramètre images)"],
    ["Registre multi-fournisseurs", "FACTORY-IA (registry.ts)", "Sélection automatique des modèles, journalisation, santé des fournisseurs", "À transférer (vague suivante)"],
    ["Contrôle qualité des réponses", "FACTORY-IA (quality-gate.ts)", "Notation sur cinq axes, détection du mode « expliquer au lieu de faire »", "À transférer (vague suivante)"],
    ["Authentification et crédits", "FACTORY-IA (auth, credits)", "Comptes utilisateurs et plafonnement des coûts", "À transférer avec renforcement Argon2 (vague suivante)"],
  ],
  [22, 20, 33, 25]
));
body.push(h2("7.3 Fonctionnalités à adapter depuis les schémas CELTIIS"));
body.push(p("Les structures de données de CELTIIS servent de référence pour concevoir, sans les copier, les capacités d'analyse de PAUL IA : la paire imported_files / file_analyses guide la création de paul_files et paul_file_analyses pour l'analyse des documents transmis ; la paire ai_conversations / ai_messages confirme que le modèle de persistance choisi pour PAUL IA (paul_conversations / paul_messages) correspond à la pratique éprouvée des autres applications de l'écosystème ; et les tables de photos de terrain documentent le flux d'analyse d'images envoyées par les utilisateurs, à adapter au contexte d'assistant universel. Aucune donnée professionnelle CELTIIS n'est reprise : seules les structures techniques sont réutilisées."));
body.push(h2("7.4 Fonctionnalités à renforcer"));
body.push(p("Quatre fonctions existantes doivent être renforcées plutôt que remplacées. La route de discussion doit passer en streaming : la fonction chatCompletionStream existe déjà dans zai.ts mais n'est câblée nulle part, si bien que l'utilisateur attend la réponse complète sans voir la progression — la brancher dans la route /api/chat et dans l'interface est le gain de réactivité le moins coûteux du projet. La génération vidéo, sans moteur de secours, doit bénéficier d'un plan de repli et d'un suivi de tâche visible côté interface. La synthèse vocale, limitée par l'absence d'endpoint audio sur l'API publique Z.ai, doit basculer sur un moteur TTS adapté (chapitre 8). Enfin, le classificateur d'intention doit fusionner avec la détection d'actualité et de contestation du routeur v2 afin qu'une seule logique de routage serve le chat et l'agent."));
body.push(h2("7.5 Capacités restant à développer"));
body.push(p("Trois familles de capacités restent à construire pour PAUL IA après la vague 1. L'analyse des documents reçus (lecture de texte de PDF, DOCX, XLSX et CSV transmis) doit compléter l'analyse d'images déjà opérationnelle : la chaîne d'upload, d'extraction et de réponse sur le contenu s'appuiera sur les tables de référence de CELTIIS (imported_files, file_analyses). L'authentification des comptes utilisateurs doit permettre à chacun de retrouver ses conversations et de protéger ses fichiers, avec le renforcement cryptographique imposé (Argon2 ou bcrypt, jetons de session aléatoires) par rapport à la version POC de FACTORY-IA. Enfin, la création et l'exécution d'applications exige un environnement d'exécution isolé, jetable et surveillé — un bac à sable où l'agent écrit, exécute, corrige et prépare les fichiers du projet au téléchargement, sans jamais exécuter du code utilisateur sur le serveur principal ; les opérations de déploiement et de suppression passeront par une autorisation explicite, et la prévisualisation des applications produites demandera un espace de rendu séparé de l'application principale."));

// 8. API et dépendances
body.push(h1("8. API et dépendances supplémentaires nécessaires"));
body.push(p("L'état des dépendances a été vérifié dans package.json et dans la configuration de production, puis mis à jour par la vague 1 : les bibliothèques exceljs et pdf-lib sont désormais installées et en production, la recherche web s'exécute par les canaux du SDK Z.ai sans clé supplémentaire, et le canal Groq est configuré. Le tableau 5 liste l'état de chaque dépendance. Les clés API restantes devront être configurées exclusivement dans les variables d'environnement de PAUL IA, jamais dans le code source ni dans le navigateur."));
body.push(tableTitle("Tableau 5 : Dépendances supplémentaires requises par vague d'intégration"));
body.push(dataTable(
  ["Dépendance / service", "Rôle dans PAUL IA", "Statut actuel"],
  [
    ["SDK Z.ai — modèle GLM conversationnel", "Moteur de discussion et de classification (existant)", "Configuré et vérifié en production"],
    ["Web Speech API (navigateur) + service STT serveur", "Transcription française en direct, détection de fin de parole", "Transféré de CELTIIS (vague 1) : 4 canaux, Groq configuré et vérifié"],
    ["Moteur de synthèse vocale (TTS)", "Réponse vocale progressive et naturelle", "Voix du navigateur utilisée par le mode vocal ; moteur serveur à améliorer"],
    ["exceljs et pdf-lib", "Génération réelle de fichiers Excel et PDF téléchargeables", "Installées et vérifiées en production (vague 1)"],
    ["Bibliothèques d'extraction de documents (PDF, DOCX, XLSX, CSV)", "Analyse des documents transmis par les utilisateurs", "À ajouter ; tables de référence CELTIIS disponibles"],
    ["Bac à sable d'exécution isolé (conteneur jetable)", "Exécution sécurisée du code écrit par l'agent IA", "À concevoir ; aucune exécution sur le serveur principal"],
    ["Argon2 ou bcrypt, jetons de session cryptographiques", "Authentification robuste des comptes", "À transférer de FACTORY-IA avec renforcement (vague 3)"],
    ["Google Custom Search (clé et identifiant de moteur)", "Canal de recherche supplémentaire", "Optionnel : la recherche opère déjà via les canaux Z.ai"],
    ["Clés YouTube Data API (optionnel)", "Résultats vidéo dans les recherches", "Optionnel ; clé à fournir si souhaité"],
  ],
  [34, 36, 30]
));
body.push(p("Une précision s'impose sur la pile vocale désormais en place. Le mode vocal livré suit l'architecture hybride recommandée : reconnaissance vocale du navigateur pour la détection de fin de parole et la latence minimale (fin de parole mesurée sur un silence de transcription de 1,6 seconde, envoi automatique sans bouton), trace écrite affichée en parallèle et archivée dans la conversation, réponse du modèle démarrée dès la fin de parole détectée, lecture à voix haute par la synthèse du navigateur, interruption immédiate par la voix grâce à l'annulation d'écho (barge-in), et repli automatique vers la transcription serveur à quatre canaux lorsque la reconnaissance du navigateur est indisponible. Cette architecture est déployable et vérifiée sur Vercel ; une migration ultérieure vers un fournisseur de voix temps réel natif restera possible sans refonte de l'interface."));

// 9. Plan d'intégration
body.push(h1("9. Intégration réalisée et plan des vagues suivantes"));
body.push(h2("9.1 Vague 1 réalisée et vérifiée le 23 novembre 2026"));
body.push(p("La première vague d'intégration a été exécutée le jour de l'audit, dans l'ordre imposé par la méthode : sauvegarde d'abord, intégration ensuite, tests réels enfin. Un instantané complet de la base de données (89 tables, compteurs de lignes) a été pris avant toute modification et conservé hors du dépôt de code. Les modifications de données se sont limitées à la création additive d'une table paul_ai_files (aucune table existante touchée, aucune donnée CELTIIS ou FACTORY lue ou écrite). Le code transféré a été construit localement, vérifié par compilation complète, engagé dans le dépôt Git puis déployé en production sur le projet paul-ia sans toucher à son adresse ni à son nom affiché. Deux déploiements ont été nécessaires : le premier a livré les composants, le second a corrigé un défaut de routage détecté par les tests (les demandes de tableaux Excel étaient prises pour des demandes d'images — un cas de test réel qui illustre l'obligation de tester réellement chaque fonction)."));
body.push(tableTitle("Tableau 6 : Tests fonctionnels réels effectués en production le 23/11/2026"));
body.push(dataTable(
  ["Test", "Procédure", "Résultat"],
  [
    ["Page de production", "Requête GET sur pia-chat.vercel.app et inspection du bundle", "HTTP 200 ; titre « Paul IA — Assistant Intelligent » ; bouton Mode vocal présent ; composant vocal dans le bundle"],
    ["Discussion texte", "POST /api/chat avec un message de présentation", "HTTP 200 en 10,5 s ; réponse naturelle ; conversation persistée"],
    ["Génération Excel réelle", "« Fais-moi un tableau Excel des ventes : Janvier 150, Février 230, Mars 180 »", "Fichier créé et téléchargé (6 770 octets, format Excel 2007+) ; contenu relu : colonnes et lignes exactes"],
    ["Génération PDF réelle", "« Crée un PDF avec les notes : Awa 16, Kevin 13, Fatou 18 »", "Fichier téléchargé : document PDF version 1.7 valide"],
    ["Recherche Internet", "Demande de recherche sur les tarifs Mobile Money au Bénin", "Recherche réelle exécutée ; 3 sources renvoyées ; synthèse avec citations et mention SOURCES"],
    ["Reconnaissance vocale", "POST /api/voice avec un fichier audio réel (3 s)", "HTTP 200 avec texte transcrit (canal Groq whisper-large-v3 opérationnel)"],
    ["Routage documents", "Test de régression après correction", "Demandes de tableaux/documents routées vers le module chat ; tests unitaires de patterns tous verts"],
  ],
  [20, 38, 42]
));
body.push(h2("9.2 Vagues suivantes et précautions"));
body.push(p("Le plan ci-dessous organise les vagues restantes, chacune assortie de sa sauvegarde préalable et de ses tests réels. La règle de sécurité reste inchangée : lecture seule d'abord, objets préfixés paul_ uniquement, sauvegarde instantanée avant chaque modification, aucune fonction remplacée sans vérification de sa nouvelle version, aucun déploiement sans test fonctionnel complet."));
body.push(dataTable(
  ["Vague", "Contenu", "Livrable vérifié"],
  [
    ["Vague 2 — Consolidation et multi-fournisseurs", "Streaming de la réponse ; registre de fournisseurs préfixé paul_ ; contrôle qualité ; fusion des routeurs", "Réponse progressive visible ; journal des appels IA ; aucune régression des modules"],
    ["Vague 3 — Authentification et comptes", "Inscription/connexion renforcées (Argon2, jetons cryptographiques) ; sessions par utilisateur ; fichiers et conversations liés au compte", "Connexion fonctionnelle ; isolation des données par utilisateur vérifiée"],
    ["Vague 4 — Documents reçus et agent", "Upload et extraction de documents (PDF, DOCX, XLSX, CSV) ; bac à sable isolé pour la programmation ; prévisualisation et téléchargement des projets produits", "Analyse d'un document réel ; exécution d'un projet de démonstration dans le bac à sable"],
  ],
  [20, 44, 36]
));
body.push(p("Chaque vague se termine par une vérification complète sur l'application déployée (ouverture, connexion, fonctionnalités existantes conservées, nouvelles fonctions testées avec des cas réels en français), puis par une mise en production contrôlée. Une étape n'est jamais déclarée terminée au seul motif que le code a été écrit : chaque fonctionnalité est testée réellement avant d'être considérée comme opérationnelle, comme l'a démontré le cas du routage corrigé lors de la vague 1."));

// 10. Risques
body.push(h1("10. Risques, sécurité et préservation des données"));
body.push(p("Le premier risque opérationnel, la perte d'accès aux identifiants techniques, a été levé le 23 novembre 2026 par la re-fourniture des jetons ; il reste une leçon permanente : les identifiants ne sont jamais stockés dans le dépôt de code et doivent être re-communicables à tout moment, d'où l'importance de l'automatisation des déploiements (le mécanisme de déploiement depuis la branche principale, documenté dans les scripts du projet, est désormais le chemin de mise en production). Le deuxième risque est la fragilité du dépôt FACTORY-IA en conflit de fusion : la récupération doit se faire composant par composant avec choix raisonné de la version v2, et non par copie de répertoire. Le troisième risque est technique : la pile vocale hybride repose en partie sur les capacités du navigateur de l'utilisateur, qui varient selon les terminaux ; le composant transféré prévoit déjà le repli automatique vers la transcription serveur lorsque la reconnaissance du navigateur est indisponible, et le repli texte reste possible sans bloquer la conversation."));
body.push(p("Sur le plan de la sécurité, les règles établies restent applicables et sont complétées de trois mesures nouvelles, appliquées dès la vague 1. Les clés API de tous les fournisseurs transférés sont stockées dans les variables d'environnement de PAUL IA (la clé Groq a été ajoutée en type chiffré) et jamais exposées au navigateur. Les identifiants locaux de travail sont conservés dans un fichier protégé ignoré par Git, jamais commité ni réaffiché. Enfin, l'indépendance des applications est maintenue : PAUL IA conserve sa base, ses comptes et ses conversations ; aucune donnée professionnelle CELTIIS ne transite dans PAUL IA ; seules des mécaniques techniques génériques ont été copiées et adaptées ; aucune table hors préfixe paul_ n'est lue ou écrite par le code de PAUL IA, et la table paul_ai_files créée pour les fichiers générés est purement additive."));

// 11. Conclusions
body.push(h1("11. Conclusions et prochaines étapes immédiates"));
body.push(p("L'audit complété et la vague 1 d'intégration confirment la faisabilité du projet et valident son orientation technique. PAUL IA conserve, en production et vérifiée, sa fondation conversationnelle et multimédia : moteur GLM, classificateur d'intention à sept modules corrigé, images, vidéo, audio, stockage média isolé et protégé. Le moteur réel de CELTIIS BASSILA s'est révélé être le gisement attendu : sa chaîne vocale à quatre canaux, son architecture vocale à trois phases avec interruption naturelle, ses blocs d'action de génération réelle de fichiers et de recherche sourcée constituent l'essentiel du chemin vers l'assistant universel multimodal visé — et ces composants sont désormais transférés, adaptés et vérifiés en production sur pia-chat.vercel.app, sans aucune perte des fonctions existantes ni aucune modification des données des autres applications. Le dépôt FACTORY-IA fournira la couche suivante (multi-fournisseurs, contrôle qualité, authentification), avec la précaution imposée par son conflit de fusion."));
body.push(p([
  { t: "Les prochaines étapes immédiates sont les suivantes. Premièrement, valider le présent rapport et l'expérience en production : ouvrir pia-chat.vercel.app, tester le mode vocal (bouton micro), demander un fichier Excel, une recherche avec sources et l'analyse d'une image transmise. Deuxièmement, exécuter la vague 2 (streaming, multi-fournisseurs, contrôle qualité) sur la base de la même discipline de sauvegarde et de tests réels. Troisièmement, préparer la vague 3 (comptes utilisateurs renforcés) afin que chaque utilisateur retrouve ses conversations et fichiers. " },
  { t: "Sur chaque étape, l'avancement sera mesuré par des vérifications réelles sur l'application déployée, et non par la seule écriture du code.", b: true },
]));

// Annexe A
body.push(h1("Annexe A — Inventaire vérifié de la base de données partagée"));
body.push(p("La base Supabase partagée a été interrogée directement en lecture seule le 23 novembre 2026. La répartition par schéma est la suivante : 27 tables dans le schéma celtiis (application CELTIIS BASSILA, dont ai_conversations, ai_messages avec colonnes mode et attachments, imported_files, file_analyses, app_settings), 12 tables métier FACTORY IA dans le schéma public (AIProvider avec 9 enregistrements, User avec 3, CreditTransaction avec 2, ProviderErrorLog avec 7, QueryLog avec 1, Subscription avec 1, ApiKey, AuditLog, MomoTransaction, SearchTool, SearchToolErrorLog et TermsAcceptance vides), et les tables PAUL IA préfixées paul_ dans le schéma public : paul_conversations et paul_messages avec protection par lignes active (policies paul_all_conversations, paul_all_messages), paul_media_files, et paul_ai_files créée le 23/11 pour les fichiers générés. État vivant relevé après la vague 1 : 10 conversations, 30 messages, 2 fichiers générés réels, 2 médias stockés. Le compartiment de stockage paul-media est unique et public. Un instantané complet (89 tables) a été pris avant l'intégration et conservé comme point de restauration."));
body.push(tableTitle("Tableau 7 : Répartition des schémas de la base Supabase partagée"));
body.push(dataTable(
  ["Schéma", "Tables", "Rôle", "Règle d'isolation"],
  [
    ["public (paul_)", "4", "Données PAUL IA : conversations, messages, fichiers média, fichiers générés", "Seul schéma modifiable par le projet PAUL IA"],
    ["public (FACTORY IA)", "12", "Métadonnées du moteur FACTORY IA partagé", "Lecture interdite au-delà des métadonnées ; ne jamais modifier"],
    ["celtiis", "27", "Application CELTIIS BASSILA (métier + moteur IA LIA)", "Jamais modifié ; source du transfert technique uniquement"],
    ["auth / storage / realtime / vault", "46", "Tables système Supabase", "Jamais modifiés"],
  ],
  [22, 12, 40, 26]
));

// Annexe B
body.push(h1("Annexe B — Configuration vérifiée de PAUL IA"));
body.push(p("La configuration de production a été vérifiée directement via l'API Vercel le 23 novembre 2026 : le projet paul-ia porte six variables d'environnement (DATABASE_URL, DIRECT_URL, ZAI_CONFIG_JSON, ZAI_MODEL, ZAI_IMAGE_MODEL, NEXT_PUBLIC_SUPABASE_URL) et deux domaines vérifiés (pia-chat.vercel.app et paul-ia-six.vercel.app). Deux variables ont été ajoutées le jour même pour le canal vocal de secours : GROQ_API_KEY (type chiffré) et GROQ_MODEL (valeur whisper-large-v3). Les valeurs sensibles ne sont jamais affichées dans ce rapport ni stockées dans le dépôt de code : elles résident dans les variables d'environnement Vercel et dans un fichier local protégé ignoré par Git."));
body.push(tableTitle("Tableau 8 : Variables d'environnement de PAUL IA (noms uniquement)"));
body.push(dataTable(
  ["Variable", "Rôle", "Obligatoire"],
  [
    ["DATABASE_URL / DIRECT_URL", "Connexions PostgreSQL (production et migrations)", "Oui"],
    ["ZAI_CONFIG_JSON", "Adresse de l'API publique Z.ai et clé du moteur IA", "Oui"],
    ["ZAI_MODEL", "Modèle conversationnel GLM", "Oui"],
    ["ZAI_IMAGE_MODEL", "Modèle d'image (cogview-4-250304)", "Oui"],
    ["NEXT_PUBLIC_SUPABASE_URL", "Adresse du projet Supabase", "Oui"],
    ["SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY", "Stockage média Supabase Storage", "Optionnel (repli en base)"],
    ["GROQ_API_KEY", "Canal vocal de secours (whisper-large-v3, français)", "Oui (ajoutée le 23/11, chiffrée)"],
    ["GROQ_MODEL", "Modèle de transcription du canal Groq", "Oui (valeur whisper-large-v3)"],
    ["GOOGLE_API_KEY / GOOGLE_CX", "Recherche Google Custom Search (vague suivante)", "Optionnel"],
    ["YOUTUBE_API_KEY", "Résultats vidéo dans la recherche", "Optionnel"],
  ],
  [36, 44, 20]
));

// ── Assemblage 3 sections ──────────────────────────────────────────────────
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT_BODY, size: 24, color: "000000" },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: { run: { font: FONT_HEAD, size: 32, bold: true, color: P.headingColor }, paragraph: { spacing: { before: 360, after: 160, line: 312 } } },
      heading2: { run: { font: FONT_HEAD, size: 28, bold: true, color: P.headingColor }, paragraph: { spacing: { before: 240, after: 120, line: 312 } } },
      heading3: { run: { font: FONT_HEAD, size: 26, bold: true, color: P.headingColor }, paragraph: { spacing: { before: 200, after: 100, line: 312 } } },
    },
  },
  sections: [
    // Section 1 : couverture (marges 0, pas de pied de page)
    {
      properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1({
        title: "PAUL IA — Audit du Moteur IA",
        subtitle: "Transfert et renforcement du moteur d'intelligence artificielle de CELTIIS BASSILA",
        englishLabel: "TECHNICAL AUDIT REPORT",
        metaLines: [
          "Rapport d'audit technique — Version 1.0",
          "Application concernée : PAUL IA (pia-chat.vercel.app)",
          "Date de l'audit : 23 novembre 2026",
        ],
        footerLeft: "PAUL IA — Assistant IA universel",
        footerRight: "Document confidentiel",
        palette: P,
      }),
    },
    // Section 2 : table des matières (numérotation romaine)
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: pageNumFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360, line: 312 },
          children: [new TextRun({ text: "Table des matières", bold: true, size: 32, color: P.headingColor, font: FONT_HEAD })],
        }),
        new TableOfContents("Table des matières", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({
          spacing: { before: 200, line: 312 },
          children: [new TextRun({
            text: "Remarque : cette table des matières est générée par champ. Après toute modification du document, faites un clic droit sur la table puis choisissez « Mettre à jour les champs » pour actualiser les numéros de page.",
            italics: true, size: 18, color: "888888", font: FONT_BODY,
          })],
        }),
        // Pas de PageBreak ici : la section suivante (NEXT_PAGE) assure le saut de page.
      ],
    },
    // Section 3 : corps (numérotation arabe, repart à 1)
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: bodyHeader },
      footers: { default: pageNumFooter() },
      children: body,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("OK", OUT, buf.length, "octets");
});

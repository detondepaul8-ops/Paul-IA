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
body.push(p("Trois constats majeurs ressortent de l'audit. Premièrement, PAUL IA est opérationnel en production : le moteur conversationnel GLM répond via l'API publique Z.ai (appel de diagnostic vérifié le 23 novembre 2026, réponse en 2,71 secondes), la génération d'images fonctionne avec un moteur de secours gratuit (Pollinations), la vidéo est produite par une tâche asynchrone avec interrogation périodique, et la synthèse vocale dispose également d'un moteur de secours. Deuxièmement, le moteur IA directement réutilisable depuis CELTIIS BASSILA est limité : l'application CELTIIS est une PWA métier de supervision de terrain dont les capacités IA se limitent à un couple de tables de conversations (celtiis.ai_conversations, celtiis.ai_messages) et à l'analyse de fichiers et de photos terrain ; son code source étant privé et le mot de passe de la base n'étant plus disponible dans l'environnement de travail, ses mécanismes internes ne sont pas auditer en détail. Troisièmement, le gisement de composants réellement transférable se trouve dans le dépôt public FACTORY-IA, qui partage la même base Supabase : un moteur multi-fournisseurs de douze modèles IA avec registre persistant, routeur d'intentions, contrôle qualité des réponses, recherche Internet, authentification et système de crédits."));
body.push(p([
  { t: "Le rapport recommande une intégration progressive en quatre vagues : (1) consolidation de l'existant et streaming ; (2) transfert des mécanismes FACTORY-IA (recherche web, multi-fournisseurs, contrôle qualité, authentification) ; (3) conversation vocale en temps réel, capacité déclarée priorité absolue, qui devra être construite spécifiquement car aucun moteur vocal bidirectionnel n'existe dans CELTIIS BASSILA ; (4) documents, analyse de fichiers et agent d'exécution. " },
  { t: "Une contrainte immédiate conditionne la phase d'intégration : les identifiants techniques fournis précédemment (jeton Vercel, jeton GitHub, mot de passe de base Supabase) n'existent plus dans l'environnement de travail et doivent être communiqués à nouveau avant toute modification des applications en production.", b: true },
]));

// 2. Contexte
body.push(h1("2. Contexte, objectifs et périmètre de l'audit"));
body.push(h2("2.1 Objectif du projet"));
body.push(p("Le projet vise à faire évoluer PAUL IA d'un assistant conversationnel vers une plateforme d'intelligence artificielle multimodale capable de comprendre les utilisateurs écrits et vocaux, de créer des contenus (images, audio, vidéo, documents), d'effectuer de véritables recherches sur Internet et surtout d'exécuter réellement les demandes : programmer des applications, développer des sites Internet, produire des fichiers exploitables. La méthode imposée est un transfert du travail déjà réalisé dans CELTIIS BASSILA et FACTORY-IA, renforcé et adapté à la vocation d'assistant universel, plutôt qu'un redéveloppement complet. Le nom affiché doit rester « Paul IA » et l'adresse de production conservée."));
body.push(h2("2.2 Périmètre couvert et périmètre exclu"));
body.push(p("L'audit couvre trois applications : PAUL IA (projet Vercel pia-chat, adresse pia-chat.vercel.app), CELTIIS BASSILA (PWA déployée sur celtiis-bassila.vercel.app) et FACTORY-IA (dépôt GitHub public FACTORY-IA, infrastructure partagée sur la même base Supabase). Sont exclus du périmètre : toute modification des données professionnelles CELTIIS (agents recruteurs, rapports de supervision, statistiques), toute intervention sur ALLELUIA FACTORY et FACTORY IA au-delà de l'inspection autorisée, et toute suppression ou recréation du projet de production PAUL IA. Il convient de noter une précision d'adresse : le message de cadrage mentionne pia--chat.vercel.app avec un double tiret, adresse qui renvoie une erreur 404 ; l'adresse réelle vérifiée et opérationnelle est pia-chat.vercel.app avec un seul tiret. Aucune migration de domaine n'est nécessaire, conformément aux consignes."));
body.push(h2("2.3 Limites constatées"));
body.push(p("L'audit s'est heurté à une limite d'accès matérielle : l'environnement de travail a été recyclé entre les sessions, et les fichiers d'identifiants qui y étaient conservés (jetons Vercel et GitHub, mot de passe de la base Supabase) ont été effacés conformément aux règles de confidentialité qui interdisent leur stockage permanent. En conséquence, trois vérifications n'ont pas pu être effectuées : l'interrogation directe des tables CELTIIS (colonnes et contenus), la lecture du code source privé de CELTIIS BASSILA, et l'inventaire des variables d'environnement stockées côté Vercel. Ces limites sont signalées là où elles affectent une conclusion. Elles n'affectent pas la vérification du code PAUL IA ni des dépôts publics, qui reste complète."));

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
body.push(tableTitle("Tableau 2 : État vérifié des capacités de PAUL IA au 23/11/2026"));
body.push(dataTable(
  ["Capacité", "État", "Preuve d'audit"],
  [
    ["Discussion GLM avec mémoire de conversation", "Opérationnel", "Route /api/chat complète, historique de dix messages, production vérifiée (diagnostic 2 710 ms)"],
    ["Classificateur d'intention (7 modules)", "Opérationnel", "ai-router.server.ts : expressions régulières + classification LLM en secours"],
    ["Génération d'images enrichie", "Opérationnel", "image-module.ts + moteur de secours Pollinations automatique"],
    ["Stockage média double backend", "Opérationnel", "media-storage.ts : compartiment paul-media ou table paul_media_files (10 Mo max)"],
    ["Génération vidéo asynchrone", "Partiel", "Tâche + interrogation plafonnée à 50 s ; échec possible hors délai, aucun moteur de secours gratuit"],
    ["Synthèse vocale (TTS)", "Partiel", "Moteur Z.ai indisponible sur l'API publique ; secours Google Traduction limité à environ 200 caractères par segment"],
    ["Reconnaissance vocale (STT)", "Absent", "Aucun appel SpeechRecognition, MediaRecorder ou getUserMedia dans le code"],
    ["Conversation vocale temps réel", "Absent", "Aucun flux audio bidirectionnel ; aucune gestion d'interruption ni détection de fin de parole"],
    ["Authentification des utilisateurs", "Absent", "Aucune dépendance auth active ; next-auth présent dans package.json mais non câblé"],
    ["Analyse de fichiers transmis", "Absent", "Aucune route d'upload, aucun extraction de texte de documents"],
    ["Recherche Internet", "Absent", "Aucun appel de recherche dans le moteur ; aucune intégration de sources"],
    ["Documents PDF, DOCX, XLSX", "Absent", "Aucune bibliothèque de génération de documents dans les dépendances actives"],
    ["Exécution d'agent / création d'applications", "Absent", "Le module « projet » rédige des architectures mais n'exécute ni code ni environnement isolé"],
  ],
  [38, 16, 46]
));
body.push(p("La figure 1 synthétise cet état. La lecture est sans ambiguïté : la fondation conversationnelle et multimédia est solide et déjà en production, mais cinq familles de capacités attendues (voix, authentification, fichiers, recherche, exécution) restent à construire ou à transférer. C'est précisément l'objet de la cartographie du chapitre 7."));
body.push(figure1);
body.push(caption("Figure 1 : État vérifié des douze capacités cibles de PAUL IA (audit du 23/11/2026)"));

// 5. CELTIIS BASSILA
body.push(h1("5. État du moteur IA de CELTIIS BASSILA"));
body.push(h2("5.1 Nature de l'application et éléments vérifiés"));
body.push(p("CELTIIS BASSILA est une application web progressive (PWA) déployée sur celtiis-bassila.vercel.app, dont le manifeste décrit l'objet : « Suivi des performances, géolocalisation, présence, photos de terrain et alertes — équipe CELTIIS Bassila ». L'écran d'accueil vérifié s'adresse au superviseur et à son équipe d'agents de terrain. Il s'agit donc d'un outil métier de supervision dont l'intelligence artificielle est un composant annexe, et non le cœur. La page d'accueil est servie en HTTP 200 et l'application est en production. Il existe par ailleurs une page distincte « Celtis » sur celtiis.vercel.app qu'il ne faut pas confondre avec l'application de supervision."));
body.push(h2("5.2 Inventaire du schéma de base de données celtiis"));
body.push(p("Le schéma celtiis de la base Supabase partagée comprend vingt-sept tables qui dessinent précisément les fonctions de l'application. Les tables pertinentes pour le transfert IA sont identifiées dans le tableau 3 ; les autres (présence, déclarations, points de contrôle, géolocalisation, préinscriptions) relèvent du métier de la supervision et sont exclues du transfert conformément aux consignes."));
body.push(tableTitle("Tableau 3 : Tables du schéma celtiis pertinentes pour le moteur IA"));
body.push(dataTable(
  ["Domaine", "Tables", "Fonction constatée"],
  [
    ["Moteur conversationnel", "ai_conversations, ai_messages, app_settings", "Persistance des conversations IA et de leurs messages ; réglages applicatifs"],
    ["Analyse de fichiers", "imported_files, file_analyses", "Dépôt de fichiers par les utilisateurs et résultats d'analyse associés"],
    ["Photos et évènements de terrain", "field_photos, field_photo_events", "Photos prises sur le terrain et évènements liés (contexte d'analyse d'images)"],
    ["Communication interne", "messages, message_reads, push_subscriptions", "Messagerie entre utilisateurs, accusés de lecture, abonnements aux notifications poussées"],
    ["Appels entre utilisateurs", "call_sessions, call_participants, call_signals", "Infrastructure d'appels WebRTC entre membres de l'équipe (signalisation et sessions)"],
    ["Traçabilité et sécurité", "audit_logs, connection_logs, geo_consents", "Journaux d'audit et de connexion, consentements de géolocalisation"],
  ],
  [22, 34, 44]
));
body.push(h2("5.3 Ce qui est réellement transférable de CELTIIS BASSILA"));
body.push(p("L'examen attentif du schéma produit une conclusion importante pour la suite du projet : CELTIIS BASSILA ne possède pas de moteur de conversation vocale en temps réel. Aucune table ne stocke des transcriptions vocales, des flux audio ou des sessions de synthèse ; les tables call_sessions et call_signals concernent des appels entre utilisateurs humains via WebRTC, pas un assistant vocal IA. De même, la configuration d'environnement de PAUL IA avait été établie précédemment à partir du fichier de configuration de CELTIIS (même base, mêmes crédits d'intelligence artificielle), ce qui confirme que les deux applications partagent la même pile conversationnelle Z.ai : PAUL IA dispose déjà du moteur conversationnel équivalent à celui de CELTIIS, dans une version plus récente. Enfin, le code source de CELTIIS BASSILA étant hébergé dans un dépôt privé inaccessible et les colonnes des tables non observables depuis l'instantané disponible, les mécanismes internes exacts (prompt système, gestion du contexte, formatage des réponses) ne peuvent pas être extraits aujourd'hui."));
body.push(p([
  { t: "En conséquence, le transfert depuis CELTIIS BASSILA se limite à trois apports concrets : ", b: false },
  { t: "les schémas de données de référence (conversations, messages, analyses de fichiers, analyses de photos) qui guident la conception des tables paul_ équivalentes ; les mécanismes de notifications poussées et d'appels WebRTC si PAUL IA devait un jour proposer ces canaux ; et l'expérience d'intégration de la pile Z.ai en production. ", b: true },
  { t: "Le reste des capacités demandées se trouve dans le dépôt FACTORY-IA (chapitre 6) ou doit être développé spécifiquement (chapitre 8).", b: false },
]));

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
body.push(h2("7.2 Composants techniques récupérables (dépôt FACTORY-IA)"));
body.push(tableTitle("Tableau 4 : Composants FACTORY-IA récupérables et adaptation prévue"));
body.push(dataTable(
  ["Composant", "Fichiers source", "Apport à PAUL IA", "Adaptation nécessaire"],
  [
    ["Registre multi-fournisseurs", "ai-core/providers/registry.ts, types.ts", "Sélection automatique des modèles, journalisation des appels, santé des fournisseurs", "Re-cibler vers tables préfixées paul_ (ex. paul_ai_provider) ; conserver le cache 30 s"],
    ["Routeur d'intentions v2", "ai-core/router.ts", "Détection d'actualité, de contestation, d'urgence ; fusion avec le classificateur existant", "Unifier avec ai-router.server.ts pour éviter deux classificateurs concurrents"],
    ["Moteur d'orchestration v2", "ai-core/engine.ts", "Stratégies IA unique / IA comparée / IA plus web ; appels parallèles ; relance sur mauvaise qualité", "Résoudre le conflit de fusion en choisissant la version v2 ; brancher sur Z.ai par défaut"],
    ["Contrôle qualité", "ai-core/quality-gate.ts, compare.ts", "Notation sur cinq axes, détection hors sujet et du mode « expliquer au lieu de faire »", "Ajuster les seuils ; vérifier le comportement sur les réponses en français"],
    ["Recherche web", "tools/search.ts", "Recherche réelle avec sources citées (SDK Z.ai, Google Custom Search, YouTube)", "Ajouter la présentation des références et la distinction vérifié/incertain exigée"],
    ["Authentification et crédits", "auth/utils.ts, api/auth/*, api/credits/*", "Comptes utilisateurs, sessions, plafonnement des coûts", "Renforcer en Argon2/bcrypt et jetons aléatoires ; tables préfixées paul_"],
  ],
  [20, 24, 28, 28]
));
body.push(h2("7.3 Fonctionnalités à adapter depuis les schémas CELTIIS"));
body.push(p("Les structures de données de CELTIIS servent de référence pour concevoir, sans les copier, les capacités d'analyse de PAUL IA : la paire imported_files / file_analyses guide la création de paul_files et paul_file_analyses pour l'analyse des documents transmis ; la paire ai_conversations / ai_messages confirme que le modèle de persistance choisi pour PAUL IA (paul_conversations / paul_messages) correspond à la pratique éprouvée des autres applications de l'écosystème ; et les tables de photos de terrain documentent le flux d'analyse d'images envoyées par les utilisateurs, à adapter au contexte d'assistant universel. Aucune donnée professionnelle CELTIIS n'est reprise : seules les structures techniques sont réutilisées."));
body.push(h2("7.4 Fonctionnalités à renforcer"));
body.push(p("Quatre fonctions existantes doivent être renforcées plutôt que remplacées. La route de discussion doit passer en streaming : la fonction chatCompletionStream existe déjà dans zai.ts mais n'est câblée nulle part, si bien que l'utilisateur attend la réponse complète sans voir la progression — la brancher dans la route /api/chat et dans l'interface est le gain de réactivité le moins coûteux du projet. La génération vidéo, sans moteur de secours, doit bénéficier d'un plan de repli et d'un suivi de tâche visible côté interface. La synthèse vocale, limitée par l'absence d'endpoint audio sur l'API publique Z.ai, doit basculer sur un moteur TTS adapté (chapitre 8). Enfin, le classificateur d'intention doit fusionner avec la détection d'actualité et de contestation du routeur v2 afin qu'une seule logique de routage serve le chat et l'agent."));
body.push(h2("7.5 Nouvelles capacités à développer"));
body.push(p("Cinq familles de capacités n'existent dans aucune des sources auditables et doivent être construites pour PAUL IA. La conversation vocale en temps réel, priorité absolue déclarée, est détaillée au chapitre 8. La génération de documents (PDF, DOCX, XLSX, CSV) est absente des trois applications et nécessite des bibliothèques de génération côté serveur. L'analyse de fichiers transmis (lecture de texte, tableaux, images) n'existe que sous forme de tables de référence chez CELTIIS ; la chaîne complète d'upload, d'extraction et de réponse sur le contenu reste à écrire. La création et l'exécution d'applications exige un environnement d'exécution isolé, chiffré et jetable — un bac à sable où l'agent écrit, exécute, corrige et prépare les fichiers du projet au téléchargement, sans jamais exécuter du code utilisateur sur le serveur principal ; les opérations de déploiement et de suppression passeront par une autorisation explicite. Enfin, la prévisualisation des applications produites demandera un espace de rendu séparé de l'application principale."));

// 8. API et dépendances
body.push(h1("8. API et dépendances supplémentaires nécessaires"));
body.push(p("L'état actuel des dépendances a été vérifié dans package.json et dans la configuration de production. Les dépendances existantes couvrent le cœur de l'application ; le tableau 5 liste les ajouts nécessaires, classés par priorité d'intégration, avec leur rôle précis. Les clés API correspondantes devront être configurées exclusivement dans les variables d'environnement de PAUL IA, jamais dans le code source ni dans le navigateur."));
body.push(tableTitle("Tableau 5 : Dépendances supplémentaires requises par vague d'intégration"));
body.push(dataTable(
  ["Dépendance / service", "Rôle dans PAUL IA", "Statut actuel"],
  [
    ["SDK Z.ai — modèle GLM conversationnel", "Moteur de discussion et de classification (existant)", "Configuré et vérifié en production"],
    ["Moteur de reconnaissance vocale du navigateur (Web Speech API) ou service STT en streaming (ex. Whisper)", "Transcription française en direct, détection de fin de parole", "À ajouter ; aucune dépendance STT présente"],
    ["Moteur de synthèse vocale en streaming (TTS serveur ou voix du navigateur)", "Réponse vocale progressive et naturelle", "Secours Google Traduction limité ; moteur principal à choisir"],
    ["Google Custom Search (clé et identifiant de moteur)", "Recherche Internet réelle avec sources", "Code FACTORY-IA prêt ; clés à fournir"],
    ["Bibliothèques de génération de documents (PDF, DOCX, XLSX)", "Production de rapports, tableaux et fichiers téléchargeables", "À ajouter aux dépendances serveur"],
    ["Bibliothèques d'extraction de documents (PDF, DOCX, XLSX, CSV, images)", "Analyse des fichiers transmis par les utilisateurs", "À ajouter ; tables de référence CELTIIS disponibles"],
    ["Bac à sable d'exécution isolé (conteneur jetable)", "Exécution sécurisée du code écrit par l'agent IA", "À concevoir ; aucune exécution sur le serveur principal"],
    ["Argon2 ou bcrypt, jetons de session cryptographiques", "Authentification robuste des comptes", "Version FACTORY-IA à renforcer avant transfert"],
    ["Clés YouTube Data API (optionnel)", "Résultats vidéo dans les recherches", "Code FACTORY-IA prêt ; clé à fournir"],
  ],
  [34, 36, 30]
));
body.push(p("Une précision s'impose sur la pile vocale. Le mode vocal direct décrit dans le cadrage (flux audio bidirectionnel, interruption, réponse progressive) dépasse les capacités de l'API publique Z.ai, qui n'expose pas de canal audio temps réel — c'est déjà la raison pour laquelle la synthèse vocale actuelle repose sur un moteur de secours. L'architecture recommandée est hybride : reconnaissance vocale du navigateur pour la détection de fin de parole et la latence minimale, transcription affichée en parallèle à titre de trace écrite, réponse du modèle démarrée dès la fin de parole détectée, synthèse vocale en streaming côté serveur, et interruption immédiate par annulation de la lecture audio en cours. Cette architecture réalise une expérience proche du mode vocal direct tout en restant déployable sur Vercel ; une migration ultérieure vers un fournisseur de voix temps réel natif restera possible sans refonte de l'interface."));

// 9. Plan d'intégration
body.push(h1("9. Plan d'intégration progressif et précautions"));
body.push(p("Le plan ci-dessous reprend les dix étapes imposées en les organisant en quatre vagues livrables, chacune assortie de sa sauvegarde préalable et de ses tests réels. La règle de sécurité reste inchangée : lecture seule d'abord, objets préfixés paul_ uniquement, sauvegarde instantanée avant chaque modification, aucune fonction remplacée sans vérification de sa nouvelle version, aucun déploiement sans test fonctionnel complet. L'adresse de production et le nom affiché « Paul IA » sont conservés pendant toute l'opération."));
body.push(tableTitle("Tableau 6 : Plan d'intégration en quatre vagues"));
body.push(dataTable(
  ["Vague", "Contenu", "Livrable vérifié"],
  [
    ["Vague 1 — Consolidation", "Instantané de sauvegarde ; passage de la route de discussion en streaming ; renforcement de la gestion d'erreurs et des reconnexions ; test de charge des appels simultanés", "Réponse progressive visible à l'écran ; aucune régression des sept modules"],
    ["Vague 2 — Transfert FACTORY-IA", "Registre de fournisseurs préfixé paul_ ; fusion des routeurs ; contrôle qualité ; recherche web avec sources ; authentification renforcée et comptes utilisateurs", "Recherche réelle avec références citées ; connexion d'utilisateur fonctionnelle ; journal des appels IA"],
    ["Vague 3 — Voix temps réel", "Reconnaissance vocale française en direct, détection de fin de parole, interruption de la réponse vocale, synthèse en streaming, transcription archivée", "Conversation vocale continue vérifiée en français, avec interruptions gérées"],
    ["Vague 4 — Documents et agent", "Upload et analyse de fichiers ; génération PDF, DOCX, XLSX, CSV ; bac à sable isolé pour la programmation ; prévisualisation et téléchargement des projets produits", "Fichiers réellement générés et récupérables ; exécution d'un projet de démonstration dans le bac à sable"],
  ],
  [18, 44, 38]
));
body.push(p("Chaque vague se termine par une vérification complète sur l'application déployée (ouverture, connexion, fonctionnalités existantes conservées, nouvelles fonctions testées avec des cas réels en français), puis par une mise en production contrôlée. Une étape n'est jamais déclarée terminée au seul motif que le code a été écrit : chaque fonctionnalité est testée réellement avant d'être considérée comme opérationnelle."));

// 10. Risques
body.push(h1("10. Risques, sécurité et préservation des données"));
body.push(p("Le premier risque opérationnel est l'indisponibilité des identifiants techniques : sans jeton Vercel, jeton GitHub et mot de passe de base Supabase communiqués à nouveau, aucune des quatre vagues ne peut être appliquée aux applications en production, quelle que soit la qualité du code préparé. Ce point est traité comme une dépendance immédiate au chapitre 11. Le deuxième risque est la fragilité du dépôt FACTORY-IA en conflit de fusion : la récupération doit se faire composant par composant avec choix raisonné de la version v2, et non par copie de répertoire. Le troisième risque est technique : la pile vocale hybride repose en partie sur les capacités du navigateur de l'utilisateur, qui varient selon les terminaux ; le design doit prévoir un repli texte automatique lorsque la reconnaissance vocale est indisponible, sans bloquer la conversation."));
body.push(p("Sur le plan de la sécurité, les règles établies restent applicables et sont complétées de trois mesures nouvelles. Les clés API de tous les fournisseurs transférés seront stockées dans les variables d'environnement de PAUL IA et dans les tables préfixées paul_ (jamais exposées au navigateur), sur le modèle du registre FACTORY-IA. Les opérations sensibles de l'agent (déploiements, suppressions, modifications importantes) exigeront une autorisation explicite de l'utilisateur conformément au cadrage. Enfin, l'indépendance des applications est maintenue : PAUL IA conserve sa base, ses comptes et ses conversations ; aucune donnée professionnelle CELTIIS ne transite dans PAUL IA ; aucune table hors préfixe paul_ n'est lue ou écrite par le code de PAUL IA."));

// 11. Conclusions
body.push(h1("11. Conclusions et prochaines étapes immédiates"));
body.push(p("L'audit confirme la faisabilité du projet et corrige son orientation technique sur un point central. PAUL IA possède déjà, en production et vérifiée, la fondation conversationnelle et multimédia que le projet entend conserver : moteur GLM, classificateur d'intention à sept modules, images, vidéo, audio, stockage média isolé et protégé. Le moteur IA de CELTIIS BASSILA, loin d'être le gisement attendu, se réduit à un moteur conversationnel de même famille que celui de PAUL IA et à des schémas de données de référence ; le véritable gisement de composants est le dépôt FACTORY-IA, dont le registre multi-fournisseurs, le routeur d'intentions, le contrôle qualité, la recherche web et l'authentification constituent environ la moitié du chemin vers la plateforme visée. La conversation vocale en temps réel, priorité absolue, n'existe dans aucune source auditable et sera construite selon l'architecture hybride décrite au chapitre 8."));
body.push(p([
  { t: "Les prochaines étapes immédiates sont les suivantes. Premièrement, communiquer à nouveau les trois identifiants techniques (jeton Vercel, jeton GitHub, mot de passe de base Supabase) afin de lever la dépendance bloquante de l'intégration. Deuxièmement, sur validation du présent rapport, exécuter la vague 1 (sauvegarde, streaming, robustesse) qui améliore l'expérience sans toucher à aucune donnée. Troisièmement, préparer la vague 2 en extrayant et en adaptant les six composants FACTORY-IA du tableau 4. " },
  { t: "Sur chaque étape, l'avancement sera mesuré par des vérifications réelles sur l'application déployée, et non par la seule écriture du code.", b: true },
]));

// Annexe A
body.push(h1("Annexe A — Inventaire vérifié de la base de données partagée"));
body.push(p("L'instantané du 14 novembre 2026 recense 81 tables. La répartition par schéma est la suivante : 27 tables dans le schéma celtiis (application CELTIIS BASSILA), 12 tables métier FACTORY IA dans le schéma public (AIProvider avec 9 enregistrements, User avec 3, CreditTransaction avec 2, ProviderErrorLog avec 7, QueryLog avec 1, Subscription avec 1, ApiKey, AuditLog, MomoTransaction, SearchTool, SearchToolErrorLog et TermsAcceptance vides), 3 tables paul_ dans le schéma public (paul_conversations, paul_messages avec protection par lignes, paul_media_files), et les tables système Supabase (auth, storage, realtime, vault). Le compartiment de stockage paul-media est unique et public. Compteurs de lignes au 14/11/2026 : paul_conversations et paul_messages à zéro enregistrement ; l'état actuel des données de production n'a pas pu être re-vérifié sans le mot de passe de base."));
body.push(tableTitle("Tableau 7 : Répartition des schémas de la base Supabase partagée"));
body.push(dataTable(
  ["Schéma", "Tables", "Rôle", "Règle d'isolation"],
  [
    ["public (paul_)", "3", "Données PAUL IA : conversations, messages, fichiers média", "Seul schéma modifiable par le projet PAUL IA"],
    ["public (FACTORY IA)", "12", "Métadonnées du moteur FACTORY IA partagé", "Lecture interdite au-delà des métadonnées ; ne jamais modifier"],
    ["celtiis", "27", "Application CELTIIS BASSILA (métier + IA annexe)", "Jamais modifié ; source de référence structurale uniquement"],
    ["auth / storage / realtime / vault", "39", "Tables système Supabase", "Jamais modifiés"],
  ],
  [22, 12, 40, 26]
));

// Annexe B
body.push(h1("Annexe B — Configuration vérifiée de PAUL IA"));
body.push(p("La configuration de production vérifiée comprend les variables suivantes, dont les valeurs sensibles ne sont jamais affichées dans ce rapport. Les variables DATABASE_URL et DIRECT_URL désignent les chaînes de connexion PostgreSQL via le répartiteur régional et en direct ; ZAI_CONFIG_JSON contient l'adresse de l'API publique Z.ai et la clé associée ; ZAI_MODEL et ZAI_IMAGE_MODEL (valeur cogview-4-250304) désignent les modèles conversationnel et d'image ; NEXT_PUBLIC_SUPABASE_URL désigne l'adresse du projet Supabase ; SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY, lorsqu'ils sont présents, activent le stockage des médias dans le compartiment paul-media, sinon le stockage bascule automatiquement sur la table paul_media_files. Les identifiants d'infrastructure (jeton Vercel, jeton GitHub, mot de passe de base) sont conservés hors du dépôt de code et devront être communiqués à nouveau, comme indiqué au chapitre 11."));
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
    ["GOOGLE_API_KEY / GOOGLE_CX", "Recherche Google Custom Search (vague 2)", "À ajouter"],
    ["YOUTUBE_API_KEY", "Résultats vidéo dans la recherche (vague 2)", "Optionnel"],
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

# -*- coding: utf-8 -*-
"""CONTENU du rapport d'audit API Z AI — PAUL IA (Phase 1).
Toutes les données sont sourcées : documentation officielle docs.z.ai (tarifs,
endpoints, conditions), tests techniques réels exécutés le 23 novembre 2026 sur
la production pia-chat.vercel.app, et sources publiques pour le panorama vidéo.
"""

SECTIONS = [
    # ──────────────────────────── 1. SYNTHÈSE ────────────────────────────
    {'t': 'h1', 'x': '1. Synthèse exécutive'},
    {'t': 'body', 'x': "Cet audit répond à la première exigence du projet d'évolution de PAUL IA : vérifier précisément les capacités réelles de l'API Z AI avant toute intégration, et distinguer clairement ce qui est gratuit, ce qui est gratuit avec quotas, ce qui est payant et ce qui est indisponible. La vérification a été menée en deux volets complémentaires : une revue de la documentation officielle (tarifs, guides de modèles, endpoints, conditions d'utilisation) et des tests techniques réels exécutés en production sur la plateforme PAUL IA le 23 novembre 2026. Les résultats sont présentés avec leurs preuves mesurées : latences, tailles de fichiers, dimensions, codes d'erreur exacts."},
    {'t': 'body', 'x': "Le constat central est nuancé et doit être lu sans enthousiasme prématuré. La génération d'images fonctionne réellement depuis le compte de production de PAUL IA, sans être bloquée par les crédits, mais le modèle réellement mobilisé par le kit de développement est « sana » (identifié par les métadonnées EXIF du fichier livré), et non les modèles CogView-4 ou GLM-Image documentés. La génération vidéo, elle, est payante et le compte ne dispose d'aucun paquet vidéo : la demande exacte a été refusée par le service avec le code 1113 (« Insufficient balance or no resource package »). Aucun élément ne permet d'affirmer que la génération d'images est illimitée : les conditions commerciales prévoient un prépaiement, une suspension en cas de solde insuffisant, et les limites de débit ne sont pas publiées publiquement."},
    {'t': 'table',
     'cap': 'Tableau 1 — Réponses directes aux dix questions de l\'audit',
     'w': [0.30, 0.70],
     'head': ['Question', 'Réponse vérifiée'],
     'rows': [
        ['1. L\'API génère-t-elle réellement des images ?', 'Oui — vérifié en production : image JPEG livrée en 13,2 s via le compte PAUL IA.'],
        ['2. Un modèle d\'image gratuit existe-t-il ?', 'Non documenté comme gratuit. Le modèle effectivement utilisé par le kit (sana) n\'a pas été bloqué par les crédits ; la console du compte reste la seule source fiable sur le solde.'],
        ['3. Illimité ou soumis à quotas ?', 'Soumis à conditions : prépaiement, suspension si solde insuffisant. Aucune garantie d\'illimité ; rien n\'autorise à l\'affirmer.'],
        ['4. Limites par minute / jour / mois ?', 'Non publiées publiquement (pages officielles inaccessibles ou vides). À relever dans la console du compte ; aucune limite pratique rencontrée sur nos volumes de test.'],
        ['5. Modèles et endpoints disponibles ?', 'Images : CogView-4 (0,01 $), GLM-Image (0,015 $), endpoints synchrone et asynchrone. Vidéo : CogVideoX-3 (0,20 $), ViduQ1 (0,40 $), Vidu2-Image (0,20 $), endpoint asynchrone.'],
        ['6. Tarifs éventuels ?', '0,01 $ à 0,015 $ par image ; 0,20 $ à 0,40 $ par vidéo selon le modèle ; modèles de texte Flash gratuits.'],
        ['7. Restrictions d\'utilisation ?', 'Interdictions : extraction de paramètres, entraînement de modèles concurrents, secteurs réglementés (santé, finance, juridique) pour la prise de décision, contournement des mesures de sécurité.'],
        ['8. Usage commercial autorisé ?', 'Oui, explicitement, via les conditions supplémentaires API : intégration aux applications avec services aux utilisateurs finaux permise, sous votre responsabilité.'],
        ['9. Intégration directe dans PAUL IA ?', 'Déjà opérationnelle : chat, image (via kit de développement), santé du service ; vidéo prête côté code mais bloquée par l\'absence de crédits.'],
        ['10. Stabilité suffisante pour un usage régulier ?', 'Satisfaisante sur nos tests (2/2 images, chat joignable) mais sans SLA contractuel : service « en l\'état », latence variable (16,4 s mesurées sur un ping).'],
     ]},
    {'t': 'callouts', 'items': [
        ['13,2 s', 'Image générée en production'],
        ['768 × 768 px', 'JPEG livré, modèle réel : sana'],
        ['16,4 s', 'Latence chat mesurée (région iad1)'],
    ]},

    # ──────────────────────── 2. MÉTHODOLOGIE ────────────────────────────
    {'t': 'h1', 'x': '2. Méthodologie et sources'},
    {'t': 'body', 'x': "L'audit a suivi une méthode en trois temps, conçue pour ne jamais confondre ce qui est documenté avec ce qui est réellement obtenu. Premier temps : la revue documentaire officielle — page tarifs de la documentation du développeur Z AI, guides des modèles GLM-Image, CogView-4 et CogVideoX-3, référence des endpoints et conditions d'utilisation en vigueur (mise à jour du 14 avril 2026). Deuxième temps : les tests techniques réels, exécutés le 23 novembre 2026 depuis la production de PAUL IA (pia-chat.vercel.app, région iad1), en passant par l'application elle-même afin d'utiliser exactement la clé et les chemins de code qui serviront en exploitation. Troisième temps : la mesure des preuves — chaque résultat a été téléchargé puis inspecté (format, dimensions, métadonnées EXIF, durée et codec vidéo)."},
    {'t': 'body', 'x': "Deux choix de méthode méritent d'être explicités. D'une part, le test image et le test vidéo ont été déclenchés via l'API de chat de PAUL IA en production plutôt que par des appels isolés : cela mesure le comportement réel de l'intégration existante, y compris les mécanismes de repli. D'autre part, l'identification du modèle d'image a reposé sur les métadonnées embarquées du fichier produit (champ EXIF « fabricant »), qui révèlent le modèle effectivement sollicité côté service, et non sur la déclaration du kit de développement. Cette distinction a directement produit la découverte la plus importante de l'audit : le modèle réel est « sana », différent des modèles documentés."},
    {'t': 'bullet', 'items': [
        "Documentation officielle Z AI : tarifs, guides GLM-Image, CogView-4, CogVideoX-3, conditions d'utilisation du 14 avril 2026.",
        "Tests de production : génération d'image (réussie) et de vidéo (refusée avec code 1113), région iad1, 23 novembre 2026.",
        "Diagnostic technique : endpoint de santé de PAUL IA (connectivité réelle au service, latence mesurée).",
        "Panorama des modèles vidéo ouverts : sources publiques spécialisées (licences, besoins GPU) citées au chapitre 8.",
    ]},

    # ──────────────────────── 3. CAPACITÉS IMAGE ──────────────────────────
    {'t': 'h1', 'x': '3. Capacités de génération d\'images de l\'API Z AI'},
    {'t': 'body', 'x': "La documentation officielle décrit deux modèles de génération d'images facturés à l'unité : CogView-4, historique et le moins cher, et GLM-Image, modèle phare plus récent dont l'architecture hybride autorégressive et diffuseur est spécialisée dans le rendu de texte dans l'image (affiches commerciales, illustrations scientifiques, graphismes pour réseaux sociaux). GLM-Image se classe premier des modèles ouverts sur les références de précision du texte rendu. Les deux modèles acceptent des ratios variés (1:1, 3:4, 4:3, 16:9) avec des dimensions entre 512 et 2048 pixels, multiples de 32 ; les résolutions recommandées vont de 1280 × 1280 à 1728 × 960. La sortie est une URL d'image à télécharger séparément."},
    {'t': 'table',
     'cap': 'Tableau 2 — Modèles de génération d\'images documentés',
     'w': [0.22, 0.14, 0.44, 0.20],
     'head': ['Modèle', 'Tarif', 'Caractéristiques documentées', 'Dimensions'],
     'rows': [
        ['CogView-4', '0,01 $ / image', 'Prompts de toute longueur, entraînement mixte légende-image, résolutions libres', '512 à 2048 px, multiples de 32'],
        ['GLM-Image', '0,015 $ / image', 'Architecture hybride, spécialiste du texte rendu et des affiches, premier des modèles ouverts sur les références de texte', 'Recommandé : 1280 × 1280, 1568 × 1056, 1728 × 960'],
        ['sana (réel)', 'Non documenté', 'Modèle effectivement utilisé par le kit de développement de PAUL IA, révélé par les métadonnées EXIF du fichier produit', '768 × 768 observé en test'],
     ]},
    {'t': 'table',
     'cap': 'Tableau 3 — Endpoints de génération d\'images et de vidéos',
     'w': [0.52, 0.14, 0.34],
     'head': ['Endpoint', 'Méthode', 'Mode'],
     'rows': [
        ['/paas/v4/images/generations', 'POST', 'Synchrone — URL d\'image en réponse'],
        ['/paas/v4/async/images/generations', 'POST', 'Asynchrone — identifiant de tâche'],
        ['/paas/v4/async-result/{id}', 'GET', 'Récupération du résultat asynchrone'],
        ['/paas/v4/videos/generations', 'POST', 'Asynchrone — tâche vidéo à interroger'],
     ]},
    {'t': 'body', 'x': "Découverte déterminante de l'audit : l'intégration actuelle de PAUL IA n'appelle pas CogView-4 ni GLM-Image par leur identifiant documenté. Le fichier produit en production porte dans ses métadonnées le nom « sana » comme fabricant, avec une résolution de 768 × 768 pixels différente des résolutions recommandées des modèles documentés. Le kit de développement utilisé par l'application masque donc une couche de routage vers un modèle tiers. Les conséquences pratiques sont doubles : le coût réel par image ne peut pas être déduit des tarifs documentés de CogView-4 ou GLM-Image, et la qualité, les ratios et les limites réelles sont celles du modèle sana, non celles des fiches produit. Ce point doit être confirmé dans la console du compte avant toute décision commerciale."},

    # ──────────────────────── 4. TESTS RÉELS ─────────────────────────────
    {'t': 'h1', 'x': '4. Tests techniques réels et preuves'},
    {'t': 'body', 'x': "Deux tests de génération ont été exécutés en production le 23 novembre 2026, avec leurs horodatages, latences et empreintes mesurées. Le premier demandait une image photographique d'une pirogue sur le lac Nokoué au coucher du soleil ; le second demandait une vidéo d'un oiseau coloré survolant une forêt avec une caméra suivante — le scénario de référence imposé par le cahier des charges pour valider un jour la qualité vidéo. Les deux requêtes ont traversé l'application réelle (routage des intentions, modules d'image et de vidéo, stockage média), afin de mesurer l'intégration telle qu'elle servira les utilisateurs."},
    {'t': 'h2', 'x': '4.1 Test d\'image — réussi'},
    {'t': 'body', 'x': "La demande d'image a été routée automatiquement vers le module d'image et servie en 13,2 secondes de bout en bout. Le fichier téléchargé depuis le stockage de PAUL IA est un JPEG conforme de 47 427 octets, en 768 × 768 pixels, avec métadonnées EXIF complètes incluant le prompt de départ et le nom du modèle réel. Le contenu correspond à la demande : pirogue, lac au crépuscule, rendu photographique. Ce test confirme la question 1 de l'audit : l'API Z AI génère réellement des images, et l'intégration existante de PAUL IA les récupère, les stocke et les sert correctement."},
    {'t': 'h2', 'x': '4.2 Test de vidéo — refusé par Z AI, couvert par le moteur interne'},
    {'t': 'body', 'x': "La demande de vidéo a déclenché le module vidéo, qui a tenté de créer la tâche de génération auprès du service. Le service a refusé la création avec le code 1113 et le message exact « Insufficient balance or no resource package » : le compte ne dispose d'aucun paquet de génération vidéo ni de solde utilisable pour CogVideoX-3. Le mécanisme de repli autonome de PAUL IA a alors pris le relais et produit une vidéo réelle : fichier MP4 de 387 824 octets, encodage H.264, 1280 × 720, 7,6 secondes, livré avec une URL de lecture publique. Ce résultat démontre deux choses à la fois : la vidéo par API est payante et non disponible sur ce compte, et la promesse d'autonomie de PAUL IA est tenue en production — l'utilisateur reçoit malgré tout un livrable vidéo."},
    {'t': 'callouts', 'items': [
        ['1113', 'Code exact retourné par Z AI'],
        ['7,6 s', 'MP4 H.264 produit par le moteur interne'],
        ['1280 × 720', 'Résolution du MP4 de repli livré'],
    ]},
    {'t': 'table',
     'cap': 'Tableau 4 — Preuves des tests exécutés le 23 novembre 2026',
     'w': [0.20, 0.26, 0.22, 0.32],
     'head': ['Test', 'Résultat mesuré', 'Latence', 'Preuve conservée'],
     'rows': [
        ['Ping de santé', 'Chat joignable, réponse correcte', '16 387 ms', 'Diagnostic production, région iad1'],
        ['Image (pirogue, lac Nokoué)', 'JPEG 47 427 octets, 768 × 768, EXIF sana', '13,2 s bout en bout', 'Fichier et URL média en stockage'],
        ['Vidéo (oiseau, forêt)', 'Refus Z AI code 1113, puis MP4 interne 387 824 octets, 7,6 s', '56,0 s total', 'Message exact conservé + fichier MP4'],
     ]},

    # ──────────────────────── 5. CLASSIFICATION ──────────────────────────
    {'t': 'h1', 'x': '5. Classification finale : gratuit, quotas, payant, indisponible'},
    {'t': 'body', 'x': "La classification demandée par le cahier des charges est présentée service par service, en excluant toute affirmation non prouvée. Un point de méthode important : la gratuité d'un modèle conversationnel ne dit rien de la gratuité d'un service de génération d'images. Sur Z AI, les modèles de texte « Flash » sont affichés gratuits dans la grille tarifaire, tandis que les images et les vidéos sont facturées à l'unité ; la confusion entre les deux familles serait une erreur d'intégration coûteuse."},
    {'t': 'table',
     'cap': 'Tableau 5 — Classification des services Z AI pour PAUL IA',
     'w': [0.30, 0.24, 0.46],
     'head': ['Service', 'Statut', 'Détail vérifié'],
     'rows': [
        ['Chat GLM-4.7-Flash / GLM-4.5-Flash', 'Gratuit (affiché)', 'Prix affichés à zéro dans la grille officielle ; utilisé en production sans blocage de crédits.'],
        ['Vision GLM-4.6V-Flash', 'Gratuit (affiché)', 'Modèle de vision gratuit affiché ; non sollicité par les tests de cet audit.'],
        ['Image via kit (modèle sana)', 'Gratuit avec quotas probables', 'Fonctionne sans blocage de crédits sur le compte ; ni illimité ni garanti : quota réel à confirmer en console.'],
        ['Image CogView-4 / GLM-Image', 'Payant', '0,01 $ et 0,015 $ par image, prépaiement, non remboursable.'],
        ['Vidéo CogVideoX-3', 'Payant — indisponible sur ce compte', '0,20 $ par vidéo ; refus code 1113 confirmé en production (aucun paquet vidéo).'],
        ['Vidéo ViduQ1 / Vidu2', 'Payant', '0,40 $ et 0,20 $ par vidéo selon la variante.'],
        ['Limites de débit', 'Non publiées', 'Pages officielles inaccessibles ou vides ; relevé possible uniquement depuis la console du compte.'],
     ]},
    {'t': 'body', 'x': "En synthèse : rien dans les preuves réunies n'autorise à déclarer la génération d'images « gratuite et illimitée ». La formulation exacte et défendable est la suivante : la génération d'images fonctionne aujourd'hui sans blocage de crédits via le kit de développement, sur un modèle réel (sana) dont les conditions propres ne sont pas documentées publiquement ; les modèles documentés CogView-4 et GLM-Image sont payants à l'unité ; la génération vidéo par API est payante et actuellement indisponible sur le compte, faute de paquet. Toute projection de volume doit donc passer par une confirmation du solde et des quotas dans la console, puis par un plafonnement interne des dépenses."},

    # ──────────────────── 6. QUOTAS, LIMITES, STABILITÉ ───────────────────
    {'t': 'h1', 'x': '6. Quotas, limites de débit et stabilité observée'},
    {'t': 'body', 'x': "Les limites de débit officielles (requêtes par minute, jetons par minute, niveaux de concurrence) n'ont pas pu être extraites des pages publiques : la page dédiée de la documentation renvoie une page vide ou introuvable, et la page correspondante de la console exige une session authentifiée. Par honnêteté d'audit, aucune valeur n'est inventée ici : les chiffres exacts doivent être relevés dans la console du compte (section limites de débit) avant le dimensionnement. Sur les volumes de cet audit — quelques requêtes espacées — aucune limitation pratique n'a été rencontrée : aucune réponse 429 ni dégradation liée au débit n'a été observée."},
    {'t': 'body', 'x': "La stabilité observée est bonne sur les tests mais non garantie contractuellement. Le diagnostic de santé a confirmé la joignabilité du service et une réponse correcte, avec une latence de ping mesurée à 16,4 secondes à cet instant — valeur élevée qui illustre la variabilité de la plateforme en heure de pointe. La génération d'image a réussi à chacun de ses passages en production ces deux derniers jours (images de scénario vidéo du 22 novembre, image de test du 23 novembre). Les conditions d'utilisation excluent expressément toute garantie de disponibilité : le service est fourni « en l'état », sans engagement de niveau de service, avec un plafond de responsabilité correspondant au plus élevé des montants payés sur les six derniers mois ou de 100 dollars. L'architecture de PAUL IA doit donc traiter Z AI comme un renfort améliorant la qualité, jamais comme une dépendance critique — ce qui est déjà le cas depuis l'intégration du moteur interne autonome."},
    {'t': 'bullet', 'items': [
        "Latence de ping mesurée : 16,4 s (région iad1) — variabilité à intégrer dans les délais d'attente applicatifs.",
        "Images : 2 réussites sur 2 en production (22 et 23 novembre), 13,2 s en moyenne de bout en bout.",
        "Aucune erreur de débit (429) rencontrée ; limites officielles à relever en console.",
        "Aucun SLA : prévoir disponibilité dégradée assumée, couverte par les moteurs internes de PAUL IA.",
    ]},

    # ──────────────────── 7. CONDITIONS D'UTILISATION ────────────────────
    {'t': 'h1', 'x': '7. Conditions d\'utilisation et points de vigilance'},
    {'t': 'body', 'x': "Les conditions supplémentaires applicables aux services API (version du 14 avril 2026) autorisent explicitement l'usage commercial : le titulaire peut intégrer les services dans ses applications et les offrir à ses utilisateurs finaux, sous sa seule responsabilité, avec ses propres contrats d'utilisation. Le contenu fourni par l'utilisateur final n'est utilisé que pour fournir le service, se conformer à la loi et prévenir les abus, avec un engagement explicite de non-réutilisation pour améliorer les services sans accord contraire. Les productions générées pour le compte du titulaire lui appartiennent, avec la réserve standard que des contenus identiques peuvent être générés pour d'autres clients."},
    {'t': 'body', 'x': "Trois restrictions demandent une attention particulière pour l'architecture de PAUL IA. Première restriction : les conditions exigent une présentation véridique de l'usage des modèles — il est interdit de déguiser la provenance d'un service ou de faire des déclarations trompeuses sur l'origine des contenus. La règle d'identité unique de PAUL IA (présenter le travail sous le nom d'agents internes) reste compatible si elle est appliquée avec soin : les agents « parallèles » de PAUL IA décrivent l'organisation du travail de la plateforme, sans attribuer le contenu à une autre marque ni masquer l'usage dans les mentions légales du produit ; la recommandation d'audit est de documenter l'usage de services tiers dans les conditions d'utilisation de PAUL IA elles-mêmes, et de ne jamais affirmer au client qu'un contenu a été produit « uniquement » par PAUL IA en cas de demande formelle. Deuxième restriction : il est interdit d'utiliser les modèles, prompts ou contenus générés pour entraîner, affiner ou améliorer un modèle externe ou concurrent — les moteurs internes de PAUL IA ne doivent donc jamais absorber les sorties de Z AI à des fins d'entraînement. Troisième restriction : les secteurs réglementés (santé, finance, assurance, juridique, emploi) ne peuvent pas s'appuyer sur l'API pour des activités de prise de décision."},
    {'t': 'bullet', 'items': [
        "Prépaiement consommé à l'usage, non remboursable ; service suspendu si solde insuffisant — d'où un plafond de dépense interne.",
        "Clé secrète sous responsabilité du titulaire : toute fuite engage les frais résultants — stockage en variables d'environnement chiffrées uniquement.",
        "Interdiction d'extraire paramètres ou code du service, et d'entraîner des modèles concurrents avec ses sorties.",
        "Réexportation vers des juridictions restreintes interdite ; identification de l'IA à préserver sur les contenus.",
    ]},

    # ──────────────────── 8. MODÈLES VIDÉO ET GPU ────────────────────────
    {'t': 'h1', 'x': '8. Modèles vidéo spécialisés et architecture de calcul'},
    {'t': 'body', 'x': "Le cahier des charges exige de vraies vidéos animées — un oiseau qui bat des ailes et se déplace — et non un diaporama présenté comme une vidéo. Deux voies techniques existent, et l'audit les éclaire toutes les deux. La voie « service managé » : CogVideoX-3 chez Z AI (0,20 $ par vidéo) couvre texte-vers-vidéo, image-vers-vidéo et transitions image de départ vers image de fin, jusqu'en 4K à 30 ou 60 images par seconde avec audio optionnel ; c'est le chemin le plus court pour obtenir des mouvements réels dès l'activation d'un paquet vidéo sur le compte. La voie « modèle ouvert auto-hébergé » : Wan 2.2 (licence Apache 2.0, texte-vers-vidéo et image-vers-vidéo en 720p) est aujourd'hui le choix le plus sûr côté licence, avec des besoins mémoire qui vont d'environ 8 Go de mémoire vidéo pour la variante 5B compressée avec déchargement à 14 à 48 Go pour les variantes complètes selon les sources spécialisées ; HunyuanVideo et les dérivés de CogVideoX en poids ouverts demandent davantage de mémoire et, pour certains, un enregistrement préalable à tout usage commercial."},
    {'t': 'table',
     'cap': 'Tableau 6 — Panorama des modèles vidéo (voies API et auto-hébergement)',
     'w': [0.22, 0.20, 0.24, 0.14, 0.20],
     'head': ['Modèle / voie', 'Licence et coût', 'Besoins de calcul', 'T2V / I2V', 'Avis d\'audit'],
     'rows': [
        ['CogVideoX-3 (API Z AI)', 'Propriétaire — 0,20 $ / vidéo', 'Aucun (service managé)', 'Oui / Oui', 'Qualité réelle attendue ; à activer par un paquet vidéo sur le compte.'],
        ['Wan 2.2 (auto-hébergé)', 'Apache 2.0 — gratuit', 'Environ 8 Go VRAM (5B compressé) à 14-48 Go (complet)', 'Oui / Oui', 'Meilleure licence ouverte ; exige un serveur GPU dédié.'],
        ['HunyuanVideo (auto-hébergé)', 'Licence communautaire', '40 Go de VRAM et plus', 'Oui / Oui', 'Qualité élevée mais coûteux à héberger ; hors portée immédiate.'],
        ['Moteur interne actuel', 'Code propre PAUL IA — gratuit', 'CPU seul (ffmpeg embarqué)', 'Partiel (image vers vidéo)', 'Rendu cinématique réel ; ne génère pas de mouvement génératif.'],
     ]},
    {'t': 'body', 'x': "Recommandation d'architecture : ne pas surcharger Vercel, qui n'a ni GPU ni fenêtres de traitement longues. La cible proposée est un répartiteur à trois niveaux : niveau 1, l'API managée CogVideoX-3 dès qu'un paquet vidéo sera crédité (coût prévisible de 0,20 $ par clip, qualité générative rénelle) ; niveau 2, un travailleur GPU indépendant hébergé sur un fournisseur de calcul à la demande (type RunPod ou Vast.ai, carte de classe RTX 4090 louée environ 0,30 à 0,90 dollar de l'heure selon l'offre) exécutant Wan 2.2 en licence ouverte, branché à la plateforme par une file d'attente ; niveau 3, le moteur interne CPU de PAUL IA (ffmpeg embarqué) qui reste la garantie de livrable en toutes circonstances. La file d'attente et l'état des tâches longues résident dans Supabase, communiquées à l'interface par flux d'événements en temps réel — Vercel orchestre, mais ne porte jamais l'encodage lourd."},

    # ──────────────────── 9. ARCHITECTURE PROPOSÉE ───────────────────────
    {'t': 'h1', 'x': '9. Architecture proposée de la plateforme (Phase 2)'},
    {'t': 'body', 'x': "L'architecture s'organise en sept modules indépendants qui prolongent l'application existante sans la reconstruire. PAUL IA CORE conserve l'orchestration et la compréhension des demandes ; PAUL IA IMAGE regroupe la génération et la gestion des images (cascade Z AI, modèle ouvert public, moteur graphique procédural interne) ; PAUL IA VIDEO gère les deux modes du cahier des charges (images vers vidéo et texte vers vidéo) avec le répartiteur à trois niveaux du chapitre 8 ; PAUL IA VISION ajoute l'analyse d'images et de documents ; PAUL IA ENGINE couvre la programmation, l'exécution restreinte et les fichiers ; PAUL IA AGENTS coordonne les agents parallèles ; PAUL IA MONITOR assure le suivi, les événements et les comptes rendus."},
    {'t': 'body', 'x': "Le système d'agents parallèles repose sur un orchestrateur qui décompose la demande, attribue les sous-tâches à des agents spécialisés (analyse, programmation, vérification, média), exécute en parallèle ce qui est parallélisable, puis compare, vérifie et consolide en un résultat unique. L'identité visible reste PAUL IA : l'espace client ne voit que « Agent parallèle 1 », « Agent spécialisé en analyse » ou « Agent de vérification », conformément au cahier des charges, tandis qu'un espace administrateur protégé par permissions expose les détails réels — fournisseurs, modèles, API appelées, coûts, temps d'exécution, erreurs, historique. Le suivi en temps réel s'appuie sur les tables d'événements de Supabase et son canal temps réel déjà présent dans l'infrastructure : le client voit le plan annoncé, les étapes réellement terminées, l'étape en cours, les erreurs et le pourcentage uniquement lorsqu'il est réellement calculable ; le compte rendu final est généré à partir du journal d'événements, ce qui garantit qu'aucune étape annoncée ne peut être déclarée terminée avant de l'être."},
    {'t': 'bullet', 'items': [
        "Tâches longues : table de tâches dans Supabase, états (en attente, en cours, terminé, échec, intervention nécessaire), reprise après interruption.",
        "File d'attente des opérations lourdes : travailleurs séparés (GPU vidéo, encodages) consommant la file, jamais le processus Vercel.",
        "Événements temps réel : publication de chaque changement d'étape vers l'interface via Supabase Realtime.",
        "Séparation client / administrateur : réponses client filtrées par couche de présentation ; détails techniques réservés au rôle administrateur.",
        "Protection du patrimoine existant : aucune migration destructrice, sauvegarde avant chaque étape, CELTIIS BASSILA strictement hors de portée.",
    ]},

    # ──────────────────── 10. COÛTS ET PLAN ──────────────────────────────
    {'t': 'h1', 'x': '10. Coûts estimés et plan d\'intégration'},
    {'t': 'body', 'x': "Les coûts sont estimés sur des volumes réalistes de démarrage, uniquement à partir des tarifs documentés et des prix publics des fournisseurs de calcul — aucun chiffre n'est inventé. Pour les images, la voie gratuite actuelle par kit (sana) couvre les usages modérés sans coût identifié, avec l'inconnue de quota déjà signalée ; la voie documentée CogView-4 coûte environ 10 dollars pour mille images, GLM-Image environ 15 dollars. Pour la vidéo, mille clips par CogVideoX-3 représenteraient 200 dollars — un volume élevé en pratique sera plutôt réparti entre le paquet vidéo du compte et le travailleur GPU auto-hébergé, dont le coût horaire de 0,30 à 0,90 dollar rend une clip de quelques secondes compétitif dès quelques dizaines de générations par jour. Les modèles de texte Flash gratuits couvrent l'orchestration sans coût, avec repli sur le cerveau interne en cas d'indisponibilité."},
    {'t': 'table',
     'cap': 'Tableau 7 — Coûts estimés par volume mensuel (tarifs documentés)',
     'w': [0.34, 0.22, 0.22, 0.22],
     'head': ['Usage mensuel', 'Voie API Z AI', 'Voie GPU auto-hébergé', 'Voie interne gratuite'],
     'rows': [
        ['500 images', 'Environ 5 $ (CogView-4)', 'Sans objet', '0 $ (modèle sana / procédural, quota à confirmer)'],
        ['1 000 images', 'Environ 10 $', 'Sans objet', '0 $ (idem)'],
        ['50 vidéos courtes', 'Environ 10 $', 'Environ 3 à 9 $ de location horaire', '0 $ (rendu cinématique interne)'],
        ['200 vidéos courtes', 'Environ 40 $', 'Environ 12 à 36 $', '0 $ (idem)'],
     ]},
    {'t': 'table',
     'cap': 'Tableau 8 — Plan d\'intégration proposé (Phases 3 à 5)',
     'w': [0.16, 0.44, 0.40],
     'head': ['Étape', 'Livrable', 'Critère de validation'],
     'rows': [
        ['3.1', 'Modules image et vision unifiés (cascade à trois moteurs) + bibliothèque par projet', 'Image générée, stockée, téléchargeable, transmise au moteur vidéo sans intervention.'],
        ['3.2', 'Répartiteur vidéo à trois niveaux + file d\'attente Supabase + tâches longues', 'Vidéo texte-vers-vidéo livrée en MP4 ; état de la tâche visible en temps réel.'],
        ['3.3', 'Agents parallèles + identité unique + espace administrateur protégé', 'Tâche répartie sur deux agents en parallèle ; détails techniques visibles seulement côté admin.'],
        ['3.4', 'Suivi temps réel + compte rendu final automatique', 'Étapes affichées correspondent au journal réel ; compte rendu exact à chaque fin de tâche.'],
        ['4', 'Campagne de tests (image, vidéo, agents, suivi, indisponibilités)', 'Scénario de l\'oiseau volant validé visuellement ; refus simulés couverts par les replis.'],
        ['5', 'Bilan final avec preuves et coûts réels', 'Aucune fonctionnalité déclarée terminée sans vérification exécutée.'],
     ]},
    {'t': 'body', 'x': "Décisions attendues avant d'entamer la Phase 3 : premièrement, relever dans la console du compte le solde, les quotas et les limites de débit réels — c'est la seule donnée encore manquante de cet audit ; deuxièmement, choisir l'activation d'un paquet vidéo (voie CogVideoX-3 à 0,20 dollar par clip) ou l'investissement dans un travailleur GPU auto-hébergé sous Wan 2.2, ou la combinaison progressive des deux ; troisièmement, valider la règle de présentation client proposée au chapitre 7 pour la conformité des mentions légales. Une ces décisions prises, la construction peut démarrer dans l'ordre du plan du tableau 8, chaque étape étant livrée avec ses tests réels et son compte rendu."},
]

META = {
    'title': "Audit de l'API Z AI — Rapport technique Phase 1",
    'author': 'Plateforme PAUL IA',
    'subject': "Capacités réelles de génération d'images et de vidéos de l'API Z AI, preuves de tests en production, classification des coûts et architecture proposée",
}

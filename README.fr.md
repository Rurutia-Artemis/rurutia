<div align="center">

<img src="public/logo.png" alt="Rurutia" width="120" />

# Rurutia

**Le cockpit de votre Coding Agent — une version personnelle améliorée de [FanBox](https://github.com/alchaincyf/fanbox)**

Pilotez Claude Code / Codex en local, voyez clairement chaque fichier qu'il touche et chaque ligne qu'il modifie, et reprenez la main à tout moment.<br>
Par-dessus, Rurutia a refait le visuel et les polices, ajouté **18 skins de couleurs**, une **invite de terminal avec Starship intégré** et une **barre d'outils à icônes de marque dans le terminal**, et peaufiné les entrées de la barre latérale, le panneau d'usage et les détails d'interaction pour les rendre plus agréables à utiliser.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/macOS-Apple%20Silicon-black?logo=apple)](#installation)
[![Signed](https://img.shields.io/badge/Signé-Developer%20ID%20%2B%20Notarisé-success?logo=apple)](#installation)
[![Version](https://img.shields.io/badge/Version-v2.7.2-ff3d8b)](../../releases)
[![Upstream](https://img.shields.io/badge/Upstream-FanBox%20v2.3.1-blueviolet)](https://github.com/alchaincyf/fanbox)

[简体中文](README.md) · [繁體中文](README.zh-TW.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **Français** · [Español](README.es.md)

</div>

---

<p align="center">
  <img src="docs/screenshots/overview.png" alt="Interface principale de Rurutia : barre latérale à gauche · grille de fichiers au centre · terminal intégré à droite, deux skins clair et sombre côte à côte" width="100%">
</p>
<p align="center"><sub>▲ Vue d'ensemble de l'interface principale — la même interface, « Lumière Pixel » sombre à gauche, « Gelée Numérique » clair à droite. La grille de fichiers porte des badges de projet aux couleurs vives, la barre latérale rassemble les projets Agent et l'usage officiel.</sub></p>

---

## Sommaire

- [Qu'est-ce que c'est](#quest-ce-que-cest)
- [Comprendre en 30 secondes](#comprendre-en-30-secondes)
- [Ce que fait le FanBox original (fonctionnalités complètes)](#ce-que-fait-le-fanbox-original-fonctionnalités-complètes)
- [Ce que Rurutia a transformé](#ce-que-rurutia-a-transformé) : 18 skins · invite de terminal · icônes de marque + onglets arc-en-ciel · barre latérale
- [Installation](#installation)
- [Compiler depuis les sources](#compiler-depuis-les-sources)
- [Comment les modifications sont organisées (style patch)](#comment-les-modifications-sont-organisées-style-patch)
- [Confidentialité et sécurité](#confidentialité-et-sécurité)
- [Architecture technique](#architecture-technique)
- [Remerciements & licence](#remerciements--licence)

---

## Qu'est-ce que c'est

[**FanBox**](https://github.com/alchaincyf/fanbox) (auteur : [Huashu](https://github.com/alchaincyf)) est un « **cockpit de Coding Agent** » qui s'exécute en local : d'un côté vous parcourez / prévisualisez / éditez vos fichiers locaux, de l'autre vous faites tourner Claude Code, Codex ou n'importe quel coding agent dans un vrai terminal intégré, et chaque fichier que l'agent modifie est mis en surbrillance en temps réel — **retrouver les fichiers → lancer l'agent → voir clairement les changements**, le tout dans une seule fenêtre. Backend sans dépendance, les données ne quittent pas la machine.

> *« L'IA vous fait démarrer dix projets en un après-midi, et ensuite vous ne les retrouvez plus jamais. FanBox vous aide à les retrouver. »*

**Rurutia** est ma **personnalisation** réalisée sur la base de FanBox v2.3.1 (`c93a486`) : les capacités de base proviennent à 100 % de FanBox, j'ai refait le visuel / les polices / les couleurs, ajouté tout un système de skins et d'invites de terminal, et peaufiné des dizaines de petits détails du quotidien. Voici d'abord **les fonctionnalités complètes du projet d'origine**, puis **ce que j'ai concrètement modifié**.

---

## Comprendre en 30 secondes

| Ce que vous voulez faire | Dans Rurutia |
|---|---|
| Retrouver les dix projets lancés en vrac en un après-midi | Recherche floue globale `⌘K` · les dossiers portent des badges node/web/py/rs/go pour reconnaître le type d'un coup d'œil |
| Faire travailler l'agent tout en voyant ce qu'il modifie | Un vrai terminal intégré fait tourner Claude Code / Codex ; le fichier qu'il écrit, sa carte s'illumine aussitôt et l'aperçu suit en temps réel |
| Reprendre la session d'hier | Ouvrez un projet pour voir l'historique des sessions, « ▶ Reprendre » relance en un clic `claude --resume` / `codex resume` et récupère le contexte |
| Surveiller l'usage officiel sans dépasser le quota | La barre latérale affiche en permanence la fenêtre de 5 h + le quota hebdomadaire de Claude / Codex, avec barre rouge + notification bureau à l'approche de la limite |
| Habiller toute l'interface selon l'humeur | 18 skins de couleurs + 16 thèmes d'invite de terminal, l'UI / le terminal / la coloration du code changent ensemble |

---

## Ce que fait le FanBox original (fonctionnalités complètes)

> Cette partie correspond aux capacités propres de FanBox, intégralement conservées par Rurutia. La description originale en anglais se trouve dans [`README.fanbox.md`](README.fanbox.md).

### 🗂 Fichiers · retrouver et prévisualiser
- **Recherche floue globale ⌘K** : il suffit de se souvenir d'un fragment du nom ; `⌘↵` ouvre tout le projet dans l'éditeur ; `内容:关键词` bascule en recherche plein texte.
- **Icônes pleines aux couleurs vives** : chaque type de fichier « ressemble à lui-même » — PDF en rouge, JS en jaune, Markdown en bleu ; photos et vidéos affichées à leurs proportions réelles.
- **Aperçu sur place** : rendu Markdown, HTML en résultat live, coloration syntaxique du code, intégration des images / vidéos / PDF (HEIC compris), liste du contenu des archives, fond en damier sous les images transparentes.
- **Vignettes accélérées** : défilement et clics restent sous 0,1 seconde même dans les gros dossiers.
- **Badges de projet** : les cartes de dossier affichent node / web / py / rs / go pour reconnaître d'un coup d'œil le type des dix projets lancés en un après-midi.

### 👀 Voir ce que l'agent modifie
- **Tableau de bord vivant** : à chaque fichier que l'agent écrit, la carte fait aussitôt onduler des cercles et respire en s'illuminant selon la fréquence des modifications ; la lumière suit l'agent là où il écrit.
- **Mode suivi** : en un clic, la vue des fichiers + l'aperçu suivent le fichier que l'agent est en train d'éditer — le code clignote en surbrillance au fil des nouvelles lignes, le HTML se rend en temps réel pendant l'écriture (double tampon, zéro flash blanc), le Markdown se rend en direct. Toute navigation manuelle vous rend immédiatement le contrôle.
- **Relecture de session** : faites glisser la timeline comme une vidéo pour revoir, étape par étape, les fichiers que l'agent a modifiés durant cette période.
- **Boîte de réception des changements** : rassemble, à travers plusieurs projets, tous les fichiers modifiés durant la session.
- **Diff des changements Git** : le DiffEditor en lecture seule de Monaco affiche côte à côte HEAD vs l'espace de travail actuel.

### 🤖 Cockpit de l'agent
- **Mémoire de projet** : ouvrez n'importe quel dossier de projet pour voir ce que l'IA y a fait — historique des sessions (votre première phrase sert de titre), fichiers modifiés à chaque session, skills déclenchés ; « ▶ Reprendre » relance en un clic `claude --resume` / `codex resume` dans le terminal intégré et récupère le contexte.
- **Voie express captures d'écran** : dès qu'une capture système est enregistrée, une carte express apparaît — la donner à l'agent du terminal, la ranger dans le `素材/` (médias) du projet, ou l'annoter avant de l'envoyer.
- **Rangement par IA** : l'IA ne regarde que les métadonnées pour proposer un plan de rangement (sans lire le contenu, sans toucher au système de fichiers) ; après validation humaine ligne par ligne, exécution + journal de rollback, annulation globale en un clic.
- **Assistant de publication** : pour les projets node, enchaîne en un clic le numéro de version, le CHANGELOG, le packaging, le push et la GitHub Release.
- **Rayon X des Skills** : tous les skills d'agent de la machine dans une seule vue — statistiques de déclenchement, bilan de santé, budget de context, interrupteurs marche/arrêt qui ne suppriment aucun fichier.
- **Usage de l'agent** : fenêtre officielle de 5 h / quota hebdomadaire de Claude Code (même source que `/usage`) + statistiques de tokens locales ; instantané des limites de Codex.
- **Rayon X de l'occupation disque** : palmarès en barres de l'occupation réelle au sens de `du`, avec exploration en profondeur.

### 🖥 Terminal · piloter l'agent
- **Vrai terminal intégré** : node-pty + xterm.js (rendu WebGL), fait tourner Claude Code / vim / htop sans artefacts d'affichage, les caractères larges chinois s'affichent correctement.
- **Glisser des fichiers dans le terminal** : faites glisser un fichier / dossier de la liste vers le terminal, le chemin s'insère automatiquement pour servir de contexte à l'agent.
- **Chemins cliquables** : les chemins de fichiers qui apparaissent dans le terminal s'ouvrent d'un clic (les noms de capture avec espaces, les noms chinois et les longs chemins coupés sur plusieurs lignes sont reconnus).
- **Sélectionner pour envoyer au terminal** : sélectionnez un passage dans l'aperçu, envoyez-le en un clic au terminal au format « source du fichier + bloc clôturé ».
- **Conscience de la situation** : la pastille de l'onglet indique l'agent en cours / au repos / terminé ; quand c'est à votre tour, le bord du terminal pulse pour vous alerter, et une notification système est envoyée à la fin des tâches longues.

### ✍️ Édition · WYSIWYG
- **Markdown** : Milkdown Crepe offre un WYSIWYG à la Notion, sauvegarde automatique 0,8 seconde après l'arrêt de la frappe.
- **Code / JSON** : éditeur Monaco (le même moteur que VS Code).
- **Annotation d'images** : pinceau / flèches / texte / floutage, conversion de format, compression, ajustement de la résolution.
- **Garde anti-perte** : les trois éditeurs interceptent uniformément les sorties sans sauvegarde.

---

## Ce que Rurutia a transformé

> Les capacités de base proviennent entièrement de FanBox ; voici les parties que j'ai ajoutées / refaites. L'ensemble tourne autour de quatre objectifs : **être beau**, **être lisible**, **avoir un bon terminal**, **déranger le moins possible**.

### 🎨 18 skins de couleurs (système multi-accent)

Cliquez sur « Skins » dans la barre latérale pour faire surgir une grille de pastilles de couleurs et changer de skin ; le skin par défaut est « Lumière Pixel ». Chaque skin est « **un fond neutre + 3 couleurs d'accent juxtaposées** (principale : boutons / état actif · secondaire : titres de section et liens · vive : badges) + un jeu de couleurs d'état sémantiques » — des couleurs plus vives, qui restent harmonieuses grâce à cette répartition des rôles. Le texte courant / les couleurs d'accent / le texte des badges / les 16 couleurs ANSI du terminal **passent tous la validation de contraste WCAG** ; chaque skin s'adapte automatiquement à l'interface principale, à la barre latérale, aux couleurs du terminal et à la coloration du code, et même le fond de l'éditeur Monaco suit la même température de couleur.

Inspiré de la collection de palettes haut de gamme du compte public « 色所 » : Néo-Memphis / Mode Acide / Gelée Numérique / Circuit Imprimé / Le Vide / Orange Lave / Cœur Abyssal… 9 clairs et 9 sombres, soit 18 skins au total.

<p align="center">
  <img src="docs/screenshots/skins.png" alt="Vue d'ensemble des 18 skins de couleurs : 9 clairs et 9 sombres, chacun s'adapte automatiquement à l'UI / au terminal / à la coloration du code" width="100%">
</p>
<p align="center"><sub>▲ Vue d'ensemble des 18 skins (9 clairs, 9 sombres). Un seul changement, et l'interface principale / la barre latérale / les couleurs du terminal / la coloration du code basculent ensemble.</sub></p>

L'UI dans son ensemble a aussi été modernisée : bordures fines comme un cheveu, rythme uniforme des coins arrondis, contrôles segmentés flottants en forme de capsule, halo de couleur d'accent, état sélectionné de la barre latérale, transitions animées sobres — le tout suit la couleur d'accent du skin actuel. L'interface, les noms de fichiers, le code et le terminal utilisent tous **Maple Mono CN** (avec l'ensemble des caractères chinois + kana japonais, woff2 intégré, utilisable hors ligne).

### 🚀 Invite de terminal (Starship intégré · 16 thèmes)

**Invite powerline prête à l'emploi** : starship signé et notarisé + police d'icônes Nerd Font intégrés ; à peine installé, ouvrez un terminal et c'est déjà des pastilles powerline (répertoire / état git / version du langage / ♥ heure), **sans installer starship vous-même, sans configurer `~/.zshrc`**.

Injection via ZDOTDIR : on source d'abord votre vrai dotfile (PATH / alias au poil près, `claude` / `codex` restent trouvables), puis on superpose starship — **actif uniquement dans le terminal de cette App, ne touche à aucun dotfile, zéro résidu à la désinstallation**. macOS + zsh uniquement.

<p align="center">
  <img src="docs/screenshots/prompt.png" alt="Sélecteur d'invite de terminal : 16 thèmes complets (avec mini-aperçu powerline) + 5 modificateurs superposables" width="100%">
</p>
<p align="center"><sub>▲ Sélecteur « Invite » de la barre latérale : choisissez un thème complet, sélectionnez plusieurs modificateurs superposés ; le changement est instantané, un terminal déjà en cours change d'apparence dès qu'on appuie sur Entrée.</sub></p>

- **16 thèmes d'invite (indépendants des skins)** : Pastille · Moka / Pastel / Nuit de Tokyo / Gruvbox Arc-en-ciel / Nord Polaire / Dracula / Rosé Pine / Everforest / Kanagawa / Latte Clair / Couleurs Plates / Cockpit Jetpack / Pure Épuré / Ligne Unique Minimaliste / Deux Lignes / Texte Brut.
- **5 modificateurs superposables (multi-sélection possible en parallèle)** : masquer la version du langage / symboles en texte brut · sans icônes / désactiver l'heure / désactiver la durée des commandes / supprimer la ligne vide en tête.
- **Couleurs de terminal propres à chaque skin** : fond du terminal / curseur / sélection + 16 couleurs ANSI, tout est dérivé du skin ; le texte coloré des skins clairs est ramené à un contraste ≥ 3,5 pour ne plus se fondre dans le fond clair.

### 🖥 Terminal · icônes de marque + onglets arc-en-ciel

<p align="center">
  <img src="docs/screenshots/terminal.png" alt="Terminal : onglets de projet arc-en-ciel + barre d'outils à icônes de marque Claude/OpenAI/Codex/WeChat + invite powerline" width="100%">
</p>
<p align="center"><sub>▲ Terminal intégré : les onglets sont colorés par projet selon l'angle d'or (arc-en-ciel), une rangée d'icônes de marque officielles en haut permet de lancer directement Claude / Codex / WeChat, et l'invite est la powerline starship intégrée.</sub></p>

- **Barre d'outils à icônes de marque** : les points de lancement comme Claude Code / Codex / WeChat sont remplacés par des **icônes vectorielles de marque officielles**, une rangée bien claire en haut ; les autres boutons d'action (suivi de l'aperçu / nouvel onglet / plein écran / basculer le dock / couper le son…) sont tous redessinés en icônes vectorielles monochromes qui suivent la couleur du thème.
- **Onglets arc-en-ciel** : chaque onglet de terminal prend sa couleur par projet selon l'angle d'or ; quand plusieurs projets sont côte à côte, ils se décalent automatiquement en arc-en-ciel, pour distinguer d'un coup d'œil quel terminal correspond à quel projet ; les onglets sont plus hauts, leur largeur s'adapte au nom de fichier, et ils se réorganisent par glisser-déposer élastique (dès qu'on dépasse un onglet voisin, il cède la place en temps réel).
- **Bouton « Terminal ordinaire »** : à côté de Claude Code / Codex, ouvrez en un clic un shell propre (sans agent) dans le dossier actuel.
- **Carte de terminal à coins arrondis indépendante** : barre de navigation supérieure au bord supérieur arrondi, fond qui suit la couleur de base du skin actuel et s'intègre à l'ensemble (sous les skins sombres, plus de bloc noir pur qui détonne) ; sous les skins clairs, l'onglet actif passe à une teinte légère et la barre de couleur inférieure superflue est supprimée.

### 🗂 Barre latérale · entrées et projets Agent ajoutables/supprimables

<p align="center">
  <img src="docs/screenshots/sidebar.png" alt="Barre latérale : entrées rapides / favoris / projets Agent, ajoutables, supprimables et réordonnables par glisser-déposer + panneau d'usage officiel" width="34%">
</p>
<p align="center"><sub>▲ Barre latérale : entrées rapides / favoris / projets Agent, ajoutables, supprimables et réordonnables par glisser-déposer ; en bas, le panneau d'usage Agent affiche en permanence les limites officielles.</sub></p>

- **Entrées rapides ajoutables/supprimables** : ➕ pour ajouter le dossier actuel, ✕ au survol pour le retirer (même les éléments par défaut sont supprimables), persistance côté serveur.
- **Projets Agent ajoutables/supprimables** : ajout manuel épinglé en haut, masquage de ceux qu'on ne veut plus voir (une fois masqués, ils ne ressurgissent plus lors des scans) ; on peut aussi les glisser depuis la liste vers « Favoris / Entrées rapides », ou les déplacer de haut en bas dans la liste pour un tri personnalisé (ordre persistant).
- **Panneau d'usage amélioré** : les limites officielles de Claude Code (fenêtre de 5 h / quota hebdomadaire) sont **toujours affichées** — si la donnée est récupérée, une barre de progression s'affiche ; sinon, la raison est indiquée (non abonné / non connecté, réseau restreint, aucune donnée de fenêtre) + nouvelle tentative ; à l'approche de la limite (≥ 85 %), **barre d'avertissement rouge + notification bureau** (limitées pour ne pas déranger), avec rafraîchissement automatique à l'ouverture du panneau. L'API des limites officielles a une limitation de débit stricte ; passage à un cache de 10 minutes + réutilisation des dernières données en cas de throttling, pour ne plus afficher « aucune donnée » au moindre throttle occasionnel.

### Autres finitions

- **Cliquer sur le ✕ rouge = masquer la fenêtre (macOS)** : la fenêtre n'est plus détruite et le terminal n'est plus tué ; un clic sur le Dock la rappelle telle quelle (terminal / état préservés), seul ⌘Q quitte réellement.
- **Toute la bande vide en haut de la fenêtre est déplaçable** : plus besoin de viser le seul coin de la zone de marque ; les feux de circulation en haut à gauche disposent d'un dégagement suffisant et ne chevauchent plus le logo.
- **Barres de défilement refaites** : fines et arrondies, suivant la couleur d'accent ; les extrémités de la piste sont rentrées pour éviter les coins arrondis des cartes, sans plus déborder.
- **Curseur personnalisé sur les onglets** : la zone des onglets de terminal utilise un petit curseur fléché qui suit la couleur d'accent du skin.
- **Décalage automatique de port** : quand le port 4567 par défaut est occupé, bascule automatique sur la prochaine paire de ports libres, plus de conflit entre plusieurs instances.
- **Icône d'application personnalisée + logo de la barre latérale**, application renommée Rurutia.

---

## Installation

**macOS (Apple Silicon / arm64)**

1. Téléchargez le dernier `Rurutia-*.dmg` depuis les [**Releases**](../../releases).
2. Ouvrez le dmg et glissez **Rurutia** dans « Applications ».
3. Double-cliquez pour ouvrir et c'est prêt.

> ✅ Cette version est **signée avec un certificat Apple Developer ID + notarisée par Apple (notarization) + hardened runtime** — une fois téléchargée depuis les Releases, **double-cliquez pour l'installer et l'utiliser directement**, sans le message « développeur impossible à vérifier » ni aucune manipulation supplémentaire.

---

## Compiler depuis les sources

```bash
npm install
npm run rebuild        # recompile node-pty pour l'ABI d'Electron

# Build local non signé (le plus simple, pour un usage perso) :
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --dir -c.mac.identity=null
# Produit : dist/mac-arm64/Rurutia.app
```

---

## Comment les modifications sont organisées (style patch)

Pour pouvoir suivre les mises à jour continues de FanBox en amont, les modifications sont autant que possible **additives**, afin de pouvoir les réappliquer par `git rebase` après chaque nouvelle version :

- **Fichiers ajoutés** (sans conflit) : `public/ui-patch.css` + `public/soft-patch.css` (toute l'UI / les polices), `public/themes-patch.js` (18 skins), `public/prompt-patch.js` (sélecteur d'invite de terminal), `public/vendor/fonts/maple/*`, `public/vendor/icons/`, `vendor/starship/*`, `public/logo.png`, `public/favicon.png`.
- **Fichiers en amont édités** (peu nombreux, à surveiller) : `public/index.html`, `public/app.js`, `server.js`, `electron/main.js`, `package.json` + `build/icon*`.

La liste complète des modifications + les étapes pour « réappliquer après une nouvelle version en amont » se trouvent dans [`RURUTIA-PATCH.md`](RURUTIA-PATCH.md).

---

## Confidentialité et sécurité

> Comme FanBox en amont, Rurutia ne change rien à son modèle de sécurité.

- Le backend n'écoute que sur l'adresse de bouclage locale + vérifie l'en-tête Host (bloque le DNS rebinding), **les données ne quittent pas la machine**.
- Toutes les ressources frontend (y compris le moteur de rendu, les polices, le binaire starship) sont intégrées localement, **pleinement utilisables hors ligne**. Les seules requêtes sortantes : les API d'usage Claude / Codex (optionnelles) et la vérification des mises à jour GitHub.
- L'aperçu HTML est rendu dans une iframe sandbox à origine isolée, sans accès aux capacités du terminal.
- L'invite de terminal passe par une injection ZDOTDIR, **n'écrit ni ne modifie aucun de vos dotfiles**, zéro résidu à la désinstallation.
- La configuration utilise une écriture atomique (temp + fsync + rename), sans perte de données ; les suppressions passent par la corbeille système (récupérables).

---

## Architecture technique

| Couche | Avec quoi |
|---|---|
| Backend | Node.js `server.js` sans dépendance (API de fichiers + service statique + vignettes) |
| Coque desktop | Electron 33 + node-pty (modules natifs asarUnpack) |
| Terminal | xterm.js + WebGL + unicode11 |
| Invite | starship intégré (signé et notarisé) + Nerd Font, injection au runtime via ZDOTDIR |
| Éditeur | Monaco (code) + Milkdown Crepe (Markdown) |
| Police | Maple Mono CN (woff2 intégré) |
| Packaging | electron-builder → `.dmg` arm64 signé + notarisé |

---

## Remerciements & licence

- L'application principale **FanBox** est développée par **[Huashu](https://github.com/alchaincyf)** ([alchaincyf/fanbox](https://github.com/alchaincyf/fanbox)), sous licence MIT. Rurutia en est une branche personnelle améliorée, sous la même [licence MIT](LICENSE). Les capacités de FanBox reposent elles-mêmes sur une foule d'excellents projets open source comme Electron / node-pty / xterm.js / Monaco / Milkdown (liste complète dans [`README.fanbox.md`](README.fanbox.md)).
- La police **Maple Mono** provient de [subframe7536/maple-font](https://github.com/subframe7536/maple-font) (OFL).
- L'invite de terminal **Starship** provient de [starship/starship](https://github.com/starship/starship) (ISC).
- L'inspiration des palettes provient de la collection de couleurs haut de gamme du compte public « **色所** ».

<div align="center">
<br>

**Finder** vous aide à gérer vos fichiers. L'**IDE** vous aide à écrire du code. **Rurutia / FanBox** vous aide à voir clairement ce que l'IA a fait sur votre machine.

MIT License © Rurutia · basé sur le [FanBox de Huashu](https://github.com/alchaincyf/fanbox)

</div>

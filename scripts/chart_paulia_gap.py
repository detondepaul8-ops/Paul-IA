#!/usr/bin/env python3
"""Graphique d'écart fonctionnel de PAUL IA (audit 2026-11-23).
Couleurs Morandi, police Noto Sans SC (gère le français)."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.font_manager as fm

fm.fontManager.addfont('/usr/share/fonts/truetype/chinese/NotoSansSC-Regular.ttf')
fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
import matplotlib.pyplot as plt
plt.rcParams['font.sans-serif'] = ['Noto Sans SC', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# (capacité, état) — état après intégration du 23/11/2026 (vague 1 vérifiée en production)
caps = [
    ("Conversation IA (GLM, 7 modules)", "Opérationnel"),
    ("Génération d'images (CogView / Pollinations)", "Opérationnel"),
    ("Stockage média (Supabase Storage / base)", "Opérationnel"),
    ("Recherche Internet (3 canaux + sources)", "Opérationnel"),
    ("Documents Excel / PDF générés réellement", "Opérationnel"),
    ("Reconnaissance vocale (STT, 4 canaux)", "Opérationnel"),
    ("Conversation vocale directe (orbe, barge-in)", "Opérationnel"),
    ("Analyse d'images transmises (vision)", "Opérationnel"),
    ("Génération vidéo (tâche asynchrone)", "Partiel"),
    ("Synthèse vocale TTS (z.ai / fallback)", "Partiel"),
    ("Authentification / comptes utilisateurs", "Absent"),
    ("Analyse de documents (PDF/DOCX/XLSX reçus)", "Absent"),
    ("Exécution d'agent / création d'applications", "Absent"),
]
colors = {"Opérationnel": "#7BA68A", "Partiel": "#C8B87C", "Absent": "#B87472"}

fig, ax = plt.subplots(figsize=(10, 6.2), constrained_layout=True)
names = [c[0] for c in caps][::-1]
states = [c[1] for c in caps][::-1]
bars = ax.barh(names, [1] * len(names), color=[colors[s] for s in states], height=0.62)
ax.set_xlim(0, 1.02)
ax.set_xticks([])
for spine in ["top", "right", "bottom"]:
    ax.spines[spine].set_visible(False)
ax.tick_params(axis="y", labelsize=10.5)
for i, s in enumerate(states):
    ax.text(1.01, i, s, va="center", ha="right", fontsize=9.5,
            color="#333333", transform=ax.get_yaxis_transform())
handles = [plt.Rectangle((0, 0), 1, 1, color=colors[k]) for k in colors]
ax.legend(handles, list(colors.keys()), loc="upper center", bbox_to_anchor=(0.5, 1.09),
          ncol=3, frameon=False, fontsize=10.5)
ax.set_title("État vérifié des 12 capacités cibles de PAUL IA (audit du 23/11/2026)",
             fontsize=12.5, pad=34)
out = "/home/z/my-project/media/chart_ecart_paulia.png"
import os
os.makedirs("/home/z/my-project/media", exist_ok=True)
plt.savefig(out, dpi=200)
print("saved", out)

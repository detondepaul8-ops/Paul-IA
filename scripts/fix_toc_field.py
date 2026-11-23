#!/usr/bin/env python3
"""Répare la structure du champ TOC dans le docx livré :
déplace begin/instrText/separate dans le premier paragraphe d'entrée et
supprime le paragraphe de champ autonome (source du doublon « Résumé exécutif »).
Les 33 entrées simples restent le résultat du champ ; Word régénère à l'ouverture."""
import re, zipfile, shutil

path = "/home/z/my-project/download/Rapport_Audit_Moteur_IA_PAUL_IA.docx"
zin = zipfile.ZipFile(path, "r")
xml = zin.read("word/document.xml").decode("utf-8")

toc_begin = min(m.start() for m in re.finditer(r'<w:fldChar w:fldCharType="begin"[^/]*/>', xml))
pstart = max(xml.rfind("<w:p>", 0, toc_begin), xml.rfind("<w:p ", 0, toc_begin))
pend = xml.find("</w:p>", toc_begin) + len("</w:p>")
field_para = xml[pstart:pend]

# extraire les runs begin/instrText/separate (entre </w:pPr> et <w:hyperlink)
m = re.search(r"</w:pPr>(.*?)<w:hyperlink", field_para, re.S)
assert m, "runs de champ introuvables"
runs = m.group(1)
assert 'fldCharType="begin"' in runs and "TOC" in runs and 'fldCharType="separate"' in runs
assert "PAGEREF" not in runs

# paragraphe suivant (première entrée simple)
next_pstart = xml.find("<w:p", pend)
nppr_end = xml.find("</w:pPr>", next_pstart) + len("</w:pPr>")

xml2 = xml[:pstart] + xml[pend:]                     # supprimer le para de champ
insert_at = nppr_end - (pend - pstart)               # position après suppression
xml2 = xml2[:insert_at] + runs + xml2[insert_at:]

assert xml2.count("1. Résumé exécutif") == 2, "il doit rester 2 occurrences (entrée TOC + titre)"
print("runs déplacés, structure :", xml2.count('fldCharType="begin"'), "begin /",
      xml2.count('fldCharType="separate"'), "separate /", xml2.count('fldCharType="end"'), "end")

tmp = path + ".tmp"
zout = zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    data = zin.read(item.filename)
    if item.filename == "word/document.xml":
        data = xml2.encode("utf-8")
    zout.writestr(item, data)
zin.close()
zout.close()
shutil.move(tmp, path)
print("OK champ TOC réparé:", path)

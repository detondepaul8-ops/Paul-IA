#!/usr/bin/env python3
"""Supprime le paragraphe d'entrée TOC parasite situé avant le champ TOC
(inséré à mauvaise position par le script de placeholders)."""
import re, zipfile, shutil

path = "/home/z/my-project/download/Rapport_Audit_Moteur_IA_PAUL_IA.docx"
zin = zipfile.ZipFile(path, "r")
xml = zin.read("word/document.xml").decode("utf-8")

toc_begin = min(m.start() for m in re.finditer(r'<w:fldChar w:fldCharType="begin"[^/]*/>', xml))
occ = [m.start() for m in re.finditer("1. Résumé exécutif", xml)]
print("occurrences:", occ, "| field begin @", toc_begin)
before = [p for p in occ if p < toc_begin]
print("occurrences avant le champ:", before)
assert len(before) == 1, "structure inattendue — ne pas modifier aveuglément"

pos = before[0]
pstart = xml.rfind("<w:p>", 0, pos)
alt = xml.rfind("<w:p ", 0, pos)
pstart = max(pstart, alt)
pend = xml.find("</w:p>", pos) + len("</w:p>")
para = xml[pstart:pend]
print("paragraphe parasite:", repr("".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", para))))
print("contient PAGEREF/fldChar:", "fldChar" in para, "| hyperlink:", 'w:anchor="_Toc' in para)

xml2 = xml[:pstart] + xml[pend:]
print("paragraphes '1. Résumé exécutif' restants:", xml2.count("1. Résumé exécutif"))

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
print("OK parasite supprimé:", path)

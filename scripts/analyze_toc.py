#!/usr/bin/env python3
"""Analyse précise du champ TOC : liste chaque paragraphe du résultat
(entre le separate externe et le end externe) avec structure détaillée."""
import re, zipfile

xml = zipfile.ZipFile("/home/z/my-project/download/Rapport_Audit_Moteur_IA_PAUL_IA.docx").read("word/document.xml").decode("utf-8")

begins = [m.start() for m in re.finditer(r'<w:fldChar w:fldCharType="begin"[^/]*/>', xml)]
seps = [m.start() for m in re.finditer(r'<w:fldChar w:fldCharType="separate"/>', xml)]
ends = [m.start() for m in re.finditer(r'<w:fldChar w:fldCharType="end"/>', xml)]
print("begin:", begins[:4], "separate:", seps[:6], "end:", ends[:6])

toc_begin = begins[0]
# separate externe = premier separate après le begin
outer_sep = min([s for s in seps if s > toc_begin])
# end externe = dernier end avant le corps (chercher le dernier end avant 'Résumé exécutif' heading)
outer_end = max([e for e in ends if e > outer_sep and e < xml.find('Heading1')])
seg = xml[outer_sep:outer_end]
paras = re.findall(r'<w:p[ >].*?</w:p>', seg, re.S)
print("outer_sep@", outer_sep, "outer_end@", outer_end, "paragraphes:", len(paras))
for i, p in enumerate(paras):
    t = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p))
    hl = "HL" if 'w:anchor="_Toc' in p else "  "
    pr = "PR" if "PAGEREF" in p else "  "
    print(f"{i:02d} {hl} {pr} {t[:60]!r}")

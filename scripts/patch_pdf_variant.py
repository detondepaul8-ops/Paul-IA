#!/usr/bin/env python3
"""Variant PDF : neutralise le champ TOC (retire les runs begin/instrText/
separate/end du champ EXTERNE) en gardant les 33 entrées en texte statique.
LibreOffice rend alors la liste telle quelle, sans régénération ni doublon."""
import re, zipfile

src = "/home/z/my-project/download/Rapport_Audit_Moteur_IA_PAUL_IA.docx"
dst = "/tmp/render/rapport_pdf_variant.docx"

def run_span(xml, pos):
    """Bornes du <w:r> contenant la position pos."""
    start = xml.rfind("<w:r>", 0, pos)
    alt = xml.rfind("<w:r ", 0, pos)
    start = max(start, alt)
    end = xml.find("</w:r>", pos) + len("</w:r>")
    return start, end

zin = zipfile.ZipFile(src, "r")
zout = zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    data = zin.read(item.filename)
    if item.filename == "word/document.xml":
        xml = data.decode("utf-8")
        begins = [m.start() for m in re.finditer(r'<w:fldChar w:fldCharType="begin"[^/]*/>', xml)]
        seps = [m.start() for m in re.finditer(r'<w:fldChar w:fldCharType="separate"/>', xml)]
        ends = [m.start() for m in re.finditer(r'<w:fldChar w:fldCharType="end"/>', xml)]
        toc_begin = begins[0]
        outer_sep = min([s for s in seps if s > toc_begin])
        outer_end = max([e for e in ends if e < xml.find("Heading1")])
        # supprimer du run contenant begin jusqu'au run contenant separate externe
        s1, e1 = run_span(xml, toc_begin)
        s2, e2 = run_span(xml, outer_sep)
        xml = xml[:s1] + xml[e2:]
        # recalculer la position du end externe après la première suppression
        ends2 = [m.start() for m in re.finditer(r'<w:fldChar w:fldCharType="end"/>', xml)]
        # le end externe est le dernier avant le premier Heading1
        outer_end2 = max([e for e in ends2 if e < xml.find("Heading1")])
        s3, e3 = run_span(xml, outer_end2)
        xml = xml[:s3] + xml[e3:]
        # purger updateFields pour éviter toute régénération LO
        print("champ TOC neutralisé; runs fldChar restants:",
              len(re.findall(r'<w:fldChar', xml)))
        data = xml.encode("utf-8")
    elif item.filename == "word/settings.xml":
        xml = data.decode("utf-8")
        xml = xml.replace('<w:updateFields w:val="true"/>', "")
        data = xml.encode("utf-8")
    zout.writestr(item, data)
zin.close()
zout.close()
print("OK", dst)

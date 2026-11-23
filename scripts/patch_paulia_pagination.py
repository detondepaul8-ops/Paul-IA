#!/usr/bin/env python3
"""Post-traitement pagination WPS : patch instrText des pieds de page
(ROMAN / arabic) + suppression des pgNumType vides. Non-destructif."""
import re, sys, zipfile, shutil

path = "/home/z/my-project/download/Rapport_Audit_Moteur_IA_PAUL_IA.docx"
tmp = path + ".tmp"

zin = zipfile.ZipFile(path, "r")
doc = zin.read("word/document.xml").decode("utf-8")

# 1. Supprimer les pgNumType vides (couverture)
doc = doc.replace("<w:pgNumType/>", "")

# 2. Associer chaque footer rId au format de sa section
rels = zin.read("word/_rels/document.xml.rels").decode("utf-8")
rid_to_file = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="(footer\d+\.xml)"', rels))

sect_blocks = re.findall(r"<w:sectPr[^>]*>.*?</w:sectPr>", doc, re.S)
footer_fmt = {}
for blk in sect_blocks:
    fmt_m = re.search(r'<w:pgNumType[^>]*w:fmt="([^"]+)"', blk)
    for rid in re.findall(r'<w:footerReference[^>]*r:id="(rId\d+)"', blk):
        f = rid_to_file.get(rid)
        if not f:
            continue
        if fmt_m and "roman" in fmt_m.group(1).lower():
            footer_fmt[f] = "ROMAN"
        else:
            footer_fmt[f] = "arabic"
print("Mapping footers:", footer_fmt)

# 3. Écrire les fichiers patchés
zout = zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    data = zin.read(item.filename)
    if item.filename == "word/document.xml":
        data = doc.encode("utf-8")
    elif item.filename.startswith("word/footer") and item.filename.endswith(".xml"):
        fname = item.filename.split("/")[-1]
        fmt = footer_fmt.get(fname)
        if fmt:
            xml = data.decode("utf-8")
            xml2 = re.sub(r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
                          r"\1 PAGE \\* " + fmt + r" \\* MERGEFORMAT \2", xml)
            if xml2 != xml:
                print(f"Patch {fname} -> {fmt}")
            data = xml2.encode("utf-8")
    zout.writestr(item, data)
zin.close()
zout.close()
shutil.move(tmp, path)
print("OK pagination patchée:", path)

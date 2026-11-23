# -*- coding: utf-8 -*-
"""GÉNÉRATEUR du rapport d'audit API Z AI — corps ReportLab + fusion couverture.
Conforme au brief report.md : TocDocTemplate + multiBuild (TOC cliquable),
tables 100 % Paragraph(), palette fixe du Template 07 Crystal Blue (corps),
marges symétriques, CondPageBreak anti-orphelin, aucune couleur hors template.
"""
import hashlib, os, sys

SKILL_SCRIPTS = '/home/z/my-project/skills/pdf/scripts'
if SKILL_SCRIPTS not in sys.path:
    sys.path.insert(0, SKILL_SCRIPTS)
HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (CondPageBreak, HRFlowable, KeepTogether,
                                PageBreak, Paragraph, SimpleDocTemplate,
                                Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

from contenu_rapport import META, SECTIONS

# ── Polices autorisées ─────────────────────────────────────────────────────
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

from pdf import install_font_fallback  # noqa: E402  (skill pdf)
install_font_fallback()

# ── Palette — Template 07 Crystal Blue, corps clair (valeurs du template) ──
PAGE_BG      = colors.HexColor('#f5f8fc')   # XL
SECTION_BG   = colors.HexColor('#edf2f9')   # XL
CARD_BG      = colors.HexColor('#e4ecf5')   # L
TABLE_STRIPE = colors.HexColor('#eef3fa')   # L
HEADER_FILL  = colors.HexColor('#1a4a7a')   # M
BORDER       = colors.HexColor('#c0d0e2')   # S
ACCENT       = colors.HexColor('#2d7ab3')   # XS
TEXT_PRIMARY = colors.HexColor('#142840')
TEXT_MUTED   = colors.HexColor('#5a7a96')
TABLE_HEADER_COLOR = HEADER_FILL
TABLE_ROW_ODD = TABLE_STRIPE

# ── Document ───────────────────────────────────────────────────────────────
MARGIN = 2.1 * cm
PAGE_W, PAGE_H = A4
AVAIL = PAGE_W - 2 * MARGIN
BODY_PDF = os.path.join(HERE, 'body.pdf')

class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def on_page(canv, doc):
    canv.saveState()
    # Fond de page (Template 07, corps clair bleuté)
    canv.setFillColor(PAGE_BG)
    canv.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # En-tête : titre + règle accent
    canv.setFont('FreeSerif', 7.5)
    canv.setFillColor(TEXT_MUTED)
    canv.drawString(MARGIN, PAGE_H - 1.15 * cm, META['title'])
    canv.setStrokeColor(ACCENT)
    canv.setLineWidth(1.2)
    canv.line(MARGIN, PAGE_H - 1.35 * cm, PAGE_W - MARGIN, PAGE_H - 1.35 * cm)
    # Pied : auteur + page
    canv.setStrokeColor(BORDER)
    canv.setLineWidth(0.6)
    canv.line(MARGIN, 1.45 * cm, PAGE_W - MARGIN, 1.45 * cm)
    canv.setFont('FreeSerif', 7.5)
    canv.setFillColor(TEXT_MUTED)
    canv.drawString(MARGIN, 1.05 * cm, META['author'])
    canv.drawRightString(PAGE_W - MARGIN, 1.05 * cm, 'Page %d' % doc.page)
    canv.restoreState()

# ── Styles ─────────────────────────────────────────────────────────────────
h1_style = ParagraphStyle('H1', fontName='FreeSerif', fontSize=21, leading=26,
                          textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=4)
h2_style = ParagraphStyle('H2', fontName='FreeSerif', fontSize=14.5, leading=19,
                          textColor=HEADER_FILL, spaceBefore=14, spaceAfter=6)
body_style = ParagraphStyle('Body', fontName='FreeSerif', fontSize=10.5, leading=17,
                            textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=10)
bullet_style = ParagraphStyle('Bullet', fontName='FreeSerif', fontSize=10.5, leading=16,
                              textColor=TEXT_PRIMARY, alignment=TA_LEFT,
                              leftIndent=16, bulletIndent=4, spaceAfter=5,
                              bulletFontName='FreeSerif')
caption_style = ParagraphStyle('Caption', fontName='FreeSerif', fontSize=8.5, leading=12,
                               textColor=TEXT_MUTED, alignment=TA_CENTER,
                               spaceBefore=3, spaceAfter=6)
th_style = ParagraphStyle('TH', fontName='FreeSerif', fontSize=9.5, leading=12.5,
                          textColor=colors.white, alignment=TA_CENTER)
td_style = ParagraphStyle('TD', fontName='FreeSerif', fontSize=9.5, leading=13,
                          textColor=TEXT_PRIMARY, alignment=TA_LEFT)
td_c_style = ParagraphStyle('TDC', parent=td_style, alignment=TA_CENTER)
stat_style = ParagraphStyle('Stat', fontName='FreeSerif', fontSize=17, leading=20,
                            textColor=ACCENT, alignment=TA_CENTER)
stat_label = ParagraphStyle('StatL', fontName='FreeSerif', fontSize=8, leading=10.5,
                            textColor=TEXT_MUTED, alignment=TA_CENTER)
toc_title_style = ParagraphStyle('TocTitle', fontName='FreeSerif', fontSize=21, leading=26,
                                 textColor=TEXT_PRIMARY, spaceAfter=14)
toc_l0 = ParagraphStyle('TOC0', fontName='FreeSerif', fontSize=11.5, leading=18,
                        leftIndent=6, textColor=TEXT_PRIMARY)
toc_l1 = ParagraphStyle('TOC1', fontName='FreeSerif', fontSize=10, leading=15,
                        leftIndent=24, textColor=TEXT_MUTED)

H1_ORPHAN = (PAGE_H - 2 * MARGIN) * 0.18

def heading(text, style, level):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def make_table(spec):
    ratios = spec['w']
    col_w = [r * AVAIL * 0.985 for r in ratios]
    assert sum(col_w) <= AVAIL + 0.5, 'table overflow'
    data = [[Paragraph('<b>%s</b>' % h, th_style) for h in spec['head']]]
    for row in spec['rows']:
        cells = []
        for i, c in enumerate(row):
            st = td_c_style if (i > 0 and len(str(c)) <= 14) else td_style
            cells.append(Paragraph(str(c), st))
        data.append(cells)
    t = Table(data, colWidths=col_w, hAlign='CENTER', repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 5.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5.5),
    ]
    for i in range(1, len(data)):
        style.append(('BACKGROUND', (0, i), (-1, i),
                      TABLE_ROW_ODD if i % 2 == 1 else colors.white))
    t.setStyle(TableStyle(style))
    return t

def make_callouts(items):
    gap = 10
    cell_w = (AVAIL * 0.96 - 2 * gap) / 3
    row_stats, row_labels, widths = [], [], []
    for i, (big, label) in enumerate(items):
        row_stats.append(Paragraph('<b>%s</b>' % big, stat_style))
        row_labels.append(Paragraph(label, stat_label))
        widths.append(cell_w)
        if i < 2:
            row_stats.append('')
            row_labels.append('')
            widths.append(gap)
    t = Table([row_stats, row_labels], colWidths=widths, hAlign='CENTER')
    style = [('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
             ('TOPPADDING', (0, 0), (-1, 0), 9),
             ('BOTTOMPADDING', (0, 1), (-1, 1), 9),
             ('LEFTPADDING', (0, 0), (-1, -1), 4),
             ('RIGHTPADDING', (0, 0), (-1, -1), 4)]
    for col in (0, 2, 4):
        style.append(('BACKGROUND', (col, 0), (col, 1), CARD_BG))
        style.append(('BOX', (col, 0), (col, 1), 1, ACCENT))
    t.setStyle(TableStyle(style))
    return t

# ── Story ──────────────────────────────────────────────────────────────────
story = []
story.append(Paragraph('<b>Sommaire</b>', toc_title_style))
toc = TableOfContents()
toc.levelStyles = [toc_l0, toc_l1]
story.append(toc)
story.append(PageBreak())

first_h1_done = False
i = 0
n = len(SECTIONS)
while i < n:
    s = SECTIONS[i]
    t = s['t']
    if t == 'h1':
        parts = [CondPageBreak(H1_ORPHAN)]
        if first_h1_done:
            parts.append(Spacer(1, 14))
        head = heading(s['x'], h1_style, 0)
        rule = HRFlowable(width='100%', color=ACCENT, thickness=1.6,
                          spaceBefore=2, spaceAfter=12)
        nxt = SECTIONS[i + 1] if i + 1 < n else None
        if nxt and nxt['t'] == 'body':
            parts.append(KeepTogether([head, rule,
                            Paragraph(nxt['x'], body_style)]))
            i += 1
        else:
            parts.append(KeepTogether([head, rule]))
        story.extend(parts)
        first_h1_done = True
    elif t == 'h2':
        story.append(CondPageBreak(70))
        story.append(heading(s['x'], h2_style, 1))
    elif t == 'body':
        story.append(Paragraph(s['x'], body_style))
    elif t == 'bullet':
        for item in s['items']:
            story.append(Paragraph(item, bullet_style, bulletText='•'))
        story.append(Spacer(1, 6))
    elif t == 'table':
        story.append(Spacer(1, 8))
        tbl = make_table(s)
        cap = Paragraph(s['cap'], caption_style)
        if len(s['rows']) <= 6:
            story.append(KeepTogether([tbl, Spacer(1, 5), cap]))
        else:
            story.append(tbl)
            story.append(Spacer(1, 5))
            story.append(cap)
        story.append(Spacer(1, 12))
    elif t == 'callouts':
        story.append(Spacer(1, 6))
        story.append(KeepTogether([make_callouts(s['items'])]))
        story.append(Spacer(1, 12))
    i += 1

doc = TocDocTemplate(
    BODY_PDF, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=2.0 * cm,
    title=META['title'], author='Z.ai', creator='Z.ai',
    subject=META['subject'])
doc.multiBuild(story, onFirstPage=on_page, onLaterPages=on_page)
print('corps généré:', BODY_PDF)

# ── Fusion couverture + corps ──────────────────────────────────────────────
from pypdf import PdfReader, PdfWriter  # noqa: E402

A4_W, A4_H = 595.28, 841.89

def normalize(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page

OUT = '/home/z/my-project/download/Rapport_Audit_API_ZAI_PAUL_IA.pdf'
os.makedirs(os.path.dirname(OUT), exist_ok=True)
writer = PdfWriter()
writer.add_page(normalize(PdfReader(os.path.join(HERE, 'cover.pdf')).pages[0]))
for pg in PdfReader(BODY_PDF).pages:
    writer.add_page(normalize(pg))
writer.add_metadata({'/Title': META['title'], '/Author': 'Z.ai',
                     '/Creator': 'Z.ai', '/Subject': META['subject']})
with open(OUT, 'wb') as f:
    writer.write(f)
print('PDF final:', OUT, '| pages:', len(writer.pages))

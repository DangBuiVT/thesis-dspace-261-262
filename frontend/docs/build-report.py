"""Render the submission report and verified screenshots to a standalone PDF.

Requires reportlab. Run from any directory; output stays beside this script.
"""
from pathlib import Path
import html
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak,
    KeepTogether,
)

BASE = Path(__file__).resolve().parent
FONT = "Helvetica"
BOLD = "Helvetica-Bold"
font_path = Path("C:/Windows/Fonts/segoeui.ttf")
if font_path.exists():
    pdfmetrics.registerFont(TTFont("Segoe", str(font_path)))
    pdfmetrics.registerFont(TTFont("SegoeBold", "C:/Windows/Fonts/segoeuib.ttf"))
    pdfmetrics.registerFontFamily("Segoe", normal="Segoe", bold="SegoeBold", italic="Segoe", boldItalic="SegoeBold")
    FONT, BOLD = "Segoe", "SegoeBold"

NAVY = colors.HexColor("#132d65")
BLUE = colors.HexColor("#147ac0")
styles = getSampleStyleSheet()
styles.add(ParagraphStyle("ReportBody", fontName=FONT, fontSize=9.5, leading=14, spaceAfter=8, textColor=colors.HexColor("#24344b")))
styles.add(ParagraphStyle("ReportH1", fontName=BOLD, fontSize=23, leading=29, textColor=NAVY, spaceBefore=10, spaceAfter=16))
styles.add(ParagraphStyle("ReportH2", fontName=BOLD, fontSize=15, leading=20, textColor=NAVY, spaceBefore=14, spaceAfter=9, keepWithNext=True))
styles.add(ParagraphStyle("ReportH3", fontName=BOLD, fontSize=11, leading=16, textColor=BLUE, spaceBefore=9, spaceAfter=7, keepWithNext=True))
styles.add(ParagraphStyle("Cell", fontName=FONT, fontSize=8.5, leading=12, textColor=colors.HexColor("#24344b")))
styles.add(ParagraphStyle("Caption", fontName=FONT, fontSize=9, leading=13, textColor=colors.HexColor("#526177"), spaceAfter=12))

def inline(text):
    text = html.escape(text).replace("\u2011", "-")
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[([^]]+)\]\((https?://[^)]+)\)", r'<link href="\2" color="#147ac0">\1</link>', text)
    text = re.sub(r"\[([^]]+)\]\(([^)]+)\)", r"\1", text)
    return text

def markdown(source):
    flow = []
    lines = source.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [cell.strip() for cell in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r"[:\- ]+", cell or " ") for cell in cells):
                    rows.append([Paragraph(inline(cell), styles["Cell"]) for cell in cells])
                i += 1
            widths = [doc.width / len(rows[0])] * len(rows[0])
            if len(rows[0]) == 3 and rows[0][0].getPlainText() == "Week":
                widths = [38, 140, doc.width - 178]
            table = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8f0fa")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d4ddea")),
                ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]))
            flow.extend([table, Spacer(1, 12)])
            continue
        if line.startswith("### "):
            flow.append(Paragraph(inline(line[4:]), styles["ReportH3"]))
        elif line.startswith("## "):
            flow.append(Paragraph(inline(line[3:]), styles["ReportH2"]))
        elif line.startswith("# "):
            flow.append(Paragraph(inline(line[2:]), styles["ReportH1"]))
        elif line.startswith("- "):
            flow.append(Paragraph("• " + inline(line[2:]), styles["ReportBody"]))
        elif line.startswith("```"):
            code = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code.append(html.escape(lines[i]))
                i += 1
            flow.append(Paragraph("<br/>".join(code), styles["Caption"]))
        else:
            paragraph = [line]
            while i + 1 < len(lines) and lines[i + 1].strip() and not lines[i + 1].startswith(("#", "|", "- ", "```")):
                i += 1
                paragraph.append(lines[i].strip())
            flow.append(Paragraph(inline(" ".join(paragraph)), styles["ReportBody"]))
        i += 1
    return flow

def page(canvas, document):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(BLUE)
    canvas.setLineWidth(2)
    canvas.line(42, height - 35, width - 42, height - 35)
    canvas.setFont(FONT, 8)
    canvas.setFillColor(NAVY)
    canvas.drawString(42, height - 27, "HCMUT Thesis Portal | Nhan | Frontend submission, weeks 1-6")
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(42, 25, "Evidence date: 4 November 2026 | Local integration evidence")
    canvas.drawRightString(width - 42, 25, str(document.page))
    canvas.restoreState()

doc = SimpleDocTemplate(str(BASE / "nhan-ui-weeks-1-6.pdf"), pagesize=A4, rightMargin=42, leftMargin=42,
                        topMargin=52, bottomMargin=44, title="Nhan - Thesis Portal UI, Weeks 1-6", author="Nhan")
story = markdown((BASE / "report.md").read_text(encoding="utf-8"))
story.append(PageBreak())
story.extend(markdown((BASE / "validation.md").read_text(encoding="utf-8")))

figures = [
    ("Actor use cases", "diagrams/use-cases.png", "Editable source: diagrams/use-cases.puml. Actors are shown only with capabilities in the current submission boundary."),
    ("Student submission wireframe", "screenshots/wireframe-01.png", "Design frame: collection context, metadata, required PDF, and separate save/submit actions."),
    ("Assigned queue wireframe", "screenshots/wireframe-02.png", "Design frame: searchable assigned tasks, current stage, role actions, and feedback."),
    ("Shared workspace wireframe", "screenshots/wireframe-03.png", "Design frame: metadata/PDF columns, history, and Final Editor return/archive actions."),
    ("Before: original Editor detail", "screenshots/before-editor.png", "Original tracked frontend at baseline 4f7a73df rendered with current local test data; not a historical screenshot."),
    ("After: Editor metadata and PDF", "screenshots/after-editor.png", "Actual local application. Metadata and authenticated PDF preview share one workspace."),
    ("After: metadata audit history", "screenshots/after-history.png", "Actual local application. The change event records the real local test actor and field-level before/after values."),
    ("After: Final Editor", "screenshots/after-final-editor.png", "Actual local application. Return to Editor and Commit to Archive replace rejection to the student."),
    ("After: Vietnamese mobile workspace", "screenshots/after-mobile-vi.png", "Actual local application at 390px viewport. Content stacks vertically and supports Vietnamese."),
    ("Actual portal-generated email", "screenshots/mailpit-inbox.png", "Mailpit captures local SMTP messages. This is not evidence of production delivery or DSpace-generated mail."),
]
for title, filename, caption in figures:
    image_path = BASE / filename
    if not image_path.exists():
        raise FileNotFoundError(f"Capture evidence before exporting: {image_path}")
    story.extend([PageBreak(), Paragraph(title, styles["ReportH2"]), Paragraph(caption, styles["Caption"])])
    width, height = ImageReader(str(image_path)).getSize()
    scale = min(doc.width / width, (doc.height - 100) / height)
    story.append(Image(str(image_path), width=width * scale, height=height * scale))
doc.build(story, onFirstPage=page, onLaterPages=page)
print(BASE / "nhan-ui-weeks-1-6.pdf")

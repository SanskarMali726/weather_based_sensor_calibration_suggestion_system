"""Generates a downloadable PDF report summarizing current weather and recommendation."""
import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def build_report_pdf(city: str, weather, recommendation) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleX", parent=styles["Title"], fontSize=18)
    heading_style = ParagraphStyle("HeadingX", parent=styles["Heading2"], spaceBefore=14)

    elements = [
        Paragraph("Sensor Calibration Report", title_style),
        Paragraph(f"{city} — generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]),
        Spacer(1, 12),
        Paragraph("Current Weather", heading_style),
    ]

    weather_table_data = [
        ["Parameter", "Value"],
        ["Temperature", f"{weather.temperature:.1f} °C"],
        ["Humidity", f"{weather.humidity:.0f} %"],
        ["Wind speed", f"{weather.wind_speed:.0f} km/h"],
        ["Rainfall", f"{weather.rainfall:.1f} mm/h"],
        ["Pressure", f"{weather.pressure:.0f} hPa"],
        ["Cloud cover", f"{weather.cloud_cover:.0f} %"],
        ["Visibility", f"{weather.visibility:.1f} km"],
        ["Storm", "Yes" if weather.storm else "No"],
    ]
    t = Table(weather_table_data, colWidths=[70 * mm, 70 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    elements.append(t)

    elements.append(Paragraph("Recommendation", heading_style))
    rec_table_data = [
        ["Sensitivity", recommendation.sensitivity],
        ["Risk score", str(recommendation.risk_score)],
        ["Risk level", recommendation.risk_level],
        ["AI confidence", f"{recommendation.confidence}%"],
    ]
    t2 = Table(rec_table_data, colWidths=[70 * mm, 70 * mm])
    t2.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    elements.append(t2)

    elements.append(Spacer(1, 10))
    elements.append(Paragraph("Explanation", heading_style))
    elements.append(Paragraph(recommendation.reason, styles["Normal"]))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
import io

from database.db import get_db
from models.models import Recommendation
from services.report_service import build_report_pdf

router = APIRouter(tags=["Report"])


@router.get("/report")
def get_report(city: str = Query("Default Sector"), db: Session = Depends(get_db)):
    """Return a downloadable PDF summarizing the latest recommendation for a city."""
    recommendation = (
        db.query(Recommendation)
        .filter(Recommendation.city == city)
        .order_by(Recommendation.generated_at.desc())
        .first()
    )
    if not recommendation:
        raise HTTPException(status_code=404, detail=f"No recommendation history found for '{city}'. Call /recommend first.")

    weather = recommendation.weather
    pdf_bytes = build_report_pdf(city, weather, recommendation)

    filename = f"sensor_calibration_report_{city.replace(' ', '_')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database.db import get_db
from models.models import Recommendation
from schemas.schemas import RecommendationOut

router = APIRouter(tags=["History"])


@router.get("/history", response_model=List[RecommendationOut])
def get_history(
    city: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Filter by text found in the reason or sensitivity"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Recommendation).order_by(Recommendation.generated_at.desc())
    if city:
        query = query.filter(Recommendation.city == city)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Recommendation.reason.ilike(like)) | (Recommendation.sensitivity.ilike(like))
        )
    return query.limit(limit).all()

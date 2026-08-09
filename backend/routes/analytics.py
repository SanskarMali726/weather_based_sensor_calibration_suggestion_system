from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from database.db import get_db
from schemas.schemas import AnalyticsOut
from services.analytics_service import build_analytics

router = APIRouter(tags=["Analytics"])


@router.get("/analytics", response_model=AnalyticsOut)
def get_analytics(city: Optional[str] = Query(None), limit: int = Query(50, le=200), db: Session = Depends(get_db)):
    return build_analytics(db, city=city, limit=limit)

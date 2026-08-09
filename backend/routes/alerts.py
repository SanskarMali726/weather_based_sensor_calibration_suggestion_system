from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database.db import get_db
from models.models import Alert
from schemas.schemas import AlertOut

router = APIRouter(tags=["Alerts"])


@router.get("/alerts", response_model=List[AlertOut])
def get_alerts(city: Optional[str] = Query(None), limit: int = Query(20, le=100), db: Session = Depends(get_db)):
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if city:
        query = query.filter(Alert.city == city)
    return query.limit(limit).all()

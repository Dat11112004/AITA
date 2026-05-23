from fastapi import APIRouter
from schemas.app_schemas import AssessRequest
from services.gemini_service import assess_submission_content

router = APIRouter()

@router.post("/assess")
def assess_submission(req: AssessRequest):
    """
    Evaluates student code or submissions using Gemini.
    Provides structured scoring (0.0 to 10.0) and helpful pedagogical feedback.
    """
    return assess_submission_content(req)

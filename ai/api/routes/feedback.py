from fastapi import APIRouter
from schemas.app_schemas import LearningFeedbackRequest
from services.gemini_service import generate_learning_feedback

router = APIRouter()

@router.post("/learning-feedback")
def learning_feedback(req: LearningFeedbackRequest):
    """
    Analyzes student learning progress and gives personalized recommendations.
    """
    return generate_learning_feedback(req)

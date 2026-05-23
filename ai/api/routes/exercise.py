from fastapi import APIRouter
from schemas.app_schemas import GenerateExerciseRequest
from services.gemini_service import generate_exercise_content

router = APIRouter()

@router.post("/generate-exercise")
def generate_exercise(req: GenerateExerciseRequest):
    """
    Generates structured learning exercises using Gemini API.
    Guarantees perfectly-structured JSON matching the AITA frontend/backend expectations.
    """
    return generate_exercise_content(req)

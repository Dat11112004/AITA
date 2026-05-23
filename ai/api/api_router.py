from fastapi import APIRouter
from api.routes import exercise, assessment, feedback

router = APIRouter()

router.include_router(exercise.router, tags=["Exercise Generation"])
router.include_router(assessment.router, tags=["Assessment"])
router.include_router(feedback.router, tags=["Feedback"])

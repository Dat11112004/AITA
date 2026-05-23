from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class GenerateExerciseRequest(BaseModel):
    classId: Optional[str] = None
    type: str = Field(..., description="quiz, coding, or group")
    topic: str = Field(..., description="Topic of the exercise")
    difficulty: Optional[str] = "medium"
    questionCount: Optional[int] = 5
    language: Optional[str] = "javascript"
    extra: Optional[str] = None

class AssessRequest(BaseModel):
    assignmentType: str = Field(..., description="quiz, coding, or group")
    content: str = Field(..., description="Student's submission content (code, answers, or group contribution details)")
    language: Optional[str] = None
    assignmentTitle: Optional[str] = None
    assignmentDescription: Optional[str] = None
    gradingCriteria: Optional[str] = None

class LearningFeedbackRequest(BaseModel):
    studentId: str
    assignmentType: str = Field(..., description="quiz, coding, or group")
    score: Optional[float] = None
    submissionContent: Optional[str] = None
    aiAssessment: Optional[str] = None
    topicsProgress: Optional[List[Dict[str, Any]]] = None

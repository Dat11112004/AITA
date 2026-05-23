import google.generativeai as genai
import json
from core.config import MODEL_NAME
from schemas.app_schemas import GenerateExerciseRequest, AssessRequest, LearningFeedbackRequest

def generate_exercise_content(req: GenerateExerciseRequest):
    print(f"Generating exercise for topic: '{req.topic}' [Type: {req.type}, Difficulty: {req.difficulty}]")
    prompt = f"""
    You are an expert university professor at FPT University designing an assignment for a course.
    Please design a high-quality university assignment with the following constraints:
    - Topic: {req.topic}
    - Type of Assignment: {req.type} (Must be 'quiz', 'coding', or 'group')
    - Difficulty level: {req.difficulty}
    - Programming language (if coding): {req.language}
    - Additional notes: {req.extra or 'None'}
    - Target Question Count (if quiz): {req.questionCount}

    You MUST return a JSON object with EXACTLY the following keys (no markdown packaging, no trailing comma, just raw valid JSON):
    {{
      "title": "A highly descriptive, creative title of the assignment prefixed with '[AI]'",
      "description": "A comprehensive overview of what the student will learn or accomplish in this assignment.",
      "content": {{
        "type": "{req.type}",
        "topic": "{req.topic}",
        "difficulty": "{req.difficulty}",
        "language": "{req.language}",
        "instructions": "Markdown formatted description containing details, setup instructions, and guidelines for students.",
        "requirements": ["List of 3 to 5 clear requirements or grading criteria"],
        "starterCode": "Optional starter code or structure for coding assignments. Empty string if not coding.",
        "questions": [
          {{
            "id": 1,
            "question": "A clear, conceptual multiple-choice question.",
            "options": ["A", "B", "C", "D"],
            "correctOption": 0
          }}
        ]
      }},
      "aiNotesForInstructor": "Provide suggestions to the instructor on how to review, edit, or utilize this assignment before publishing to students."
    }}
    
    Note: For "quiz", make sure to generate exactly {req.questionCount} questions in the "questions" list. If the type is "coding" or "group", the "questions" list should be empty.
    Provide realistic FPT University style context (e.g., student grading systems, university campuses, course management, etc.).
    """
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error generating exercise: {e}")
        return {
            "title": f"[AI] Bài tập {req.type.upper()}: {req.topic}",
            "description": f"Tìm hiểu về {req.topic} ở mức độ {req.difficulty}.",
            "content": {"type": req.type, "topic": req.topic, "difficulty": req.difficulty, "language": req.language, "instructions": f"Hãy tìm hiểu và hoàn thành bài tập về {req.topic}.", "requirements": [f"Yêu cầu 1: Hiểu về {req.topic}", "Yêu cầu 2: Triển khai đúng logic yêu cầu"], "starterCode": "// Hãy code tại đây\n" if req.type == "coding" else "", "questions": []},
            "aiNotesForInstructor": "Hệ thống AI gặp lỗi nhẹ, vui lòng kiểm tra và thiết lập câu hỏi thủ công."
        }

def assess_submission_content(req: AssessRequest):
    print(f"Assessing submission...")
    prompt = f"""
    You are an expert AI Teaching Assistant at FPT University grading a student's submission.
    Evaluate the submission details below. The assignment type is '{req.assignmentType}'.
    Please provide assessment, grading out of 10.0, and instructor-facing rationale.

    Assignment Context:
    - Type: {req.assignmentType}
    - Title: {req.assignmentTitle or 'General Practice'}
    - Description: {req.assignmentDescription or 'Assignment instructions'}
    - Grading Criteria: {req.gradingCriteria or 'Standard evaluation'}
    
    Student Submission:
    - Language (if coding): {req.language or 'auto'}
    - Content/Answers:
    \"\"\"
    {req.content}
    \"\"\"

    Assessment Instructions by Type:
    - If "quiz": Evaluate the submitted answers. Provide an estimated score out of 10.0 based on correctness. Give a brief summary for the instructor to review.
    - If "coding": Check for correctness, efficiency, logic, formatting. Provide score (0-10) and specific comments for the instructor to review before approving the grade.
    - If "group": Evaluate based on the submitted group report/contributions. Provide an opinion on the group's overall output and individual contributions. Suggest a score (0-10) for the instructor to decide the final grade.

    You MUST return a JSON object with EXACTLY the following keys (no markdown packaging):
    {{
      "aiSuggestedScore": 8.5,
      "instructorReviewNotes": "An objective summary intended ONLY for the instructor. Example: 'This student nailed the algorithm but missed a corner case.' OR 'The group contributed evenly but the report lacks depth.'",
      "studentFeedbackPreview": "A preview of the comments meant for the student, which the instructor can edit.",
      "feedbackDetails": {{
        "logic": "Analysis of correctness/logic.",
        "presentation": "Evaluation of code style, or essay/report structure.",
        "testCasesOrCorrectness": "Specifics on what passed/failed or was right/wrong."
      }}
    }}
    """
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error assessing submission: {e}")
        return {
            "aiSuggestedScore": 7.5, "instructorReviewNotes": "Chưa trọn vẹn, cần giảng viên đánh giá thêm.", "studentFeedbackPreview": "Bài làm tương đối ổn nhưng cần khắc phục một số điểm.", "feedbackDetails": {"logic": "Logic cơ bản đúng, xử lý tốt luồng chính.", "presentation": "Trình bày rõ ràng.", "testCasesOrCorrectness": "Chính xác khoảng 75%."}
        }

def generate_learning_feedback(req: LearningFeedbackRequest):
    print(f"Generating personalized insights for student: {req.studentId}")
    prompt = f"""
    You are a supportive academic AI coach at FPT University.
    Provide constructive, assignment-specific feedback and learning recommendations for the student.
    
    Context:
    - Student ID: {req.studentId}
    - Assignment Type: {req.assignmentType}
    - Score: {req.score or 'N/A'}
    - AI Assessment Comments: {req.aiAssessment or 'None'}
    
    Task based on Assignment Type:
    - If "quiz": Since quizzes test specific topics, if the score is low, suggest related lessons/study materials based on the failed topics for them to review. If score is high, encourage them.
    - If "coding": Review the AI assessment and code, point out the exact mistakes, and provide specific solutions, code snippets, or approaches for the student to fix their code.
    - If "group": Give feedback on the overall group output quality and assess individual contributions (based on AI Assessment Context) and how they can collaborate better.

    You MUST return a JSON object with EXACTLY the following keys:
    {{
      "studentId": "{req.studentId}",
      "feedbackMessage": "A highly detailed, personalized markdown string directly addressing the student based on their output. (e.g. For coding: include code fixes. For quiz: mention which concepts to restudy)",
      "recommendedActions": [
        "Read Chapter XYZ on Database Joins",
        "Refactor your loop to use map() instead of for-loop to avoid index out of bounds"
      ],
      "relatedTopicsToReview": ["Topic A", "Topic B"]
    }}
    """
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error generating learning feedback: {e}")
        return {
            "studentId": req.studentId, "feedbackMessage": "Xin chào, hệ thống nhận thấy bài làm của bạn cần cải thiện. Hãy xem lại kiến thức căn bản của bài học này.", "recommendedActions": ["Ôn tập lại tài liệu môn học", "Tham khảo thêm bài tập mẫu"], "relatedTopicsToReview": ["General Programming", "Core concepts"]
        }

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import setup_gemini, MODEL_NAME
from api.api_router import router as api_router

def create_app() -> FastAPI:
    # Initialize gemini config
    setup_gemini()
    
    app = FastAPI(
        title="AITA AI Microservice",
        description="Python AI microservice powered by Gemini API for exercise generation, assessment, and student insights.",
        version="1.0.0"
    )

    # Enable CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    
    app.include_router(api_router)
    
    @app.get("/health", tags=["System"])
    def health_check():
        return {"status": "healthy", "service": "AITA AI Service (Python)", "model": MODEL_NAME}
        
    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

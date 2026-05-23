import google.generativeai as genai

# Using the provided key
GEMINI_API_KEY = "AIzaSyBjQpGiLWeUmzmOmqhv72b0e-wKa_dUGaA"
MODEL_NAME = "gemini-1.5-flash"

def setup_gemini():
    genai.configure(api_key=GEMINI_API_KEY)

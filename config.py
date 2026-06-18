import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = "mindease-secret-123"
    SQLALCHEMY_DATABASE_URI = "sqlite:///mindease.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
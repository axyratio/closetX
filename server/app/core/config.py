import os
from dotenv import load_dotenv
load_dotenv()

class Settings:
    DB_USERNAME = os.getenv("DB_USERNAME")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOSTNAME = os.getenv("DB_HOSTNAME")
    DB_PORT = os.getenv("DB_PORT")
    DB_NAME = os.getenv("DB_NAME")

    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        # ใช้ f-string เพื่อสร้าง URL หากไม่ได้ดึงมาจาก Env Var โดยตรง
        DATABASE_URL = f"postgresql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOSTNAME}:{DB_PORT}/{DB_NAME}"

    SECRET_KEY = os.getenv("SECRET_KEY")
    ALGORITHM = os.getenv("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    
    BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
    
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # OTP_SECRET_KEY = os.getenv("OTP_SECRET_KEY")
    # OTP_TOKEN_EXPIRE_MINUTES = int(os.getenv("OTP_TOKEN_EXPIRE_MINUTES"))
    
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = os.getenv("SMTP_PORT", "587")
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
    SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "ClosetX")
    

settings = Settings()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

try:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True,)
    print(f"[Database] Connected to {settings.DATABASE_URL}")
except Exception as e:
    print(f"[Database] Connection failed: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

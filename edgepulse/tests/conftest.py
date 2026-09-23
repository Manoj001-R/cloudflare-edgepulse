"""Pytest fixtures and configuration for EdgePulse."""
import asyncio
import os
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
import app.db.database as db_module
from app.db.database import Base, init_db

TEST_DB_FILE = "./test_edgepulse.db"
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_FILE}"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

# Monkeypatch database module engine & sessionmaker for test isolation
db_module.engine = test_engine
db_module.AsyncSessionLocal = TestSessionLocal


async def setup_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def teardown_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass


def run_async(coro):
    """Utility to run asynchronous coroutines inside synchronous pytest tests."""
    return asyncio.run(coro)

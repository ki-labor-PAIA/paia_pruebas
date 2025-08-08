# long_term_store_pg.py
import os
import asyncio
from typing import Dict, Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import (
    MetaData, Table, Column, String, DateTime, Text, UniqueConstraint, select, insert, update, delete
)

# DATABASE_URL ejemplo:
# postgresql+asyncpg://usuario:password@localhost:5432/paia
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:root@localhost:5432/")

metadata = MetaData(schema=os.getenv("DB_SCHEMA", None))

memories = Table(
    "long_term_memories",
    metadata,
    Column("id", String(36), primary_key=True),
    Column("memory_profile_id", String(255), nullable=False),  # estable: user:U1|persona:AsesorVentas
    Column("key", String(255), nullable=False),
    Column("value", Text, nullable=False),
    Column("updated_at", DateTime, nullable=False),
    UniqueConstraint("memory_profile_id", "key", name="uq_profile_key"),
)

class LongTermStorePG:
    def __init__(self, database_url: Optional[str] = None):
        url = database_url or DATABASE_URL
        self.engine = create_async_engine(url, echo=False, pool_pre_ping=True)
        self.Session = async_sessionmaker(self.engine, expire_on_commit=False)

    async def init_db(self):
        async with self.engine.begin() as conn:
            await conn.run_sync(metadata.create_all)

    async def get_all(self, memory_profile_id: str) -> Dict[str, str]:
        async with self.Session() as session:
            stmt = select(memories.c.key, memories.c.value).where(
                memories.c.memory_profile_id == memory_profile_id
            )
            result = await session.execute(stmt)
            rows = result.fetchall()
            return {k: v for k, v in rows}

    async def set(self, memory_profile_id: str, key: str, value: str):
        now = datetime.utcnow()
        async with self.Session() as session:
            # upsert manual por la UQ
            # 1) try update
            upd = (
                update(memories)
                .where(
                    (memories.c.memory_profile_id == memory_profile_id)
                    & (memories.c.key == key)
                )
                .values(value=value, updated_at=now)
            )
            res = await session.execute(upd)
            if res.rowcount == 0:
                ins = insert(memories).values(
                    id=os.urandom(8).hex(),
                    memory_profile_id=memory_profile_id,
                    key=key,
                    value=value,
                    updated_at=now,
                )
                await session.execute(ins)
            await session.commit()

    async def delete_key(self, memory_profile_id: str, key: str):
        async with self.Session() as session:
            stmt = delete(memories).where(
                (memories.c.memory_profile_id == memory_profile_id)
                & (memories.c.key == key)
            )
            await session.execute(stmt)
            await session.commit()

    async def clear(self, memory_profile_id: str):
        async with self.Session() as session:
            stmt = delete(memories).where(memories.c.memory_profile_id == memory_profile_id)
            await session.execute(stmt)
            await session.commit()

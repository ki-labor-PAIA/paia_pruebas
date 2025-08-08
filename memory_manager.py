# memory_manager.py
from datetime import datetime
from typing import Dict, List, Optional, Protocol
from dataclasses import dataclass, field

class LongTermBackend(Protocol):
    async def get_all(self, memory_profile_id: str) -> Dict[str, str]: ...
    async def set(self, memory_profile_id: str, key: str, value: str): ...
    async def delete_key(self, memory_profile_id: str, key: str): ...
    async def clear(self, memory_profile_id: str): ...

@dataclass
class Message:
    role: str
    content: str
    timestamp: str

@dataclass
class Memory:
    short_term_memory: List[Message] = field(default_factory=list)
    long_term_memory: Dict[str, str] = field(default_factory=dict)

class MemoryManager:
    def __init__(self, long_term_backend: Optional[LongTermBackend] = None):
        self.agent_memories: Dict[str, Memory] = {}
        self.long_term_backend = long_term_backend
        self.profile_map: Dict[str, str] = {}  # agent_id -> memory_profile_id

    def init_agent_memory(self, agent_id: str):
        if agent_id not in self.agent_memories:
            self.agent_memories[agent_id] = Memory()

    def bind_profile(self, agent_id: str, memory_profile_id: str):
        self.profile_map[agent_id] = memory_profile_id

    def add_to_short_term(self, agent_id: str, role: str, content: str):
        self.init_agent_memory(agent_id)
        self.agent_memories[agent_id].short_term_memory.append(
            Message(role=role, content=content, timestamp=datetime.now().isoformat())
        )
        self.agent_memories[agent_id].short_term_memory = self.agent_memories[agent_id].short_term_memory[-10:]

    def get_short_term_context(self, agent_id: str):
        self.init_agent_memory(agent_id)
        return self.agent_memories[agent_id].short_term_memory

    async def add_to_long_term(self, agent_id: str, key: str, value: str):
        self.init_agent_memory(agent_id)
        profile = self.profile_map.get(agent_id, agent_id)
        if self.long_term_backend:
            await self.long_term_backend.set(profile, key, value)
        else:
            self.agent_memories[agent_id].long_term_memory[key] = value

    async def get_long_term_memory(self, agent_id: str) -> Dict[str, str]:
        self.init_agent_memory(agent_id)
        profile = self.profile_map.get(agent_id, agent_id)
        if self.long_term_backend:
            return await self.long_term_backend.get_all(profile)
        return self.agent_memories[agent_id].long_term_memory

    async def delete_long_term_key(self, agent_id: str, key: str):
        profile = self.profile_map.get(agent_id, agent_id)
        if self.long_term_backend:
            await self.long_term_backend.delete_key(profile, key)
        else:
            self.agent_memories[agent_id].long_term_memory.pop(key, None)

    async def clear_long_term(self, agent_id: str):
        profile = self.profile_map.get(agent_id, agent_id)
        if self.long_term_backend:
            await self.long_term_backend.clear(profile)
        else:
            self.agent_memories[agent_id].long_term_memory.clear()

"""
Configuration settings for PAIA Backend.
Contains constants, environment variables, and application configuration.
"""
import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

# API Configuration
API_TITLE: str = "PAIA Platform Backend"
API_VERSION: str = "1.0.0"

# Google API
GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY

# Telegram Configuration
TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "7631967713:AAFLKpCvsRk3PByVrvD2cwYcuOZM5smdXno")
TELEGRAM_DEFAULT_CHAT_ID: str = "1629694928"

# CORS Configuration
CORS_ORIGINS: List[str] = ["*"]
CORS_ALLOW_CREDENTIALS: bool = True
CORS_ALLOW_METHODS: List[str] = ["*"]
CORS_ALLOW_HEADERS: List[str] = ["*"]

# LLM Configuration
LLM_MODEL: str = "gemini-2.0-flash"
LLM_TEMPERATURE: float = 0.7

# MCP Configuration
MCP_SERVER_URL: str = "http://127.0.0.1:3000/api/mcp"
MCP_TRANSPORT: str = "streamable_http"

# WhatsApp Configuration
WHATSAPP_API_URL: str = os.getenv("WHATSAPP_API_URL", "")
WHATSAPP_ACCESS_TOKEN: str = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")

# Supabase Configuration (imported from supabase_config)
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

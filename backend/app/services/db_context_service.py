import json
import logging
from datetime import datetime, date, time
from decimal import Decimal
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, inspect

from app.config import settings
from langchain_groq import ChatGroq

# Ensure all models are imported so Base.metadata is fully populated
import app.models.user        # noqa: F401
import app.models.doctor      # noqa: F401
import app.models.department  # noqa: F401
import app.models.appointment # noqa: F401
import app.models.chat_session # noqa: F401

from app.database import Base

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------
# Custom JSON encoder for PostgreSQL result types
# --------------------------------------------------------------------------
class DBContextEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date, time)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, uuid.UUID):
            return str(obj)
        return super().default(obj)


# --------------------------------------------------------------------------
# SCHEMA EXTRACTOR
# Produces a compact plain-text schema from SQLAlchemy metadata.
# --------------------------------------------------------------------------
def get_db_schema() -> str:
    """
    Returns a compact human-readable and LLM-friendly schema description
    by iterating over SQLAlchemy Base.metadata.tables.
    Only includes tables that are relevant for hospital queries.
    """
    ALLOWED_TABLES = {"doctors", "departments", "appointments", "users"}
    schema_lines = []

    for table_name, table in Base.metadata.tables.items():
        if table_name not in ALLOWED_TABLES:
            continue
        cols = []
        for col in table.columns:
            # Produce a clean type string like INTEGER, VARCHAR, TEXT, TIMESTAMP
            type_str = str(col.type).split("(")[0].upper()
            cols.append(f"  {col.name} {type_str}")
        schema_lines.append(f"TABLE {table_name} (\n" + ",\n".join(cols) + "\n)")

    return "\n\n".join(schema_lines)


# --------------------------------------------------------------------------
# SQL GENERATOR
# Calls Groq to convert the user's natural language question into SQL.
# --------------------------------------------------------------------------
async def generate_sql(user_query: str, schema: str) -> str:
    """
    Uses the Groq LLM to translate a natural language query to a safe,
    read-only SQL SELECT query strictly based on the provided schema.
    """
    llm = ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=settings.GROQ_MODEL,
        temperature=0.0,
        max_tokens=256
    )

    prompt = f"""You are a strict PostgreSQL query generator.

DATABASE SCHEMA (use ONLY these exact table and column names):
{schema}

RULES — follow every rule exactly:
1. Output ONLY the raw SQL. No markdown. No explanation. No backticks.
2. Use ONLY SELECT statements. Never output INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE.
3. Always add LIMIT 50 unless the query already has a LIMIT.
4. Use ONLY column names that appear in the schema above. Do not invent columns.
5. For text searches use ILIKE for case-insensitive matching.
6. When searching for a doctor specialty by common name, use a broad ILIKE pattern:
   - "dentist" → specialization ILIKE '%dental%'
   - "cardiologist" → specialization ILIKE '%cardio%'
   - "gynecologist" → specialization ILIKE '%gynec%' OR specialization ILIKE '%obstet%'
   - "urologist" → specialization ILIKE '%urol%'
   - "neurologist" → specialization ILIKE '%neuro%'
   Apply the same broadening principle for any other specialty synonyms.
7. If the question cannot be answered with a SQL query, output exactly: NONE

User question: {user_query}
SQL:"""

    try:
        response = await llm.ainvoke(prompt)
        query = response.content.strip()

        # Strip accidental markdown fences
        if query.startswith("```"):
            lines = query.splitlines()
            lines = [l for l in lines if not l.strip().startswith("```")]
            query = "\n".join(lines).strip()

        return query
    except Exception as e:
        logger.error(f"SQL generation error: {e}", exc_info=True)
        return ""


# --------------------------------------------------------------------------
# MAIN ENTRY POINT: get_db_context
# --------------------------------------------------------------------------
async def get_db_context(user_query: str, db: AsyncSession) -> str:
    """
    Produces a live database context snippet for the chatbot by:
      1. Extracting the current DB schema dynamically.
      2. Asking Groq LLM to generate a safe SQL SELECT query.
      3. Validating the query is read-only.
      4. Executing it on the current DB session.
      5. Returning results as a compact JSON string (max 50 rows).

    Returns "" on any error so the chat never fails.
    """
    try:
        # Step 1: Get schema
        schema = get_db_schema()

        # Step 2: Generate SQL
        sql_query = await generate_sql(user_query, schema)

        if not sql_query or sql_query.strip().upper() == "NONE" or not sql_query.strip():
            return ""

        # Step 3: Strict readonly guard
        sql_clean = sql_query.strip().lower()
        if not sql_clean.startswith("select"):
            logger.warning(f"Blocked non-SELECT: {sql_query!r}")
            return ""

        blocked = ["insert", "update", "delete", "drop", "alter", "truncate",
                   "create", "replace", "grant", "revoke", "execute", "call"]
        for kw in blocked:
            # match whole word to avoid false positives inside column/table names
            import re
            if re.search(rf"\b{kw}\b", sql_clean):
                logger.warning(f"Blocked unsafe keyword '{kw}' in: {sql_query!r}")
                return ""

        # Step 4: Execute in an isolated savepoint so errors don't abort the outer tx
        logger.info(f"Live DB context SQL: {sql_query!r}")
        try:
            result = await db.execute(text(sql_query))
            rows = [dict(row) for row in result.mappings().all()[:50]]
        except Exception as exec_err:
            logger.error(f"SQL execution error: {exec_err} | query: {sql_query!r}")
            await db.rollback()
            return ""

        if not rows:
            return "[]"  # Empty result — still valid context

        return json.dumps(rows, cls=DBContextEncoder)

    except Exception as e:
        logger.error(f"get_db_context failed: {e}", exc_info=True)
        return ""

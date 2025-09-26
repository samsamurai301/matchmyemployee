# app/main.py

from fastapi import FastAPI, UploadFile, Form, HTTPException, Query
from pydantic import BaseModel
import httpx
import pdfplumber
import docx
import os
import json
from typing import List, Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE = "https://openrouter.ai/api/v1"

app = FastAPI(title="Resume Analysis API with Model Selection")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------
# Pydantic Schemas
# ----------------------------
class ModelPricing(BaseModel):
    prompt: Optional[str] = None
    completion: Optional[str] = None
    request: Optional[str] = None
    image: Optional[str] = None
    web_search: Optional[str] = None
    internal_reasoning: Optional[str] = None
    input_cache_read: Optional[str] = None
    input_cache_write: Optional[str] = None


class ModelInfo(BaseModel):
    id: str
    name: Optional[str]
    description: Optional[str]
    context_length: Optional[int]
    pricing: ModelPricing
    is_free: bool = False


class AnalysisRequest(BaseModel):
    resume_text: str
    job_posting: str
    model_id: Optional[str] = None


class AnalysisResponse(BaseModel):
    relevancy_score: Dict[str, Any]
    reliability_score: int
    learning_potential: int
    suspicious: str
    red_flags: List[str]
    key_achievements: Dict[str, List[str]]
    model_used: Optional[str] = None
    raw_llm_response: Optional[Any] = None


# ----------------------------
# File Parsers
# ----------------------------
def parse_pdf(file: UploadFile) -> str:
    text = ""
    with pdfplumber.open(file.file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


def parse_docx(file: UploadFile) -> str:
    doc = docx.Document(file.file)
    return "\n".join([p.text for p in doc.paragraphs])


# ----------------------------
# OpenRouter Model Listing
# ----------------------------
async def fetch_available_models() -> List[ModelInfo]:
    """
    Fetch model list from OpenRouter /models endpoint.
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{OPENROUTER_BASE}/models", headers=headers, timeout=30
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])

    models = []
    for m in data:
        pricing = ModelPricing(**m.get("pricing", {}))

        is_free = all(
            getattr(pricing, field) in (None, "0", "0.0")
            for field in pricing.__fields__.keys()
        )

        models.append(
            ModelInfo(
                id=m.get("id"),
                name=m.get("name"),
                description=m.get("description"),
                context_length=m.get("context_length"),
                pricing=pricing,
                is_free=is_free,
            )
        )
    return models


@app.get("/models", response_model=List[ModelInfo])
async def list_models():
    """
    Return the list of available OpenRouter models the user can choose from.
    """
    models = await fetch_available_models()
    return models


# ----------------------------
# OpenRouter LLM Call (with selected model)
# ----------------------------
async def analyze_with_llm(
    resume_text: str, job_posting: str, model_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calls OpenRouter API with structured prompt and returns JSON analysis.
    If model_id is provided, uses that; otherwise uses default.
    """
    prompt = f"""
                You are an AI resume analysis assistant. Analyze the following job description and candidate resume.

                JOB DESCRIPTION:
                {job_posting}

                CANDIDATE RESUME:
                {resume_text}

                Tasks:
                1. Compute a relevancy score (0-100) with breakdown:
                - Skill Match %
                - Experience Match %
                - Education Match %
                2. Assess reliability and learning potential:
                - Is the candidate consistent in skill acquisition and career progression?
                - Does their history suggest they are a fast learner?
                - Return a score (0-100).
                3. Identify suspicious or potentially false information:
                - List any red flags (exaggerated claims, missing details, vague buzzwords).
                - Return a binary value: Suspicious (Yes/No).
                4. Extract the candidate’s key achievements:
                - Which ones align directly with this job?
                - Which ones are transferable to other roles?

                Return result strictly in JSON:
                {{
                "relevancy_score": {{ "overall": X, "skills": X, "experience": X, "education": X }},
                "reliability_score": X,
                "learning_potential": X,
                "suspicious": "Yes/No",
                "red_flags": [ ... ],
                "key_achievements": {{
                    "directly_relevant": [ ... ],
                    "transferable": [ ... ]
                }}
                }}
            """

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    body: Dict[str, Any] = {
        "messages": [
            {"role": "system", "content": "You are a helpful resume analysis AI."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
    }
    if model_id:
        body["model"] = model_id

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{OPENROUTER_BASE}/chat/completions",
                headers=headers,
                json=body,
                timeout=60,
            )
            resp.raise_for_status()
            output = resp.json()
    except httpx.HTTPStatusError as e:
        return {
            "error": f"Model request failed with status {e.response.status_code}",
            "suggest_model_change": True,
        }
    except httpx.RequestError as e:
        return {
            "error": f"Network error: {str(e)}",
            "suggest_model_change": True,
        }

    choice = output.get("choices", [{}])[0]
    message = choice.get("message", {})
    content = message.get("content", "")

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return {
            "error": "LLM did not return valid JSON",
            "raw": content,
            "suggest_model_change": True,
        }

    return {**parsed, "model_used": output.get("model"), "raw_llm_response": content}


# ----------------------------
# API Endpoints
# ----------------------------
@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_resume(request: AnalysisRequest):
    result = await analyze_with_llm(
        request.resume_text, request.job_posting, request.model_id
    )
    if "error" in result:
        raise HTTPException(
            status_code=502,
            detail={
                "message": result["error"],
                "suggest_model_change": result.get("suggest_model_change", False),
            },
        )
    return result


@app.post("/analyze/file", response_model=AnalysisResponse)
async def analyze_resume_file(
    resume: UploadFile,
    job_posting: str = Form(...),
    model_id: Optional[str] = Form(None),
):
    fname = resume.filename.lower()
    if fname.endswith(".pdf"):
        resume_text = parse_pdf(resume)
    elif fname.endswith(".docx"):
        resume_text = parse_docx(resume)
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Only PDF or DOCX allowed.",
        )

    result = await analyze_with_llm(resume_text, job_posting, model_id)
    if "error" in result:
        raise HTTPException(
            status_code=502,
            detail={
                "message": result["error"],
                "suggest_model_change": result.get("suggest_model_change", False),
            },
        )
    return result

@app.get("/health")
async def healthcheck():
    return {"status": "ok"}

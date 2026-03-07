"""
Pydantic schemas package.
Exports all schemas for easy importing.
"""
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.schemas.assembly import AssemblyCreate, AssemblyUpdate, AssemblyResponse
from app.schemas.part import PartCreate, PartUpdate, PartResponse
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse, DocumentWithVersionResponse, DocumentVersionCreate, DocumentVersionResponse

__all__ = [
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
    "AssemblyCreate",
    "AssemblyUpdate",
    "AssemblyResponse",
    "PartCreate",
    "PartUpdate",
    "PartResponse",
    "DocumentCreate",
    "DocumentUpdate",
    "DocumentResponse",
    "DocumentWithVersionResponse",
    "DocumentVersionCreate",
    "DocumentVersionResponse",
]


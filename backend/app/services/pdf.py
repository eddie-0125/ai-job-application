"""Backward-compatible re-export."""

from app.services.document_parser import extract_text_from_pdf

__all__ = ["extract_text_from_pdf"]

"""Lightweight BM25 RAG Service for incident resolution knowledge base.
Uses rank_bm25 instead of heavy ML libraries to stay within Render's 512MB RAM limit."""

import os
import logging
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)


class RAGService:
    """Lightweight BM25-based retrieval for incident runbooks."""

    def __init__(self):
        self.documents: List[dict] = []
        self.corpus: List[List[str]] = []
        self.bm25 = None
        self.is_loaded = False
        self.runbooks_dir = Path(__file__).parent / "runbooks"
        self._load_documents()

    def _load_documents(self):
        try:
            if not self.runbooks_dir.exists():
                logger.warning(f"Runbooks directory not found: {self.runbooks_dir}")
                return

            from rank_bm25 import BM25Okapi

            for md_file in sorted(self.runbooks_dir.glob("*.md")):
                text = md_file.read_text(encoding="utf-8")
                chunks = self._chunk_text(text, chunk_size=500)
                for chunk in chunks:
                    self.documents.append({"source": md_file.name, "text": chunk})
                    self.corpus.append(chunk.lower().split())

            if self.corpus:
                self.bm25 = BM25Okapi(self.corpus)
                self.is_loaded = True
                logger.info(f"BM25 RAG loaded: {len(self.documents)} chunks from {len(list(self.runbooks_dir.glob('*.md')))} runbooks")
            else:
                logger.warning("No runbook content found")
        except Exception as e:
            logger.error(f"RAG load error: {e}")
            self.is_loaded = False

    def _chunk_text(self, text: str, chunk_size: int = 500) -> List[str]:
        paragraphs = text.split("\n\n")
        chunks = []
        current = ""
        for para in paragraphs:
            if len(current) + len(para) > chunk_size and current:
                chunks.append(current.strip())
                current = para
            else:
                current = current + "\n\n" + para if current else para
        if current.strip():
            chunks.append(current.strip())
        return chunks

    def retrieve(self, query: str, top_k: int = 3) -> str:
        if not self.is_loaded or self.bm25 is None:
            return "No runbook context available. Provide general IT troubleshooting advice."

        try:
            tokenized_query = query.lower().split()
            scores = self.bm25.get_scores(tokenized_query)

            top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

            parts = []
            for idx in top_indices:
                if scores[idx] > 0:
                    doc = self.documents[idx]
                    parts.append(f"[{doc['source']}]\n{doc['text']}")

            if not parts:
                return "No relevant runbook entries found. Provide general IT troubleshooting advice."

            return "\n---\n".join(parts)
        except Exception as e:
            logger.error(f"RAG retrieve error: {e}")
            return "Error retrieving runbook context. Provide general IT troubleshooting advice."

"""RAG Service using LlamaIndex and FAISS for incident resolution knowledge base"""

import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

class RAGService:
    """Retrieval Augmented Generation service for incident runbooks"""
    
    def __init__(self):
        self.index = None
        self.is_loaded = False
        self.runbooks_dir = Path(__file__).parent / 'runbooks'
        
    def load_documents(self):
        """Load runbook documents and create FAISS index"""
        try:
            logger.info("Loading runbook documents for RAG...")
            
            # Import LlamaIndex components
            from llama_index.core import (
                SimpleDirectoryReader,
                VectorStoreIndex,
                Settings
            )
            from llama_index.embeddings.huggingface import HuggingFaceEmbedding
            
            # Configure embedding model (local, no API needed)
            embed_model = HuggingFaceEmbedding(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
            Settings.embed_model = embed_model
            Settings.llm = None  # We'll use external LLM
            
            # Check if runbooks directory exists
            if not self.runbooks_dir.exists():
                logger.warning(f"Runbooks directory not found: {self.runbooks_dir}")
                self.is_loaded = False
                return
            
            # Load documents
            documents = SimpleDirectoryReader(
                input_dir=str(self.runbooks_dir),
                required_exts=[".md"],
                recursive=True
            ).load_data()
            
            if not documents:
                logger.warning("No runbook documents found")
                self.is_loaded = False
                return
            
            logger.info(f"Loaded {len(documents)} runbook documents")
            
            # Create vector index
            self.index = VectorStoreIndex.from_documents(
                documents,
                show_progress=True
            )
            
            self.is_loaded = True
            logger.info("RAG index created successfully")
            
        except Exception as e:
            logger.error(f"Error loading RAG documents: {str(e)}")
            self.is_loaded = False
    
    def get_relevant_context(self, query: str, top_k: int = 3) -> str:
        """Retrieve relevant context from runbooks for a given query"""
        if not self.is_loaded or self.index is None:
            logger.warning("RAG index not loaded, returning generic context")
            return "No runbook context available. Provide general IT troubleshooting advice."
        
        try:
            # Create retriever
            retriever = self.index.as_retriever(
                similarity_top_k=top_k
            )
            
            # Retrieve relevant nodes
            nodes = retriever.retrieve(query)
            
            if not nodes:
                return "No relevant runbook entries found. Provide general IT troubleshooting advice."
            
            # Combine context from retrieved nodes
            context_parts = []
            for i, node in enumerate(nodes, 1):
                source = node.metadata.get('file_name', 'Unknown')
                context_parts.append(
                    f"[Source {i}: {source}]\n{node.text}\n"
                )
            
            return "\n---\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Error retrieving context: {str(e)}")
            return "Error retrieving runbook context. Provide general IT troubleshooting advice."

"""
Type definitions and data structures for Anthropic Claude AI integration.
Provides comprehensive validation and performance tracking capabilities.

Version: 1.0
Python: 3.11+
"""

from dataclasses import dataclass
from typing import TypedDict, Literal, Optional, List

# Supported Anthropic model versions with performance characteristics
SUPPORTED_MODELS = ["claude-2", "claude-instant-1"]

# Default configuration values optimized for requirement parsing
DEFAULT_MODEL = "claude-2"  # Most capable model for complex requirement analysis
DEFAULT_TEMPERATURE = 0.7   # Balanced between creativity and consistency
DEFAULT_MAX_TOKENS = 4096   # Sufficient for most requirement documents

# Valid requirement classification types
REQUIREMENT_TYPES = ["functional", "non_functional", "technical", "business"]
RequirementType = Literal["functional", "non_functional", "technical", "business"]

@dataclass(slots=True, frozen=True)
class AnthropicModelConfig:
    """
    Configuration settings for Anthropic Claude AI model with performance optimization parameters.
    Uses slots and frozen dataclass for memory efficiency and immutability.
    """
    model_version: str
    temperature: float
    max_tokens: int

    def __post_init__(self):
        """Validate configuration parameters with detailed error messages."""
        if self.model_version not in SUPPORTED_MODELS:
            raise ValueError(
                f"Invalid model version: {self.model_version}. "
                f"Supported models: {', '.join(SUPPORTED_MODELS)}"
            )
        
        if not 0 <= self.temperature <= 1:
            raise ValueError(
                f"Temperature must be between 0 and 1, got: {self.temperature}"
            )
        
        if self.max_tokens <= 0:
            raise ValueError(
                f"max_tokens must be positive, got: {self.max_tokens}"
            )
        
        # Model-specific token limits
        if self.model_version == "claude-2" and self.max_tokens > 100000:
            raise ValueError("claude-2 has a maximum token limit of 100000")
        elif self.model_version == "claude-instant-1" and self.max_tokens > 50000:
            raise ValueError("claude-instant-1 has a maximum token limit of 50000")

class RequirementParseRequest(TypedDict):
    """
    Type definition for requirement parsing request with multi-document support.
    Includes optional configuration for model customization.
    """
    raw_text: str  # Primary requirement text to be parsed
    documents: list[str]  # Additional context documents
    config: Optional[AnthropicModelConfig]  # Optional model configuration

class ParsedRequirement(TypedDict):
    """
    Type definition for parsed requirement structure with source tracking 
    and confidence scoring.
    """
    type: RequirementType  # Classified requirement type
    description: str  # Parsed requirement description
    priority: int  # Requirement priority (1-5)
    mandatory: bool  # Whether requirement is mandatory
    source_document: Optional[str]  # Source document reference
    confidence: float  # AI confidence score (0-1)

class RequirementParseResponse(TypedDict):
    """
    Type definition for requirement parsing response with detailed performance metrics.
    Includes processing time and token usage for optimization.
    """
    requirements: list[ParsedRequirement]  # List of parsed requirements
    confidence_score: float  # Overall confidence score (0-1)
    processing_time: float  # Processing time in seconds
    model_version: str  # Anthropic model version used
    total_tokens_used: int  # Total tokens consumed
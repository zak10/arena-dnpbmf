"""
Initialization module for Anthropic Claude AI integration.

Provides secure client initialization, type definitions, error handling, and performance monitoring 
for the Arena MVP platform's AI-powered requirement parsing capabilities.

Version: 1.0.0
Python: 3.11+
Dependencies:
- cryptography==41.0.0
"""

from typing import Dict, Optional, Any

# Internal imports
from integrations.anthropic.client import AnthropicClient
from integrations.anthropic.types import (
    AnthropicModelConfig,
    RequirementParseRequest,
    RequirementParseResponse,
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
    DEFAULT_TEMPERATURE,
    DEFAULT_MAX_TOKENS
)
from integrations.anthropic.exceptions import (
    AnthropicError,
    AnthropicAPIError,
    AnthropicTimeoutError,
    AnthropicParseError
)
from core.constants import PERFORMANCE_THRESHOLDS
from core.utils.encryption import EncryptionContext, EncryptionError

# Version information
__version__ = "0.1.0"

# Error code mapping for Anthropic integration
ANTHROPIC_ERROR_CODES: Dict[str, str] = {
    "E4001": "AI processing failed",
    "E4002": "Rate limit exceeded",
    "E4003": "Invalid response format",
    "E4004": "Timeout error",
    "E4005": "API key error",
    "E4006": "Model configuration error",
    "E4007": "Request validation error",
    "E4008": "Response parsing error"
}

# Performance monitoring thresholds
PERFORMANCE_THRESHOLDS: Dict[str, float] = {
    "max_processing_time": PERFORMANCE_THRESHOLDS["AI_PROCESSING_TIME_MS"] / 1000,  # Convert to seconds
    "critical_processing_time": PERFORMANCE_THRESHOLDS["CRITICAL_AI_PROCESSING_TIME_MS"] / 1000,
    "min_confidence_score": 0.7,  # Minimum acceptable confidence score
    "optimal_confidence_score": 0.9,  # Target confidence score
    "max_token_usage": DEFAULT_MAX_TOKENS * 0.9,  # 90% of max tokens
    "rate_limit_buffer": 0.1  # 10% buffer for rate limits
}

def create_client(
    api_key: str,
    model_config: Optional[AnthropicModelConfig] = None
) -> AnthropicClient:
    """
    Create a secure Anthropic client instance with encrypted API key storage.

    Args:
        api_key: Anthropic API key
        model_config: Optional model configuration settings

    Returns:
        Configured AnthropicClient instance

    Raises:
        AnthropicError: If client initialization fails
        EncryptionError: If API key encryption fails
    """
    try:
        # Encrypt API key using AWS KMS
        with EncryptionContext(api_key, DataClassification.HIGHLY_SENSITIVE) as encrypted_key:
            # Initialize client with encrypted key and optional config
            client = AnthropicClient(
                api_key=encrypted_key,
                model_config=model_config or AnthropicModelConfig(
                    model_version=DEFAULT_MODEL,
                    temperature=DEFAULT_TEMPERATURE,
                    max_tokens=DEFAULT_MAX_TOKENS
                )
            )
            
            # Initialize secure client connection
            client.initialize_secure()
            
            return client

    except EncryptionError as e:
        raise AnthropicError(
            message="Failed to securely store API key",
            code="E4005",
            details={"error": str(e)}
        )
    except Exception as e:
        raise AnthropicError(
            message=f"Failed to initialize Anthropic client: {str(e)}",
            code="E4001"
        )

# Export public interface
__all__ = [
    # Main client
    'AnthropicClient',
    'create_client',
    
    # Configuration
    'AnthropicModelConfig',
    'SUPPORTED_MODELS',
    'DEFAULT_MODEL',
    'DEFAULT_TEMPERATURE',
    'DEFAULT_MAX_TOKENS',
    'PERFORMANCE_THRESHOLDS',
    
    # Type definitions
    'RequirementParseRequest',
    'RequirementParseResponse',
    
    # Error handling
    'AnthropicError',
    'AnthropicAPIError', 
    'AnthropicTimeoutError',
    'AnthropicParseError',
    'ANTHROPIC_ERROR_CODES',
    
    # Version
    '__version__'
]
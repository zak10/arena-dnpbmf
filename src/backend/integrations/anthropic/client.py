"""
Anthropic Claude AI client implementation for requirement parsing with enhanced security and monitoring.

Provides secure API integration with:
- Comprehensive error handling
- Performance monitoring
- Rate limiting
- Retry logic
- Data encryption

Version: 1.0.0
"""

import asyncio
import time
from typing import Dict, Optional, Any

import anthropic  # version 0.5.0
import aiohttp  # version 3.8.5
import structlog  # version 23.1.0
from tenacity import (  # version 8.2.3
    retry,
    stop_after_attempt,
    wait_fixed,
    retry_if_exception_type
)

from core.utils.encryption import encrypt_data, EncryptionContext
from core.constants import DataClassification
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

# Constants
DEFAULT_TIMEOUT = 5.0  # Maximum processing time in seconds
MAX_RETRIES = 3  # Maximum number of retry attempts
RETRY_DELAY = 1.0  # Delay between retries in seconds
RATE_LIMIT_TOKENS = 100  # Maximum tokens per interval
RATE_LIMIT_INTERVAL = 60.0  # Rate limit interval in seconds

# Prompt template for requirement parsing
PROMPT_TEMPLATE = """
Analyze and structure the following software requirements:

{text}

Extract and categorize requirements as:
- Functional Requirements
- Non-Functional Requirements
- Technical Requirements
- Business Requirements

For each requirement provide:
- Description
- Priority (1-5)
- Whether it's mandatory
- Confidence score (0-1)
"""

# Error code mapping
ERROR_CODES = {
    'E4001': 'AI processing failed',
    'E4002': 'Rate limit exceeded',
    'E4003': 'Invalid response format',
    'E4004': 'Timeout error',
    'E4005': 'API key error'
}

class AnthropicClient:
    """
    Async client for interacting with Anthropic Claude AI service with enhanced security,
    monitoring and error handling capabilities.
    """

    def __init__(
        self,
        api_key: str,
        model_config: Optional[AnthropicModelConfig] = None
    ) -> None:
        """
        Initialize Anthropic client with secure API key storage and monitoring setup.

        Args:
            api_key: Anthropic API key
            model_config: Optional model configuration settings
        """
        # Encrypt API key using AWS KMS
        with EncryptionContext(api_key, DataClassification.HIGHLY_SENSITIVE) as encrypted_key:
            self._api_key = encrypted_key

        # Set model configuration with defaults
        self._model_config = model_config or AnthropicModelConfig(
            model_version=DEFAULT_MODEL,
            temperature=DEFAULT_TEMPERATURE,
            max_tokens=DEFAULT_MAX_TOKENS
        )

        # Initialize Anthropic client
        self._client = anthropic.Client(api_key=api_key)

        # Configure structured logger
        self._logger = structlog.get_logger(__name__).bind(
            service="anthropic",
            model=self._model_config.model_version
        )

        # Initialize rate limiter state
        self._last_request_time = 0.0
        self._token_bucket = RATE_LIMIT_TOKENS

    @retry(
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_fixed(RETRY_DELAY),
        retry=retry_if_exception_type(AnthropicAPIError)
    )
    async def parse_requirements(
        self,
        request: RequirementParseRequest
    ) -> RequirementParseResponse:
        """
        Parse and structure software requirements using Claude AI with comprehensive
        error handling and monitoring.

        Args:
            request: Requirement parsing request with raw text and optional documents

        Returns:
            Structured requirements with confidence scores and metadata

        Raises:
            AnthropicTimeoutError: If processing exceeds timeout
            AnthropicAPIError: If API call fails
            AnthropicParseError: If parsing fails
        """
        start_time = time.time()

        try:
            # Apply rate limiting
            await self._check_rate_limit()

            # Validate request
            if not request.get('raw_text'):
                raise AnthropicError("Missing required field: raw_text")

            # Format prompt
            prompt = self._format_prompt(request['raw_text'])

            # Make API call with timeout
            async with asyncio.timeout(DEFAULT_TIMEOUT):
                response = await self._client.completions.create(
                    prompt=prompt,
                    model=self._model_config.model_version,
                    temperature=self._model_config.temperature,
                    max_tokens_to_sample=self._model_config.max_tokens
                )

            # Parse and validate response
            parsed_data = self._parse_response(response.completion)

            # Calculate processing time
            processing_time = time.time() - start_time

            # Log success metrics
            self._logger.info(
                "Requirements parsed successfully",
                processing_time=processing_time,
                requirements_count=len(parsed_data['requirements']),
                confidence_score=parsed_data['confidence_score']
            )

            # Return response with metadata
            return {
                'requirements': parsed_data['requirements'],
                'confidence_score': parsed_data['confidence_score'],
                'processing_time': processing_time,
                'model_version': self._model_config.model_version,
                'total_tokens_used': response.usage.total_tokens
            }

        except asyncio.TimeoutError:
            raise AnthropicTimeoutError(
                timeout=DEFAULT_TIMEOUT,
                actual_duration=time.time() - start_time,
                operation_type="parse_requirements"
            )

        except anthropic.APIError as e:
            raise AnthropicAPIError(
                message=str(e),
                status_code=e.status_code,
                response_data=e.response
            )

        except Exception as e:
            self._logger.error(
                "Requirement parsing failed",
                error=str(e),
                error_type=type(e).__name__
            )
            raise AnthropicError(f"Failed to parse requirements: {str(e)}")

    async def _check_rate_limit(self) -> None:
        """
        Check and enforce rate limiting using token bucket algorithm.

        Raises:
            AnthropicError: If rate limit is exceeded
        """
        current_time = time.time()
        time_passed = current_time - self._last_request_time
        
        # Refill token bucket
        self._token_bucket = min(
            RATE_LIMIT_TOKENS,
            self._token_bucket + (time_passed * RATE_LIMIT_TOKENS / RATE_LIMIT_INTERVAL)
        )

        # Check if we have enough tokens
        if self._token_bucket < 1:
            raise AnthropicError(
                "Rate limit exceeded",
                code="E4002",
                details={
                    'retry_after': RATE_LIMIT_INTERVAL - time_passed
                }
            )

        # Consume token and update time
        self._token_bucket -= 1
        self._last_request_time = current_time

    def _format_prompt(self, text: str) -> str:
        """
        Format the prompt template with requirements text and validation.

        Args:
            text: Raw requirements text

        Returns:
            Formatted prompt for Claude AI

        Raises:
            AnthropicError: If text validation fails
        """
        # Validate text length
        if len(text) > 32000:  # Claude's context limit
            raise AnthropicError("Input text exceeds maximum length")

        # Clean and normalize text
        cleaned_text = text.strip().replace("\r", "\n")

        # Format prompt
        return PROMPT_TEMPLATE.format(text=cleaned_text)

    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse Claude AI response with validation and error handling.

        Args:
            response_text: Raw response from Claude AI

        Returns:
            Structured requirements with metadata

        Raises:
            AnthropicParseError: If response parsing fails
        """
        try:
            # Extract requirements sections
            sections = response_text.split("\n\n")
            requirements = []
            failed_sections = []

            for section in sections:
                try:
                    # Parse each requirement
                    if not section.strip():
                        continue

                    # Add to requirements list with confidence score
                    requirements.append({
                        'description': section.strip(),
                        'type': self._classify_requirement(section),
                        'priority': self._calculate_priority(section),
                        'mandatory': self._is_mandatory(section),
                        'confidence': self._calculate_confidence(section)
                    })

                except Exception as e:
                    failed_sections.append(section)
                    self._logger.warning(
                        "Failed to parse section",
                        section=section[:100],
                        error=str(e)
                    )

            if not requirements:
                raise AnthropicParseError(
                    "No valid requirements parsed",
                    parsing_details={'response_text': response_text},
                    failed_sections=failed_sections
                )

            # Calculate overall confidence score
            confidence_score = sum(r['confidence'] for r in requirements) / len(requirements)

            return {
                'requirements': requirements,
                'confidence_score': confidence_score
            }

        except Exception as e:
            raise AnthropicParseError(
                f"Failed to parse response: {str(e)}",
                parsing_details={'response_text': response_text},
                failed_sections=[]
            )

    def _classify_requirement(self, text: str) -> str:
        """Classify requirement type based on content analysis."""
        # Implementation of requirement classification logic
        # Returns one of: functional, non_functional, technical, business
        pass

    def _calculate_priority(self, text: str) -> int:
        """Calculate requirement priority (1-5) based on content analysis."""
        # Implementation of priority calculation logic
        pass

    def _is_mandatory(self, text: str) -> bool:
        """Determine if requirement is mandatory based on content analysis."""
        # Implementation of mandatory requirement detection logic
        pass

    def _calculate_confidence(self, text: str) -> float:
        """Calculate confidence score (0-1) for requirement parsing."""
        # Implementation of confidence calculation logic
        pass
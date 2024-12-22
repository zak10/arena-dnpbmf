"""
Python package initialization file for the proposals app test suite.

This module exposes test factories and utilities for proposal-related testing
with proper data classification controls.

Version: 1.0.0
"""

from proposals.tests.factories import (
    ProposalFactory,
    ProposalDocumentFactory
)

__all__ = [
    'ProposalFactory',
    'ProposalDocumentFactory'
]
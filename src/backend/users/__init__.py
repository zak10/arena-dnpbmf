"""
Package initialization file for the users app providing secure user management functionality.

This module exports:
- User model with role-based access control
- UserService for secure authentication and profile management
- User creation functionality with data validation

Version: 1.0.0
"""

from users.models import User
from users.services import UserService

# Configure default app settings
default_app_config = 'users.apps.UsersConfig'

# Export public interface with secure user management functionality
__all__ = [
    'User',           # User model with role-based access
    'UserService',    # Service for user management and authentication
]

# Version information
VERSION = '1.0.0'

def create_user(email: str, role: str, **extra_fields) -> User:
    """
    Create a new user with secure role assignment and data validation.

    Args:
        email (str): User's business email address
        role (str): User role (buyer/arena_staff)
        **extra_fields: Additional user fields like full_name, company

    Returns:
        User: Created user instance

    Raises:
        ValidationError: If email or role is invalid
    """
    user_service = UserService()
    
    # Validate business email
    if not user_service.validate_business_email(email):
        raise ValidationError('Invalid business email domain')
        
    # Create user with appropriate role
    if role == 'buyer':
        user = User.objects.create_buyer(
            email=email,
            **extra_fields
        )
    elif role == 'arena_staff':
        user = User.objects.create_staff(
            email=email,
            **extra_fields
        )
    else:
        raise ValidationError(f'Invalid role: {role}')
        
    return user
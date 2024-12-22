"""
User models for Arena MVP implementing secure user management with role-based access control.

This module provides:
- Custom user model with email authentication
- Role-based access control (buyer/staff)
- Secure data storage with classification
- User management functionality

Version: 1.0.0
"""

from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator
from core.models.base import BaseModel
from core.constants import DataClassification

# Role definitions
USER_ROLES = {
    'BUYER': 'buyer',
    'ARENA_STAFF': 'arena_staff'
}

class UserManager(BaseUserManager):
    """
    Custom user manager implementing secure user creation with role-based factory methods.
    """
    
    def create_user(self, email, role, password=None, **extra_fields):
        """
        Create and save a new user with email, role and security settings.
        
        Args:
            email (str): User's business email address
            role (str): User role (buyer/arena_staff)
            password (str, optional): User password for non-OAuth users
            **extra_fields: Additional user fields
            
        Returns:
            User: Created user instance
            
        Raises:
            ValidationError: If email or role is invalid
        """
        if not email:
            raise ValidationError('Email address is required')
            
        # Validate and normalize email
        email_validator = EmailValidator()
        try:
            email_validator(email)
            email = self.normalize_email(email)
        except ValidationError as e:
            raise ValidationError('Invalid email address') from e
            
        # Validate role
        if role not in USER_ROLES.values():
            raise ValidationError(f'Invalid role: {role}')
            
        # Create user instance
        user = self.model(
            email=email,
            role=role,
            data_classification=DataClassification.HIGHLY_SENSITIVE.value,
            **extra_fields
        )
        
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
            
        # Save user with security settings
        user.save(using=self._db)
        return user
        
    def create_buyer(self, email, **extra_fields):
        """
        Create a new buyer user with appropriate permissions.
        
        Args:
            email (str): Buyer's business email
            **extra_fields: Additional user fields
            
        Returns:
            User: Created buyer instance
        """
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        
        return self.create_user(
            email=email,
            role=USER_ROLES['BUYER'],
            **extra_fields
        )
        
    def create_staff(self, email, **extra_fields):
        """
        Create a new Arena staff user with elevated permissions.
        
        Args:
            email (str): Staff member's email
            **extra_fields: Additional user fields
            
        Returns:
            User: Created staff instance
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', False)
        
        return self.create_user(
            email=email,
            role=USER_ROLES['ARENA_STAFF'],
            **extra_fields
        )

class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """
    Custom user model implementing secure authentication and role-based access control.
    
    Attributes:
        email (EmailField): Primary identifier and login field
        role (CharField): User role (buyer/arena_staff)
        full_name (CharField): User's full name
        company (CharField): User's company name
        is_active (BooleanField): Whether user account is active
        is_staff (BooleanField): Whether user has staff permissions
        last_login (DateTimeField): Last login timestamp
    """
    
    email = models.EmailField(
        'email address',
        unique=True,
        db_index=True,
        help_text='Business email address used for authentication'
    )
    
    role = models.CharField(
        max_length=20,
        choices=[(v, v) for v in USER_ROLES.values()],
        help_text='User role determining permissions and access'
    )
    
    full_name = models.CharField(
        max_length=255,
        help_text='User\'s full name'
    )
    
    company = models.CharField(
        max_length=255,
        help_text='User\'s company name'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this user account is active'
    )
    
    is_staff = models.BooleanField(
        default=False,
        help_text='Whether user can access admin interface'
    )
    
    # Configure user model settings
    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name', 'company', 'role']
    
    class Meta:
        verbose_name = 'user'
        verbose_name_plural = 'users'
        ordering = ['email']
        
    def __str__(self):
        return f'{self.email} ({self.role})'
        
    def clean(self):
        """Validate user data before saving."""
        super().clean()
        
        # Ensure data classification is highly sensitive
        if self.data_classification != DataClassification.HIGHLY_SENSITIVE.value:
            raise ValidationError('User data must be classified as highly sensitive')
            
    def save(self, *args, **kwargs):
        """Override save to enforce security controls."""
        # Set data classification
        self.data_classification = DataClassification.HIGHLY_SENSITIVE.value
        
        # Update last login if not set
        if not self.last_login:
            self.last_login = timezone.now()
            
        super().save(*args, **kwargs)
        
    def get_full_name(self):
        """Return user's full name."""
        return self.full_name
        
    def get_short_name(self):
        """Return user's email as short name."""
        return self.email
        
    def is_buyer(self):
        """Check if user has buyer role."""
        return self.role == USER_ROLES['BUYER']
        
    def is_arena_staff(self):
        """Check if user has staff role."""
        return self.role == USER_ROLES['ARENA_STAFF']
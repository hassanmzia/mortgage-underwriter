"""
User Models for Mortgage Underwriting System
Supports underwriters, reviewers, admins, and system accounts
"""
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Extended User model for mortgage underwriting system"""

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrator'
        SENIOR_UNDERWRITER = 'senior_underwriter', 'Senior Underwriter'
        UNDERWRITER = 'underwriter', 'Underwriter'
        JUNIOR_UNDERWRITER = 'junior_underwriter', 'Junior Underwriter'
        REVIEWER = 'reviewer', 'Reviewer'
        PROCESSOR = 'processor', 'Loan Processor'
        VIEWER = 'viewer', 'Viewer'
        SYSTEM = 'system', 'System Account'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.VIEWER
    )
    department = models.CharField(max_length=100, blank=True)
    employee_id = models.CharField(max_length=50, blank=True, unique=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)

    # MFA fields
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=32, blank=True, null=True)

    # NMLS (Nationwide Multistate Licensing System) ID for licensed underwriters
    nmls_id = models.CharField(max_length=20, blank=True, null=True)

    # Underwriting limits
    max_loan_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True,
        help_text="Maximum loan amount this user can approve"
    )

    # Activity tracking
    last_activity = models.DateTimeField(null=True, blank=True)
    is_available = models.BooleanField(default=True)

    # Preferences
    notification_preferences = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    @property
    def can_approve_loans(self):
        """Check if user has loan approval privileges"""
        return self.role in [
            self.Role.ADMIN,
            self.Role.SENIOR_UNDERWRITER,
            self.Role.UNDERWRITER,
        ]

    @property
    def can_review_decisions(self):
        """Check if user can review and override AI decisions"""
        return self.role in [
            self.Role.ADMIN,
            self.Role.SENIOR_UNDERWRITER,
            self.Role.REVIEWER,
        ]


class UserActivity(models.Model):
    """Track user activities for audit purposes"""

    class ActionType(models.TextChoices):
        LOGIN = 'login', 'Login'
        LOGOUT = 'logout', 'Logout'
        VIEW_APPLICATION = 'view_application', 'View Application'
        EDIT_APPLICATION = 'edit_application', 'Edit Application'
        APPROVE = 'approve', 'Approve'
        DENY = 'deny', 'Deny'
        CONDITION = 'condition', 'Add Condition'
        OVERRIDE = 'override', 'Override AI Decision'
        COMMENT = 'comment', 'Add Comment'
        UPLOAD = 'upload', 'Upload Document'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=30, choices=ActionType.choices)
    resource_type = models.CharField(max_length=50, blank=True)
    resource_id = models.UUIDField(null=True, blank=True)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_activities'
        verbose_name = 'User Activity'
        verbose_name_plural = 'User Activities'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.action} at {self.timestamp}"

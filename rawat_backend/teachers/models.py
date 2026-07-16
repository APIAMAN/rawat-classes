from django.db import models
from django.conf import settings
from core.models import TimeStampedModel

class Teacher(TimeStampedModel):
    """
    Teacher profile model.
    Inherits from TimeStampedModel to get 'created_at' and 'updated_at' fields.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='teacher_profile'
    )
    employee_id = models.CharField(max_length=50, unique=True)
    phone = models.CharField(max_length=20)
    subject_specialization = models.CharField(max_length=100)
    qualification = models.CharField(max_length=100)
    joining_date = models.DateField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.employee_id})"

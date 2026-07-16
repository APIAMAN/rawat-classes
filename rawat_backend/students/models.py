from django.db import models
from django.conf import settings
from core.models import TimeStampedModel

class Student(TimeStampedModel):
    """
    Student profile model.
    Inherits from TimeStampedModel to get 'created_at' and 'updated_at' fields.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='student_profile'
    )
    enrollment_no = models.CharField(max_length=50, unique=True)
    phone = models.CharField(max_length=20)
    guardian_name = models.CharField(max_length=100)
    guardian_phone = models.CharField(max_length=20)
    date_of_birth = models.DateField()
    admission_date = models.DateField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.enrollment_no})"

class StudentBatchEnrollment(models.Model):
    """
    Through-table representing Student-to-Batch enrollments.
    Allows students to register in multiple batches over time.
    """
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    batch = models.ForeignKey(
        'batches.Batch',
        on_delete=models.CASCADE,
        related_name='student_enrollments'
    )
    enrolled_on = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('student', 'batch')

    def __str__(self):
        return f"{self.student.enrollment_no} -> {self.batch.name} (Active: {self.is_active})"

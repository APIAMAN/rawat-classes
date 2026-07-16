from django.db import models
from django.conf import settings
from core.models import TimeStampedModel


class AttendanceSession(models.Model):
    """
    Represents a single day's attendance session for a batch.
    unique_together on (batch, date) prevents duplicate sessions per day.
    """
    batch = models.ForeignKey(
        'batches.Batch',
        on_delete=models.CASCADE,
        related_name='attendance_sessions'
    )
    date = models.DateField()
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='marked_sessions'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('batch', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.batch.name} — {self.date}"


class AttendanceRecord(models.Model):
    """
    Individual student's attendance status for one session.
    unique_together on (session, student) prevents duplicate entries.
    """
    STATUS_CHOICES = [
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
        ('LATE', 'Late'),
        ('EXCUSED', 'Excused'),
    ]

    session = models.ForeignKey(
        AttendanceSession,
        on_delete=models.CASCADE,
        related_name='records'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='ABSENT'
    )

    class Meta:
        unique_together = ('session', 'student')

    def __str__(self):
        return f"{self.student.enrollment_no} — {self.session.date} — {self.status}"

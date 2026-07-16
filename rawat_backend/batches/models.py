from django.db import models
from core.models import TimeStampedModel

class Batch(TimeStampedModel):
    """
    Batch model.
    Inherits from TimeStampedModel to automatically track created_at and updated_at.
    """
    name = models.CharField(max_length=100)
    subject = models.CharField(max_length=100)
    teacher = models.ForeignKey(
        'teachers.Teacher',
        on_delete=models.PROTECT,
        related_name='batches'
    )
    start_date = models.DateField()
    end_date = models.DateField()
    capacity = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    @property
    def student_count(self):
        # Placeholder for Phase 4 where student relationships will be mapped
        return 0

    def __str__(self):
        return f"{self.name} ({self.subject})"

class Schedule(models.Model):
    """
    Weekly timing schedules for Batches.
    Supports multiple slots per batch (e.g. Mon 10:00-11:30 and Wed 10:00-11:30).
    """
    DAYS_OF_WEEK = (
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    )

    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        related_name='schedules'
    )
    day_of_week = models.CharField(max_length=20, choices=DAYS_OF_WEEK)
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return f"{self.batch.name} - {self.get_day_of_week_display()} ({self.start_time} to {self.end_time})"

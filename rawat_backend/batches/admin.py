from django.contrib import admin
from .models import Batch, Schedule

class ScheduleInline(admin.TabularInline):
    model = Schedule
    extra = 1

@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ('name', 'teacher', 'subject', 'is_active', 'student_count', 'start_date', 'end_date')
    list_filter = ('is_active', 'subject', 'teacher')
    search_fields = ('name', 'subject', 'teacher__user__username')
    inlines = [ScheduleInline]
    ordering = ('-created_at',)

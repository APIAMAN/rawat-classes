from django.contrib import admin
from core.admin import admin_site
from .models import Batch, Schedule
from students.models import StudentBatchEnrollment


class ScheduleInline(admin.TabularInline):
    model = Schedule
    extra = 1


class StudentEnrollmentInline(admin.TabularInline):
    model = StudentBatchEnrollment
    extra = 0
    raw_id_fields = ['student']
    readonly_fields = ['enrolled_on']


@admin.register(Batch, site=admin_site)
class BatchAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'teacher', 'capacity', 'is_active', 'student_count', 'start_date', 'end_date')
    list_filter = ('is_active', 'subject', 'teacher')
    search_fields = ('name', 'subject', 'teacher__employee_id', 'teacher__user__first_name', 'teacher__user__last_name')
    autocomplete_fields = ['teacher']
    inlines = [ScheduleInline, StudentEnrollmentInline]
    ordering = ('-created_at',)
    list_per_page = 25


@admin.register(Schedule, site=admin_site)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('batch', 'day_of_week', 'start_time', 'end_time')
    list_filter = ('day_of_week', 'batch')
    search_fields = ('batch__name', 'day_of_week')
    autocomplete_fields = ['batch']
    list_per_page = 25

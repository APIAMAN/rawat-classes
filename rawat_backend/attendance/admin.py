from django.contrib import admin
from .models import AttendanceSession, AttendanceRecord


class AttendanceRecordInline(admin.TabularInline):
    model = AttendanceRecord
    extra = 0
    readonly_fields = ['student', 'status']
    can_delete = False


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ['batch', 'date', 'marked_by', 'record_count', 'created_at']
    list_filter = ['batch', 'date']
    date_hierarchy = 'date'
    search_fields = ['batch__name', 'marked_by__username']
    inlines = [AttendanceRecordInline]

    def record_count(self, obj):
        return obj.records.count()
    record_count.short_description = 'Students'


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ['session', 'student', 'status', 'session_date']
    list_filter = ['status', 'session__date', 'session__batch']
    search_fields = [
        'student__enrollment_no',
        'student__user__first_name',
        'student__user__last_name',
    ]
    date_hierarchy = 'session__date'

    def session_date(self, obj):
        return obj.session.date
    session_date.short_description = 'Date'
    session_date.admin_order_field = 'session__date'

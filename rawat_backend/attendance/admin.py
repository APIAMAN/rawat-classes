from django.contrib import admin
from core.admin import admin_site
from .models import AttendanceSession, AttendanceRecord


class AttendanceRecordInline(admin.TabularInline):
    model = AttendanceRecord
    extra = 0
    raw_id_fields = ['student']
    readonly_fields = ['status']
    can_delete = False


@admin.register(AttendanceSession, site=admin_site)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ('batch', 'date', 'marked_by', 'record_count', 'created_at')
    list_filter = ('batch', 'date')
    date_hierarchy = 'date'
    search_fields = ('batch__name', 'marked_by__username', 'marked_by__first_name', 'marked_by__last_name')
    autocomplete_fields = ['batch', 'marked_by']
    inlines = [AttendanceRecordInline]
    list_per_page = 25

    def record_count(self, obj):
        return obj.records.count()
    record_count.short_description = 'Students Count'


@admin.register(AttendanceRecord, site=admin_site)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('session', 'student', 'status', 'session_date')
    list_filter = ('status', 'session__date', 'session__batch')
    search_fields = ('student__enrollment_no', 'student__user__first_name', 'student__user__last_name', 'session__batch__name')
    date_hierarchy = 'session__date'
    autocomplete_fields = ['session', 'student']
    list_per_page = 25

    def session_date(self, obj):
        return obj.session.date
    session_date.short_description = 'Date'
    session_date.admin_order_field = 'session__date'

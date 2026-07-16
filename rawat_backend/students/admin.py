from django.contrib import admin
from core.admin import admin_site
from .models import Student, StudentBatchEnrollment


class EnrollmentInline(admin.TabularInline):
    model = StudentBatchEnrollment
    extra = 1
    autocomplete_fields = ['batch']


@admin.register(Student, site=admin_site)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('enrollment_no', 'get_name', 'phone', 'guardian_name', 'guardian_phone', 'get_active_batches', 'is_active', 'admission_date')
    list_filter = ('is_active', 'enrollments__batch')
    search_fields = ('enrollment_no', 'phone', 'guardian_name', 'guardian_phone', 'user__username', 'user__first_name', 'user__last_name')
    autocomplete_fields = ['user']
    inlines = [EnrollmentInline]
    ordering = ('enrollment_no',)
    list_per_page = 25

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    get_name.short_description = 'Name'

    def get_active_batches(self, obj):
        active_enr = obj.enrollments.filter(is_active=True).select_related('batch')
        return ", ".join([e.batch.name for e in active_enr]) or "No active batches"
    get_active_batches.short_description = 'Active Batches'


@admin.register(StudentBatchEnrollment, site=admin_site)
class StudentBatchEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'batch', 'enrolled_on', 'is_active')
    list_filter = ('is_active', 'batch', 'enrolled_on')
    search_fields = ('student__enrollment_no', 'student__user__first_name', 'student__user__last_name', 'batch__name')
    autocomplete_fields = ['student', 'batch']
    list_per_page = 25

from django.contrib import admin
from .models import Student, StudentBatchEnrollment

class EnrollmentInline(admin.TabularInline):
    model = StudentBatchEnrollment
    extra = 1

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('enrollment_no', 'get_name', 'get_active_batches', 'is_active', 'admission_date')
    list_filter = ('is_active', 'enrollments__batch')
    search_fields = ('enrollment_no', 'user__username', 'user__first_name', 'user__last_name')
    inlines = [EnrollmentInline]
    ordering = ('enrollment_no',)

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    get_name.short_description = 'Name'

    def get_active_batches(self, obj):
        active_enr = obj.enrollments.filter(is_active=True).select_related('batch')
        return ", ".join([e.batch.name for e in active_enr]) or "No active batches"
    get_active_batches.short_description = 'Active Batches'

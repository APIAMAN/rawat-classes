from django.contrib import admin
from .models import Teacher

@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ('get_name', 'employee_id', 'subject_specialization', 'is_active', 'joining_date')
    list_filter = ('is_active', 'subject_specialization')
    search_fields = ('employee_id', 'user__username', 'user__first_name', 'user__last_name')
    ordering = ('employee_id',)

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    get_name.short_description = 'Name'

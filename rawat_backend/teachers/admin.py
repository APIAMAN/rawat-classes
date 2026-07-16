from django.contrib import admin
from core.admin import admin_site
from .models import Teacher


@admin.register(Teacher, site=admin_site)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ('get_name', 'employee_id', 'subject_specialization', 'phone', 'is_active', 'joining_date')
    list_filter = ('is_active', 'subject_specialization')
    search_fields = ('employee_id', 'phone', 'user__username', 'user__first_name', 'user__last_name')
    autocomplete_fields = ['user']
    ordering = ('employee_id',)
    list_per_page = 25

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    get_name.short_description = 'Name'

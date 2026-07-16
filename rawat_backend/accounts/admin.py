from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from core.admin import admin_site
from .models import User


@admin.register(User, site=admin_site)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)
    list_per_page = 25

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role Configuration', {'fields': ('role',)}),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Role Configuration', {'fields': ('role',)}),
    )

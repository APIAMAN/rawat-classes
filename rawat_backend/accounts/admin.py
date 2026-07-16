from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email')
    ordering = ('username',)

    # Display the role field in the admin panel edit page
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role Configuration', {'fields': ('role',)}),
    )
    
    # Display the role field when creating a user in the admin panel
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Role Configuration', {'fields': ('role',)}),
    )

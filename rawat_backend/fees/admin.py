from django.contrib import admin
from core.admin import admin_site
from .models import FeeStructure, FeeInvoice, FeePayment


class FeePaymentInline(admin.TabularInline):
    model = FeePayment
    extra = 0
    raw_id_fields = ['received_by']
    readonly_fields = ['payment_date']


@admin.register(FeeStructure, site=admin_site)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display = ('batch', 'student', 'amount', 'frequency', 'effective_from', 'created_at')
    list_filter = ('frequency', 'batch', 'effective_from')
    search_fields = ('batch__name', 'student__enrollment_no', 'student__user__first_name', 'student__user__last_name')
    autocomplete_fields = ['batch', 'student']
    date_hierarchy = 'effective_from'
    list_per_page = 25


@admin.register(FeeInvoice, site=admin_site)
class FeeInvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'batch', 'amount_due', 'amount_paid_display', 'balance_due_display', 'due_date', 'status', 'created_at')
    list_filter = ('status', 'batch', 'due_date')
    search_fields = ('id', 'student__enrollment_no', 'student__user__first_name', 'student__user__last_name', 'batch__name')
    autocomplete_fields = ['student', 'batch']
    date_hierarchy = 'due_date'
    inlines = [FeePaymentInline]
    list_per_page = 25

    def amount_paid_display(self, obj):
        return f"₹{obj.amount_paid}"
    amount_paid_display.short_description = 'Paid'

    def balance_due_display(self, obj):
        return f"₹{obj.balance_due}"
    balance_due_display.short_description = 'Balance'


@admin.register(FeePayment, site=admin_site)
class FeePaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'invoice', 'amount_paid', 'payment_mode', 'payment_date', 'received_by', 'created_at')
    list_filter = ('payment_mode', 'payment_date')
    search_fields = ('id', 'invoice__student__enrollment_no', 'invoice__student__user__first_name', 'invoice__student__user__last_name', 'remarks')
    autocomplete_fields = ['invoice', 'received_by']
    date_hierarchy = 'payment_date'
    list_per_page = 25

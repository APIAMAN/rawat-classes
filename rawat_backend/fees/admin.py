from django.contrib import admin
from .models import FeeStructure, FeeInvoice, FeePayment


class FeePaymentInline(admin.TabularInline):
    model = FeePayment
    extra = 0
    readonly_fields = ['received_by', 'payment_date']


@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display = ['batch', 'student', 'amount', 'frequency', 'effective_from', 'created_at']
    list_filter = ['frequency', 'batch', 'effective_from']
    search_fields = ['batch__name', 'student__enrollment_no', 'student__user__first_name', 'student__user__last_name']
    date_hierarchy = 'effective_from'


@admin.register(FeeInvoice)
class FeeInvoiceAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'batch', 'amount_due', 'amount_paid_display', 'balance_due_display', 'due_date', 'status', 'created_at']
    list_filter = ['status', 'batch', 'due_date']
    search_fields = ['student__enrollment_no', 'student__user__first_name', 'student__user__last_name', 'batch__name']
    date_hierarchy = 'due_date'
    inlines = [FeePaymentInline]

    def amount_paid_display(self, obj):
        return f"₹{obj.amount_paid}"
    amount_paid_display.short_description = 'Paid'

    def balance_due_display(self, obj):
        return f"₹{obj.balance_due}"
    balance_due_display.short_description = 'Balance'


@admin.register(FeePayment)
class FeePaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'invoice', 'amount_paid', 'payment_mode', 'payment_date', 'received_by', 'created_at']
    list_filter = ['payment_mode', 'payment_date']
    search_fields = ['invoice__student__enrollment_no', 'invoice__student__user__first_name', 'remarks']
    date_hierarchy = 'payment_date'

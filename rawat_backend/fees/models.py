from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from core.models import TimeStampedModel


class FeeStructure(TimeStampedModel):
    """
    Fee structure template defined per batch or customized per student.
    Primary link is to Batch (standard pricing tier per course),
    with an optional Student override for scholarships or custom arrangements.
    """
    FREQUENCY_CHOICES = [
        ('MONTHLY', 'Monthly'),
        ('ONE_TIME', 'One Time'),
        ('QUARTERLY', 'Quarterly'),
    ]

    batch = models.ForeignKey(
        'batches.Batch',
        on_delete=models.CASCADE,
        related_name='fee_structures'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='custom_fee_structures',
        help_text="Optional student override for custom pricing/discounts"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default='MONTHLY'
    )
    effective_from = models.DateField()

    class Meta:
        ordering = ['-effective_from']

    def __str__(self):
        target = f"Student {self.student.enrollment_no}" if self.student else f"Batch {self.batch.name}"
        return f"{target} — ₹{self.amount} ({self.get_frequency_display()})"


class FeeInvoice(TimeStampedModel):
    """
    Represents a fee invoice issued to a student.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PARTIALLY_PAID', 'Partially Paid'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
    ]

    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    batch = models.ForeignKey(
        'batches.Batch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )

    class Meta:
        ordering = ['-due_date', '-created_at']

    @property
    def amount_paid(self):
        return sum(payment.amount_paid for payment in self.payments.all())

    @property
    def balance_due(self):
        return max(self.amount_due - self.amount_paid, 0)

    def update_status(self):
        """
        Calculates total paid and updates the invoice status automatically.
        """
        total_paid = self.payments.aggregate(
            total=models.Sum('amount_paid')
        )['total'] or 0

        today = timezone.now().date()

        if total_paid >= self.amount_due:
            new_status = 'PAID'
        elif total_paid > 0:
            new_status = 'PARTIALLY_PAID'
        elif self.due_date < today:
            new_status = 'OVERDUE'
        else:
            new_status = 'PENDING'

        if self.status != new_status:
            self.status = new_status
            self.save(update_fields=['status'])

    def __str__(self):
        return f"INV-{self.id:04d} — {self.student.user.get_full_name() or self.student.enrollment_no} (₹{self.amount_due} - {self.status})"


class FeePayment(TimeStampedModel):
    """
    Represents a payment transaction against a FeeInvoice.
    """
    PAYMENT_MODE_CHOICES = [
        ('CASH', 'Cash'),
        ('UPI', 'UPI'),
        ('CARD', 'Card'),
        ('BANK_TRANSFER', 'Bank Transfer'),
    ]

    invoice = models.ForeignKey(
        FeeInvoice,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField(default=timezone.now)
    payment_mode = models.CharField(
        max_length=20,
        choices=PAYMENT_MODE_CHOICES,
        default='UPI'
    )
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_fee_payments'
    )
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"PAY-{self.id:04d} — ₹{self.amount_paid} via {self.payment_mode} for {self.invoice}"


# ─── Signals for Auto Status Update ───────────────────────────────────────────

@receiver(post_save, sender=FeePayment)
@receiver(post_delete, sender=FeePayment)
def sync_invoice_status(sender, instance, **kwargs):
    """
    Automatically recalculates invoice status whenever a payment is added, modified, or deleted.
    """
    if instance.invoice:
        instance.invoice.update_status()

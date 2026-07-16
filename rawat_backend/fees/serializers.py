from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import FeeStructure, FeeInvoice, FeePayment
from students.models import Student, StudentBatchEnrollment
from batches.models import Batch


class FeeStructureSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source='batch.name', read_only=True)
    student_name = serializers.SerializerMethodField()
    enrollment_no = serializers.CharField(source='student.enrollment_no', read_only=True, default=None)

    class Meta:
        model = FeeStructure
        fields = [
            'id', 'batch', 'batch_name', 'student', 'student_name', 'enrollment_no',
            'amount', 'frequency', 'effective_from', 'created_at'
        ]

    def get_student_name(self, obj):
        if obj.student and obj.student.user:
            return obj.student.user.get_full_name() or obj.student.user.username
        return None


class FeePaymentSerializer(serializers.ModelSerializer):
    received_by_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    invoice_id = serializers.IntegerField(source='invoice.id', read_only=True)

    class Meta:
        model = FeePayment
        fields = [
            'id', 'invoice', 'invoice_id', 'student_name', 'amount_paid',
            'payment_date', 'payment_mode', 'received_by', 'received_by_name',
            'remarks', 'created_at'
        ]

    def get_received_by_name(self, obj):
        if obj.received_by:
            return obj.received_by.get_full_name() or obj.received_by.username
        return 'System'

    def get_student_name(self, obj):
        if obj.invoice and obj.invoice.student and obj.invoice.student.user:
            return obj.invoice.student.user.get_full_name() or obj.invoice.student.enrollment_no
        return 'N/A'


class FeePaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeePayment
        fields = ['id', 'invoice', 'amount_paid', 'payment_date', 'payment_mode', 'remarks']

    def validate_amount_paid(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['received_by'] = request.user
        payment = super().create(validated_data)
        return payment


class FeeInvoiceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    enrollment_no = serializers.CharField(source='student.enrollment_no', read_only=True)
    student_phone = serializers.CharField(source='student.phone', read_only=True)
    batch_name = serializers.CharField(source='batch.name', read_only=True, default='N/A')
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    payments = FeePaymentSerializer(many=True, read_only=True)

    class Meta:
        model = FeeInvoice
        fields = [
            'id', 'student', 'student_name', 'enrollment_no', 'student_phone',
            'batch', 'batch_name', 'amount_due', 'due_date', 'status',
            'amount_paid', 'balance_due', 'payments', 'created_at'
        ]

    def get_student_name(self, obj):
        if obj.student and obj.student.user:
            return obj.student.user.get_full_name() or obj.student.user.username
        return 'N/A'


class FeeInvoiceCreateSerializer(serializers.Serializer):
    """
    Creates an invoice for a specific student OR bulk generates for all students in a batch.
    """
    batch = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.all(),
        required=False,
        allow_null=True
    )
    student = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.all(),
        required=False,
        allow_null=True
    )
    amount_due = serializers.DecimalField(max_digits=10, decimal_places=2)
    due_date = serializers.DateField()

    def validate(self, attrs):
        batch = attrs.get('batch')
        student = attrs.get('student')
        if not batch and not student:
            raise serializers.ValidationError("Either a batch or a student must be specified to generate invoices.")
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        batch = validated_data.get('batch')
        student = validated_data.get('student')
        amount_due = validated_data['amount_due']
        due_date = validated_data['due_date']

        created_invoices = []

        if student:
            # Single student invoice creation
            invoice = FeeInvoice.objects.create(
                student=student,
                batch=batch,
                amount_due=amount_due,
                due_date=due_date
            )
            created_invoices.append(invoice)
        elif batch:
            # Bulk invoice creation for all active enrolled students in batch
            enrollments = StudentBatchEnrollment.objects.filter(
                batch=batch,
                is_active=True
            ).select_related('student')

            for enrollment in enrollments:
                invoice = FeeInvoice.objects.create(
                    student=enrollment.student,
                    batch=batch,
                    amount_due=amount_due,
                    due_date=due_date
                )
                created_invoices.append(invoice)

        return created_invoices


class FeesDashboardSerializer(serializers.Serializer):
    collected_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_pending = serializers.DecimalField(max_digits=12, decimal_places=2)
    overdue_count = serializers.IntegerField()
    total_collected = serializers.DecimalField(max_digits=12, decimal_places=2)

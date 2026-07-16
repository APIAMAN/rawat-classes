from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Q, F
from django.utils import timezone
from datetime import date

from .models import FeeStructure, FeeInvoice, FeePayment
from .serializers import (
    FeeStructureSerializer,
    FeeInvoiceSerializer,
    FeeInvoiceCreateSerializer,
    FeePaymentSerializer,
    FeePaymentCreateSerializer,
    FeesDashboardSerializer,
)
from core.permissions import IsAdmin


class FeeStructureViewSet(viewsets.ModelViewSet):
    """
    Manages fee structures per batch or student.
    Strictly Admin-only access.
    """
    permission_classes = [IsAdmin]
    serializer_class = FeeStructureSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['batch', 'student', 'frequency']
    search_fields = ['batch__name', 'student__enrollment_no', 'student__user__first_name', 'student__user__last_name']

    def get_queryset(self):
        return FeeStructure.objects.select_related('batch', 'student', 'student__user').all()


class FeeInvoiceViewSet(viewsets.ModelViewSet):
    """
    Manages student fee invoices.
    Admin: Full master access.
    Student: Read-only access to their own invoices.
    Teacher: Restricted (403 or empty).
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['student', 'batch', 'status']
    search_fields = ['student__enrollment_no', 'student__user__first_name', 'student__user__last_name', 'batch__name']
    ordering_fields = ['due_date', 'created_at', 'amount_due']

    def get_queryset(self):
        user = self.request.user
        qs = FeeInvoice.objects.select_related(
            'student', 'student__user', 'batch'
        ).prefetch_related('payments')

        # Auto-update overdue statuses for pending invoices past due date
        today = timezone.now().date()
        FeeInvoice.objects.filter(
            due_date__lt=today,
            status='PENDING'
        ).update(status='OVERDUE')

        if user.role == 'admin':
            pass
        elif user.role == 'student':
            try:
                qs = qs.filter(student=user.student_profile)
            except Exception:
                return qs.none()
        else:
            # Teachers have no access to fees
            return qs.none()

        # Handle explicit ?overdue=true filter param
        overdue_param = self.request.query_params.get('overdue')
        if overdue_param is not None:
            if overdue_param.lower() in ['true', '1']:
                qs = qs.filter(status='OVERDUE')

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return FeeInvoiceCreateSerializer
        return FeeInvoiceSerializer

    def create(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can generate fee invoices.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoices = serializer.save()

        # Return serialized list of generated invoices
        out_serializer = FeeInvoiceSerializer(invoices, many=True)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='pay')
    def record_payment(self, request, pk=None):
        """
        Record a payment against a specific invoice.
        POST /api/v1/fees/invoices/{id}/pay/
        Payload: { amount_paid, payment_mode, payment_date (optional), remarks (optional) }
        """
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can record fee payments.'}, status=status.HTTP_403_FORBIDDEN)

        invoice = self.get_object()
        data = request.data.copy()
        data['invoice'] = invoice.id

        serializer = FeePaymentCreateSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Refresh invoice instance to reflect updated status and balance
        invoice.refresh_from_db()
        out_serializer = FeeInvoiceSerializer(invoice)
        return Response(out_serializer.data, status=status.HTTP_200_OK)


class FeePaymentViewSet(viewsets.ModelViewSet):
    """
    Manages payment transactions.
    Admin: Full access.
    Student: Read-only access for payments against their invoices.
    Teacher: Restricted.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['invoice', 'payment_mode']
    search_fields = ['invoice__student__enrollment_no', 'invoice__student__user__first_name', 'remarks']
    ordering_fields = ['payment_date', 'created_at', 'amount_paid']

    def get_queryset(self):
        user = self.request.user
        qs = FeePayment.objects.select_related(
            'invoice', 'invoice__student', 'invoice__student__user', 'received_by'
        )

        if user.role == 'admin':
            return qs
        elif user.role == 'student':
            try:
                return qs.filter(invoice__student=user.student_profile)
            except Exception:
                return qs.none()
        return qs.none()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return FeePaymentCreateSerializer
        return FeePaymentSerializer

    def create(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can create fee payments.'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)


class FeesDashboardView(APIView):
    """
    Returns summary statistics for the fees dashboard:
    GET /api/v1/fees/dashboard/
    - collected_this_month
    - total_pending
    - overdue_count
    - total_collected
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        current_year = today.year
        current_month = today.month

        # Sync overdue status first
        FeeInvoice.objects.filter(
            due_date__lt=today,
            status='PENDING'
        ).update(status='OVERDUE')

        if user.role == 'student':
            try:
                student = user.student_profile
                invoices = FeeInvoice.objects.filter(student=student)
                payments = FeePayment.objects.filter(invoice__student=student)
            except Exception:
                invoices = FeeInvoice.objects.none()
                payments = FeePayment.objects.none()
        elif user.role == 'admin':
            invoices = FeeInvoice.objects.all()
            payments = FeePayment.objects.all()
        else:
            # Teacher
            invoices = FeeInvoice.objects.none()
            payments = FeePayment.objects.none()

        # Aggregations
        collected_this_month = payments.filter(
            payment_date__year=current_year,
            payment_date__month=current_month
        ).aggregate(total=Sum('amount_paid'))['total'] or 0.0

        total_collected = payments.aggregate(total=Sum('amount_paid'))['total'] or 0.0

        total_amount_due = invoices.aggregate(total=Sum('amount_due'))['total'] or 0.0
        total_pending = max(float(total_amount_due) - float(total_collected), 0.0)

        overdue_count = invoices.filter(status='OVERDUE').count()

        data = {
            'collected_this_month': collected_this_month,
            'total_pending': total_pending,
            'overdue_count': overdue_count,
            'total_collected': total_collected,
        }

        serializer = FeesDashboardSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)

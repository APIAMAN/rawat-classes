import csv
import io
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.contrib.auth import get_user_model
from core.permissions import IsAdmin
from .models import Student, StudentBatchEnrollment
from .serializers import StudentSerializer, StudentCreateSerializer, StudentBatchEnrollmentSerializer
from batches.models import Batch

User = get_user_model()


class StudentViewSet(viewsets.ModelViewSet):
    """
    ModelViewSet for managing Student profiles and nested batch enrollments.
    Gated so only Admins can write, Teachers can only see students in their batches,
    and Students can only see their own profile.
    """
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ('is_active',)
    search_fields = ('enrollment_no', 'user__first_name', 'user__last_name', 'user__username')

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Student.objects.none()

        # Admin gets full access
        if user.role == 'admin':
            return Student.objects.all().select_related('user').prefetch_related('enrollments__batch').order_by('-created_at')

        # Teacher gets students enrolled in their own batches
        if user.role == 'teacher':
            return Student.objects.filter(
                enrollments__batch__teacher__user=user,
                enrollments__is_active=True
            ).select_related('user').prefetch_related('enrollments__batch').distinct().order_by('-created_at')

        # Student gets only their own profile
        if user.role == 'student':
            return Student.objects.filter(user=user).select_related('user').prefetch_related('enrollments__batch')

        return Student.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return StudentCreateSerializer
        return StudentSerializer

    def get_permissions(self):
        permission_classes = [IsAuthenticated]
        
        # Write actions are restricted to Admins
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'enrollments', 'bulk_upload']:
            permission_classes.append(IsAdmin)
            
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=['get', 'post'], url_path='enrollments')
    def enrollments(self, request, pk=None):
        """
        Nested endpoint to retrieve or append student batch enrollments.
        GET /api/v1/students/{id}/enrollments/
        POST /api/v1/students/{id}/enrollments/
        """
        student = self.get_object()
        
        if request.method == 'GET':
            enrollments = student.enrollments.all()
            serializer = StudentBatchEnrollmentSerializer(enrollments, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        elif request.method == 'POST':
            if request.user.role != 'admin':
                return Response(
                    {"detail": "Only admins can modify student enrollments."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            serializer = StudentBatchEnrollmentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Prevent duplicate enrollments
            batch = serializer.validated_data.get('batch')
            if StudentBatchEnrollment.objects.filter(student=student, batch=batch).exists():
                return Response(
                    {"detail": "Student is already enrolled in this batch."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            serializer.save(student=student)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='bulk_upload')
    def bulk_upload(self, request):
        """
        Bulk registration endpoint via CSV file upload.
        POST /api/v1/students/bulk_upload/
        """
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can perform bulk student upload.'}, status=status.HTTP_403_FORBIDDEN)

        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No CSV file was uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        if not file.name.endswith('.csv'):
            return Response({'detail': 'Invalid file format. Please upload a .csv file.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_file = file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(decoded_file))
        except Exception as e:
            return Response({'detail': f'Error reading CSV file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        skipped_count = 0
        errors = []

        for row_idx, row in enumerate(reader, start=2):
            enrollment_no = row.get('enrollment_no', '').strip()
            first_name = row.get('first_name', '').strip()
            last_name = row.get('last_name', '').strip()
            email = row.get('email', '').strip()
            phone = row.get('phone', '').strip()
            guardian_name = row.get('guardian_name', '').strip()
            guardian_phone = row.get('guardian_phone', '').strip()
            date_of_birth = row.get('date_of_birth', '').strip() or '2005-01-01'
            admission_date = row.get('admission_date', '').strip() or '2026-01-01'
            batch_id = row.get('batch_id', '').strip()

            if not enrollment_no or not first_name or not last_name or not email:
                errors.append(f"Row {row_idx}: Missing required fields (enrollment_no, first_name, last_name, email).")
                skipped_count += 1
                continue

            if Student.objects.filter(enrollment_no=enrollment_no).exists():
                errors.append(f"Row {row_idx}: Enrollment number '{enrollment_no}' already exists.")
                skipped_count += 1
                continue

            username = row.get('username', '').strip() or enrollment_no.lower().replace(' ', '_')
            if User.objects.filter(username=username).exists():
                errors.append(f"Row {row_idx}: Username '{username}' already exists.")
                skipped_count += 1
                continue

            try:
                with transaction.atomic():
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password=row.get('password', '').strip() or 'student123',
                        first_name=first_name,
                        last_name=last_name,
                        role='student'
                    )
                    student = Student.objects.create(
                        user=user,
                        enrollment_no=enrollment_no,
                        phone=phone,
                        guardian_name=guardian_name,
                        guardian_phone=guardian_phone,
                        date_of_birth=date_of_birth,
                        admission_date=admission_date,
                        is_active=True
                    )
                    if batch_id:
                        try:
                            batch = Batch.objects.get(id=batch_id)
                            StudentBatchEnrollment.objects.create(student=student, batch=batch, is_active=True)
                        except Batch.DoesNotExist:
                            pass
                    created_count += 1
            except Exception as e:
                errors.append(f"Row {row_idx}: Database error — {str(e)}")
                skipped_count += 1

        return Response({
            'detail': f'Bulk processing finished. {created_count} students enrolled, {skipped_count} skipped.',
            'created_count': created_count,
            'skipped_count': skipped_count,
            'errors': errors,
        }, status=status.HTTP_200_OK if created_count > 0 else status.HTTP_400_BAD_REQUEST)


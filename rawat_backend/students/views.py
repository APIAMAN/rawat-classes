from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from core.permissions import IsAdmin
from .models import Student, StudentBatchEnrollment
from .serializers import StudentSerializer, StudentCreateSerializer, StudentBatchEnrollmentSerializer

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
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'enrollments']:
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

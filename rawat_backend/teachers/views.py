from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from core.permissions import IsAdmin
from .models import Teacher
from .serializers import TeacherSerializer, TeacherCreateSerializer

class TeacherViewSet(viewsets.ModelViewSet):
    """
    ModelViewSet for managing Teacher CRUD operations.
    Gated so only Admins can write, and Teachers can only see their own profile.
    """
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ('is_active', 'subject_specialization')
    search_fields = ('user__first_name', 'user__last_name', 'user__username', 'employee_id')

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Teacher.objects.none()
            
        # Admins can see all teachers
        if user.role == 'admin':
            return Teacher.objects.all().select_related('user').order_by('-created_at')
            
        # Teachers can only query their own profile
        if user.role == 'teacher':
            return Teacher.objects.filter(user=user).select_related('user').order_by('-created_at')
            
        # Others have no access
        return Teacher.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return TeacherCreateSerializer
        return TeacherSerializer

    def get_permissions(self):
        # Authenticated access is required for all actions
        permission_classes = [IsAuthenticated]
        
        # Only Admin can perform write/delete actions
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes.append(IsAdmin)
            
        return [permission() for permission in permission_classes]

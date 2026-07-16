from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q
from batches.models import Batch
from students.models import Student
from teachers.models import Teacher
from attendance.models import AttendanceRecord
from fees.models import FeeInvoice

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Public health check endpoint.
    Returns status 200 OK.
    """
    return Response(
        {"status": "ok", "message": "Rawat Backend API is healthy"},
        status=status.HTTP_200_OK
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Returns real-time aggregated metrics for dashboard KPI cards.
    Scoped by user role (Admin vs Teacher vs Student).
    """
    user = request.user

    if user.role == 'admin':
        active_batches_count = Batch.objects.filter(is_active=True).count()
        total_students_count = Student.objects.filter(is_active=True).count()
        active_teachers_count = Teacher.objects.filter(is_active=True).count()
        
        att_qs = AttendanceRecord.objects.all()
        total_att = att_qs.count()
        present_att = att_qs.filter(status='PRESENT').count()
    elif user.role == 'teacher':
        teacher_batches = Batch.objects.filter(teacher__user=user, is_active=True)
        active_batches_count = teacher_batches.count()
        total_students_count = Student.objects.filter(enrollments__batch__teacher__user=user, is_active=True).distinct().count()
        active_teachers_count = Teacher.objects.filter(is_active=True).count()

        att_qs = AttendanceRecord.objects.filter(session__batch__teacher__user=user)
        total_att = att_qs.count()
        present_att = att_qs.filter(status='PRESENT').count()
    else:
        active_batches_count = Batch.objects.filter(enrollments__student__user=user, is_active=True).count()
        total_students_count = 1
        active_teachers_count = Teacher.objects.filter(is_active=True).count()

        att_qs = AttendanceRecord.objects.filter(student__user=user)
        total_att = att_qs.count()
        present_att = att_qs.filter(status='PRESENT').count()

    avg_attendance_pct = round((present_att / total_att * 100), 1) if total_att > 0 else 0.0

    return Response({
        "active_batches": active_batches_count,
        "total_students": total_students_count,
        "active_teachers": active_teachers_count,
        "avg_attendance_pct": avg_attendance_pct,
        "total_attendance_records": total_att
    }, status=status.HTTP_200_OK)

from django.contrib import admin


class RawatClassesAdminSite(admin.AdminSite):
    site_header = "Rawat Classes Admin"
    site_title = "Rawat Classes Admin"
    index_title = "Dashboard & Administration"

    def get_app_list(self, request, app_label=None):
        """
        Orders applications explicitly:
        Accounts -> Teachers -> Batches -> Students -> Attendance -> Fees
        """
        app_dict = self._build_app_dict(request, app_label)
        ORDER = ['accounts', 'teachers', 'batches', 'students', 'attendance', 'fees']

        app_list = []
        for app_name in ORDER:
            if app_name in app_dict:
                app_list.append(app_dict.pop(app_name))

        # Append any unlisted apps remaining
        app_list.extend(app_dict.values())
        return app_list

    def index(self, request, extra_context=None):
        """
        Injects real-time quick counts into the admin homepage index.
        """
        extra_context = extra_context or {}
        try:
            from students.models import Student
            from teachers.models import Teacher
            from batches.models import Batch
            from fees.models import FeeInvoice

            active_students = Student.objects.filter(is_active=True).count()
            active_teachers = Teacher.objects.filter(is_active=True).count()
            running_batches = Batch.objects.filter(is_active=True).count()

            pending_invoices = FeeInvoice.objects.filter(
                status__in=['PENDING', 'OVERDUE', 'PARTIALLY_PAID']
            )
            pending_fees = sum(inv.balance_due for inv in pending_invoices)

            extra_context['dashboard_stats'] = {
                'active_students': active_students,
                'active_teachers': active_teachers,
                'running_batches': running_batches,
                'pending_fees': pending_fees,
            }
        except Exception:
            pass

        return super().index(request, extra_context=extra_context)


# Instantiated custom admin site
admin_site = RawatClassesAdminSite(name='rawat_admin')

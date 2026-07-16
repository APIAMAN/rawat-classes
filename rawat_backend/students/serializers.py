from rest_framework import serializers
from django.db import transaction
from accounts.models import User
from .models import Student, StudentBatchEnrollment
from batches.models import Batch
from teachers.serializers import UserNestedSerializer

class StudentBatchEnrollmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Student-to-Batch enrollments.
    """
    batch_name = serializers.ReadOnlyField(source='batch.name')
    subject = serializers.ReadOnlyField(source='batch.subject')

    class Meta:
        model = StudentBatchEnrollment
        fields = ('id', 'batch', 'batch_name', 'subject', 'enrolled_on', 'is_active')

class StudentSerializer(serializers.ModelSerializer):
    """
    Serializer for viewing and updating Student profiles.
    Handles nested updates for User details and reads enrollments list.
    """
    user = UserNestedSerializer()
    enrollments = StudentBatchEnrollmentSerializer(many=True, read_only=True)
    batches = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Student
        fields = (
            'id', 'user', 'enrollment_no', 'phone', 
            'guardian_name', 'guardian_phone', 'date_of_birth', 
            'admission_date', 'is_active', 'enrollments', 'batches', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_at', 'updated_at')

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        batch_ids = validated_data.pop('batches', None)
        
        # Update Student profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update nested User model fields
        if user_data:
            user = instance.user
            username = user_data.get('username')
            email = user_data.get('email')
            
            if username and username != user.username and User.objects.filter(username=username).exists():
                raise serializers.ValidationError({"user": {"username": "A user with this username already exists."}})
            if email and email != user.email and User.objects.filter(email=email).exists():
                raise serializers.ValidationError({"user": {"email": "A user with this email already exists."}})

            for attr, value in user_data.items():
                if attr == 'password':
                    user.set_password(value)
                else:
                    setattr(user, attr, value)
            user.save()

        # Sync batch enrollments if provided
        if batch_ids is not None:
            with transaction.atomic():
                # Remove enrollments that are no longer in the list
                StudentBatchEnrollment.objects.filter(student=instance).exclude(batch_id__in=batch_ids).delete()
                
                # Add new enrollments
                existing_batch_ids = StudentBatchEnrollment.objects.filter(student=instance).values_list('batch_id', flat=True)
                for b_id in batch_ids:
                    if b_id not in existing_batch_ids:
                        try:
                            batch = Batch.objects.get(id=b_id)
                            StudentBatchEnrollment.objects.create(student=instance, batch=batch)
                        except Batch.DoesNotExist:
                            raise serializers.ValidationError({"batches": f"Batch with ID {b_id} does not exist."})

        return instance

class StudentCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a Student profile.
    Creates a linked User account with role=STUDENT and optionally maps
    initial batch enrollments in a single database transaction.
    """
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    first_name = serializers.CharField(write_only=True, required=False, default='')
    last_name = serializers.CharField(write_only=True, required=False, default='')
    batches = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=[]
    )

    class Meta:
        model = Student
        fields = (
            'id', 'username', 'password', 'email', 'first_name', 'last_name',
            'enrollment_no', 'phone', 'guardian_name', 'guardian_phone',
            'date_of_birth', 'admission_date', 'is_active', 'batches'
        )

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        username = validated_data.pop('username')
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        batch_ids = validated_data.pop('batches', [])

        with transaction.atomic():
            # Create user account with role=STUDENT
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=User.STUDENT
            )
            # Create student profile
            student = Student.objects.create(user=user, **validated_data)
            
            # Map batch enrollments
            for b_id in batch_ids:
                try:
                    batch = Batch.objects.get(id=b_id)
                    StudentBatchEnrollment.objects.create(student=student, batch=batch)
                except Batch.DoesNotExist:
                    raise serializers.ValidationError({"batches": f"Batch with ID {b_id} does not exist."})
                    
            return student

    def to_representation(self, instance):
        return StudentSerializer(instance, context=self.context).data

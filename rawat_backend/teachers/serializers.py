from rest_framework import serializers
from accounts.models import User
from .models import Teacher
from django.db import transaction

class UserNestedSerializer(serializers.ModelSerializer):
    """
    Nested serializer for reading/updating user account details.
    """
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role')
        read_only_fields = ('role',)

class TeacherSerializer(serializers.ModelSerializer):
    """
    Serializer for viewing and updating Teacher profiles.
    Handles nested updates for User details.
    """
    user = UserNestedSerializer()

    class Meta:
        model = Teacher
        fields = (
            'id', 'user', 'employee_id', 'phone', 
            'subject_specialization', 'qualification', 
            'joining_date', 'is_active', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_at', 'updated_at')

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        
        # Update Teacher profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update nested User model fields
        if user_data:
            user = instance.user
            # If username or email changed, validate they don't collide
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

        return instance

class TeacherCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a Teacher.
    Creates a linked User account with role=TEACHER in a single database transaction.
    """
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    first_name = serializers.CharField(write_only=True, required=False, default='')
    last_name = serializers.CharField(write_only=True, required=False, default='')

    class Meta:
        model = Teacher
        fields = (
            'id', 'username', 'password', 'email', 'first_name', 'last_name',
            'employee_id', 'phone', 'subject_specialization', 'qualification',
            'joining_date', 'is_active'
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
        # Extract user credentials
        username = validated_data.pop('username')
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')

        # Perform atomic database writes
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=User.TEACHER
            )
            teacher = Teacher.objects.create(user=user, **validated_data)
            return teacher

    def to_representation(self, instance):
        return TeacherSerializer(instance, context=self.context).data

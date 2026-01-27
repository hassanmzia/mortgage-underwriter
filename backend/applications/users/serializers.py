"""
User Serializers for API
"""
from rest_framework import serializers
from .models import User, UserActivity


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    full_name = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'department', 'employee_id', 'phone', 'nmls_id',
            'max_loan_amount', 'is_available', 'last_activity',
            'profile_picture', 'profile_picture_url', 'mfa_enabled',
            'notification_preferences', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_activity', 'profile_picture_url']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users"""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'role', 'department', 'employee_id', 'phone', 'nmls_id',
            'max_loan_amount'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserActivitySerializer(serializers.ModelSerializer):
    """Serializer for User Activity"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = UserActivity
        fields = [
            'id', 'user', 'user_name', 'action', 'resource_type',
            'resource_id', 'details', 'ip_address', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']

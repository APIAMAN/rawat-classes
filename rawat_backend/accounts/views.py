from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login endpoint.
    Sets the refresh token in an httpOnly cookie and returns the access token + user info in body.
    """
    permission_classes = (AllowAny,)
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.view_args)
            
        data = serializer.validated_data
        response_data = {
            'access': data['access'],
            'user': {
                'id': serializer.user.id,
                'username': serializer.user.username,
                'email': serializer.user.email,
                'role': serializer.user.role,
            }
        }
        
        response = Response(response_data, status=status.HTTP_200_OK)
        refresh_token = data['refresh']
        
        response.set_cookie(
            'refresh_token',
            refresh_token,
            httponly=True,
            secure=False,  # Set to True in production (HTTPS)
            samesite='Lax', # Required for cross-port requests locally
            max_age=24 * 60 * 60  # 1 day
        )
        return response

class CustomTokenRefreshView(TokenRefreshView):
    """
    Refresh endpoint.
    Extracts the refresh token from httpOnly cookie and issues a new access token.
    """
    permission_classes = (AllowAny,)
    
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')
        
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is missing from cookies"},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        serializer = self.get_serializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.view_args)
            
        data = serializer.validated_data
        response_data = {
            'access': data['access']
        }
        
        response = Response(response_data, status=status.HTTP_200_OK)
        
        if 'refresh' in data:
            response.set_cookie(
                'refresh_token',
                data['refresh'],
                httponly=True,
                secure=False,
                samesite='Lax',
                max_age=24 * 60 * 60
            )
        return response

class CustomLogoutView(APIView):
    """
    Logout endpoint.
    Blacklists the refresh token and clears the cookie.
    """
    permission_classes = (AllowAny,)
    
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')
        
        response = Response(
            {"detail": "Successfully logged out"},
            status=status.HTTP_200_OK
        )
        
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
                
        response.delete_cookie('refresh_token', samesite='Lax')
        return response

class UserMeView(APIView):
    """
    Returns current authenticated user details, along with their related profile ID if available.
    """
    permission_classes = (IsAuthenticated,)
    
    def get(self, request):
        user = request.user
        profile_id = None
        if user.role == 'teacher' and hasattr(user, 'teacher_profile'):
            profile_id = user.teacher_profile.id
        elif user.role == 'student' and hasattr(user, 'student_profile'):
            profile_id = user.student_profile.id

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "profile_id": profile_id
        }, status=status.HTTP_200_OK)

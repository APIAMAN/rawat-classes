from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

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

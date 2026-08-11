from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import UtilisateurSerializer


class MeView(APIView):
    """GET /api/auth/me/ — revalide la session côté frontend (ex. après refresh du token)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UtilisateurSerializer(request.user).data)
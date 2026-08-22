from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import UtilisateurSerializer, InscriptionSerializer, TokenObtainPairAvecRoleSerializer


class MeView(APIView):
    """GET /api/auth/me/ — revalide la session côté frontend (ex. après refresh du token)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UtilisateurSerializer(request.user).data)


class InscriptionView(APIView):
    """
    POST /api/auth/inscription/
    Body: {telephone, password, first_name, last_name}
    Crée un compte client et connecte immédiatement (renvoie access/refresh comme
    /api/auth/token/, même format) — évite une étape de connexion séparée juste après.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = InscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        utilisateur = serializer.save()

        token = TokenObtainPairAvecRoleSerializer.get_token(utilisateur)
        return Response({
            'access': str(token.access_token),
            'refresh': str(token),
            'utilisateur': UtilisateurSerializer(utilisateur).data,
        }, status=status.HTTP_201_CREATED)
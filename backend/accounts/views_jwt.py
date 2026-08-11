from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import TokenObtainPairAvecRoleSerializer


class TokenObtainPairAvecRoleView(TokenObtainPairView):
    serializer_class = TokenObtainPairAvecRoleSerializer
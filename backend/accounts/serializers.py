from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ['id', 'username', 'first_name', 'last_name', 'telephone', 'role']
        read_only_fields = fields


class TokenObtainPairAvecRoleSerializer(TokenObtainPairSerializer):
    """
    Ajoute le rôle dans le JWT (claim 'role') et renvoie le profil utilisateur
    directement dans la réponse de connexion, pour éviter un aller-retour
    supplémentaire vers /api/auth/me/ juste après le login.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['utilisateur'] = UtilisateurSerializer(self.user).data
        return data
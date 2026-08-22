from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ['id', 'username', 'first_name', 'last_name', 'telephone', 'role']
        read_only_fields = fields


class InscriptionSerializer(serializers.Serializer):
    """
    Inscription client : le numéro de téléphone sert d'identifiant de connexion
    (username = telephone en interne, transparent pour le client qui ne voit que
    son numéro). Le rôle est toujours 'client' — les comptes agent/admin sont créés
    par un administrateur, jamais via cette route publique.
    """
    telephone = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    def validate_telephone(self, valeur):
        if Utilisateur.objects.filter(telephone=valeur).exists():
            raise serializers.ValidationError("Un compte existe déjà avec ce numéro de téléphone.")
        return valeur

    def create(self, validated_data):
        return Utilisateur.objects.create_user(
            username=validated_data['telephone'],
            telephone=validated_data['telephone'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role=Utilisateur.ROLE_CLIENT,
            password=validated_data['password'],
        )


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
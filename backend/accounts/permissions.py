from rest_framework.permissions import BasePermission


class EstAgent(BasePermission):
    """Autorise uniquement les utilisateurs avec le rôle agent (guichet)."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == request.user.ROLE_AGENT
        )


class EstAdmin(BasePermission):
    """Autorise uniquement les utilisateurs avec le rôle admin (ou superuser Django)."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == request.user.ROLE_ADMIN or request.user.is_superuser)
        )
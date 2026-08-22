from django.urls import path
from .views import CinetPayNotifyView

urlpatterns = [
    path('paiements/cinetpay/notify/', CinetPayNotifyView.as_view(), name='cinetpay-notify'),
]
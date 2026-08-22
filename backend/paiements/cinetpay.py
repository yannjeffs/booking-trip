"""
Client minimal pour l'API Checkout CinetPay (https://docs.cinetpay.com).

Deux appels seulement :
- initier_paiement() : crée une transaction et renvoie l'URL de la page de paiement
  hébergée par CinetPay (le client y choisit Orange Money / MTN Mobile Money / carte
  et saisit son code — ces données ne transitent jamais par notre serveur).
- verifier_transaction() : interroge CinetPay pour connaître le VRAI statut d'une
  transaction. À utiliser systématiquement dans le webhook — CinetPay documente
  explicitement de ne jamais faire confiance au contenu brut de l'appel de
  notification (risque d'attaque de type man-in-the-middle) : on revérifie toujours
  côté serveur avant de confirmer quoi que ce soit.
"""

import requests
from django.conf import settings

TIMEOUT_SECONDES = 30

class CinetPayError:
    """Levée quand CinetPay renvoie un code d'erreur (ex. 400, 401, 500)."""
    
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message

    def __str__(self):
        return f"CinetPayError {self.status_code}: {self.message}"
    

def initier_paiement(*, transaction_id, montant, description, nom, prenom, telephone, canal):
    """
    canal : 'MOBILE_MONEY' (Orange/MTN), 'CREDIT_CARD' (carte), ou 'ALL' (les deux
    proposés sur la page CinetPay).
    Retourne {'payment_token': ..., 'payment_url': ...} en cas de succès.
    """
    payload = {
        'apiKey': settings.CINETPAY_API_KEY,
        'site_id': settings.CINETPAY_SITE_ID,
        'transaction_id': transaction_id,
        'amount': int(montant),  # CinetPay attend des centimes
        'currency': 'XAF', # Franc CFA BEAC (Cameroun) ne pas confondre avec XOF BCEAO (Afriquede de l'Ouest)
        'description': description[:255],
        'customer_name': (nom or 'Client')[:100],
        'customer_surname': (prenom or '-')[:100],
        'customer_phone_number': telephone[:20] or '-',
        'customer_country': 'CM',  # Cameroun
        'notify_url': f"{settings.SITE_BASE_URL}/api/paiements/cinetpay/notify/",
        'return_url': f"{settings.FRONTEND_BASE_URL}/tickets/{transaction_id.split('-')[0]}",
        'channels': canal,
        'lang': 'FR',
    }
    reponse = requests.post(f"{settings.CINETPAY_BASE_URL}/payment", json=payload, timeout=TIMEOUT_SECONDES)
    data = reponse.json()
    if data.get('code') != '201':
        raise CinetPayError(data.get('message') or data.get('description') or 'Erreur inconnue', reponse.status_code)
    return data['data']


def verifier_paiement(transaction_id):
    """ Retourne la réponse brute de CinetPay : { 'code', 'message', 'data': {'status', payment_method, ...} } """
    payload = {
        'apiKey': settings.CINETPAY_API_KEY,
        'site_id': settings.CINETPAY_SITE_ID,
        'transaction_id': transaction_id
    }
    reponse = requests.post(f"{settings.CINETPAY_BASE_URL}/payment/check", json=payload, timeout=TIMEOUT_SECONDES)
    return reponse.json()
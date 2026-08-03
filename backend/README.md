# CX Ticketing — Backend Django

API REST pour la plateforme de réservation et vente de tickets de bus (compagnie unique).

## Démarrage rapide

```bash
python3 -m venv venv
source venv/bin/activate          # Windows : venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

L'admin Django est disponible sur `/admin/` — utile pour créer des destinations, classes,
bus et voyages en attendant que le back-office custom soit branché sur les endpoints admin.

## Apps

- **accounts** — Utilisateur custom (rôles client/agent/admin) + profil Agent
- **catalogue** — Destination, Classe, Bus, Trajet, Voyage, Tarif (prix adulte/enfant)
- **reservations** — Reservation (code alphanumérique + QR, canal en_ligne/guichet, statuts) et Passager
- **paiements** — Paiement (Orange Money, MTN MoMo, carte, espèces guichet)

## Points de conception à retenir

- `Reservation.code_alphanumerique` est généré à la création, payée ou non — c'est la référence
  que le client peut donner pour finaliser un achat en attente, ou qu'un agent peut chercher
  au guichet pour un billet acheté en ligne.
- `Reservation.qr_token` n'existe qu'une fois la réservation `confirmee` (payée en ligne ou au
  guichet) — pas de QR pour une réservation en attente de paiement.
- `Tarif.prix_pour_age()` applique le tarif enfant (≤ 12 ans) automatiquement.
- Les réservations en ligne non payées expirent après 30 min (`date_expiration`) — un job
  périodique (Celery, à ajouter) devra passer ces réservations en `expiree` et libérer les sièges.

## Prochaines étapes

- Serializers + ViewSets DRF (public, guichet, admin)
- Verrouillage de siège en temps réel (Celery + Redis ou vérification à la volée)
- Intégration agrégateur Mobile Money (webhook `paiements`)
- Module colis (plus tard)

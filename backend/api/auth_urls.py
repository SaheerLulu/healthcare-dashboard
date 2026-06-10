"""Auth URL module, included from dashboard_project.urls under /api/auth/.

Kept separate from api.urls so the login feature stays self-contained.
"""
from django.urls import path

from .auth import LoginView, RefreshTokenView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('refresh/', RefreshTokenView.as_view(), name='auth-refresh'),
]

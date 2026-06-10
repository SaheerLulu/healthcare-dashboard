"""Login/refresh endpoints — same credentials as the pharmacy app.

The dashboard shares its database (and therefore ``auth_user``) and JWT
signing key with the upstream pharmacy/inventory app, so authenticating
here issues tokens that are interchangeable with pharmacy/accounting
ones. The response shape mirrors the pharmacy ``LoginView`` so frontend
code can treat all three apps the same.
"""
from django.contrib.auth import authenticate
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    """User login endpoint — returns JWT tokens."""

    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        password = request.data.get('password') or ''

        if not username or not password:
            return Response({
                'ok': False,
                'error': {
                    'code': 'MISSING_CREDENTIALS',
                    'message': 'Username and password are required',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)

        if user is None:
            return Response({
                'ok': False,
                'error': {
                    'code': 'INVALID_CREDENTIALS',
                    'message': 'Invalid username or password',
                }
            }, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({
                'ok': False,
                'error': {
                    'code': 'ACCOUNT_DISABLED',
                    'message': 'Account is disabled. Contact administrator.',
                }
            }, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)

        return Response({
            'ok': True,
            'data': {
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'token_type': 'Bearer',
                'expires_in': 28800,  # 8 hours, matches SIMPLE_JWT
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_superuser': user.is_superuser,
                },
            }
        })


@method_decorator(csrf_exempt, name='dispatch')
class RefreshTokenView(APIView):
    """Exchange a refresh token for a new access token."""

    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('refresh_token') or request.data.get('refresh')
        if not token:
            return Response({
                'ok': False,
                'error': {
                    'code': 'MISSING_TOKEN',
                    'message': 'Refresh token is required',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(token)
        except TokenError:
            return Response({
                'ok': False,
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Refresh token is invalid or expired',
                }
            }, status=status.HTTP_401_UNAUTHORIZED)

        data = {
            'access_token': str(refresh.access_token),
            'token_type': 'Bearer',
            'expires_in': 28800,
        }
        # ROTATE_REFRESH_TOKENS is on — hand back the rotated token too.
        refresh.set_jti()
        refresh.set_exp()
        data['refresh_token'] = str(refresh)

        return Response({'ok': True, 'data': data})

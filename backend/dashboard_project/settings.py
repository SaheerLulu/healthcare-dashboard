"""
Django settings for the Healthcare Inventory Dashboard backend.
Shares the same SQLite database and SECRET_KEY as healthcare-inventory-management
and accounting apps for SSO via JWT.
"""
import os
import sys
from pathlib import Path
from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# DEBUG defaults OFF so a bare production-ish run fails closed (auth
# required, restricted hosts, no wildcard CORS, real SECRET_KEY needed).
# Local dev entrypoints (start.sh, backend/start.sh) export
# DJANGO_DEBUG=True explicitly — dev convenience lives there, not here.
DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() in ('true', '1', 'yes')

# `manage.py test` must run with zero env configured (CI, fresh checkout),
# so test runs are allowed the same insecure fallbacks as DEBUG.
TESTING = 'test' in sys.argv

# ---------------------------------------------------------------------------
# Security – same key as inventory & accounting for JWT SSO
# ---------------------------------------------------------------------------
_SECRET_KEY_ENV = os.environ.get('DJANGO_SECRET_KEY')
if _SECRET_KEY_ENV:
    SECRET_KEY = _SECRET_KEY_ENV
elif DEBUG or TESTING:
    import warnings
    warnings.warn(
        "DJANGO_SECRET_KEY not set. Using an insecure dev-only fallback. "
        "JWT SSO with the pharmacy/accounting apps will NOT work — they "
        "sign tokens with the shared DJANGO_SECRET_KEY.",
        stacklevel=2,
    )
    SECRET_KEY = 'django-insecure-dashboard-dev-fallback-do-not-deploy'
else:
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is off. Use the "
        "key shared with the pharmacy/accounting apps so JWT SSO keeps "
        "working."
    )

# Wildcard hosts only in DEBUG; otherwise an explicit comma-separated list
# via DJANGO_ALLOWED_HOSTS (deploys must include their public hostname —
# the frontend nginx forwards the original Host header).
if DEBUG:
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = [
        h.strip()
        for h in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
        if h.strip()
    ]

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    # Dashboard apps
    'source_models',
    'reports',
    'pipeline',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.middleware.PerfTimingMiddleware',
    'api.middleware.CacheControlMiddleware',
    'api.middleware.AuditMiddleware',
]

ROOT_URLCONF = 'dashboard_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'dashboard_project.wsgi.application'

# ---------------------------------------------------------------------------
# Database
#   - Default: shared SQLite with healthcare-inventory-management & accounting.
#   - Production: PostgreSQL when DJANGO_DB_ENGINE=postgresql (DASH-E20-F03-US02).
# ---------------------------------------------------------------------------
_DEFAULT_SHARED_DB = (BASE_DIR.parent.parent / 'healthcare-pharmacy' / 'backend' / 'db.sqlite3').resolve()
_DB_ENGINE = os.environ.get('DJANGO_DB_ENGINE', 'sqlite3').lower()

if _DB_ENGINE in ('postgres', 'postgresql', 'pg'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('POSTGRES_DB', 'healthcare_dashboard'),
            'USER': os.environ.get('POSTGRES_USER', 'dashboard'),
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD', ''),
            'HOST': os.environ.get('POSTGRES_HOST', 'postgres'),
            'PORT': os.environ.get('POSTGRES_PORT', '5432'),
            'CONN_MAX_AGE': int(os.environ.get('DJANGO_CONN_MAX_AGE', '60')),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.environ.get('DJANGO_DB_PATH', str(_DEFAULT_SHARED_DB)),
        }
    }

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# Wildcard CORS only in DEBUG (vite dev server etc.). In production the
# frontend nginx proxies /api/ same-origin, so the default is "no
# cross-origin callers"; add any external origins explicitly via the
# comma-separated CORS_ALLOWED_ORIGINS env var.
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = [
        o.strip()
        for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
        if o.strip()
    ]

# ---------------------------------------------------------------------------
# Security headers / cookies (non-DEBUG hardening)
# ---------------------------------------------------------------------------
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
# Secure cookie flags are gated on DASHBOARD_HTTPS=1 instead of DEBUG so
# plain-HTTP LAN deploys keep a working admin login. Set it wherever TLS
# terminates in front of the app (e.g. the dev.dashboards nginx).
# SECURE_SSL_REDIRECT is deliberately not set — TLS terminates at nginx.
DASHBOARD_HTTPS = os.environ.get('DASHBOARD_HTTPS', '').lower() in ('true', '1', 'yes')
SESSION_COOKIE_SECURE = DASHBOARD_HTTPS
CSRF_COOKIE_SECURE = DASHBOARD_HTTPS

# ---------------------------------------------------------------------------
# REST Framework
# ---------------------------------------------------------------------------
# Dashboard auth gate — when False, every endpoint behaves like AllowAny;
# when True, ``DashboardPermission`` requires a valid JWT (DASH-E00-A04).
# Fail-closed default: when the env var is unset, auth is required unless
# DEBUG is on. Both directions can still be forced explicitly
# (DASHBOARD_REQUIRE_AUTH=1 in DEBUG, =0 in production).
_REQUIRE_AUTH_ENV = os.environ.get('DASHBOARD_REQUIRE_AUTH', '').strip()
if _REQUIRE_AUTH_ENV:
    DASHBOARD_REQUIRE_AUTH = _REQUIRE_AUTH_ENV.lower() in ('true', '1', 'yes')
else:
    DASHBOARD_REQUIRE_AUTH = not DEBUG

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'api.permissions.DashboardPermission',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# ---------------------------------------------------------------------------
# JWT – mirrors inventory & accounting config for SSO
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{asctime} {levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOG_DIR / 'dashboard.log'),
            'maxBytes': 10 * 1024 * 1024,
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'pipeline': {'handlers': ['console', 'file'], 'level': 'INFO', 'propagate': False},
        'api': {'handlers': ['console', 'file'], 'level': 'INFO', 'propagate': False},
    },
}

# ---------------------------------------------------------------------------
# Accounting – fiscal year starts April (month 4) per Indian standard
# ---------------------------------------------------------------------------
ACCOUNTING_FY_START_MONTH = 4

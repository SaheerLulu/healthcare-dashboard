from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('api.auth_urls')),
    path('api/', include('api.urls')),
]

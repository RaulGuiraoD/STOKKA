"""
URL configuration for stokka_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from inventario import views
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views


urlpatterns = [
    path('admin/', admin.site.urls),
    
    # --- CORE / DASHBOARD ---
    path('', views.index, name='index'),
    path('login/', views.login_view, name='login'),

    # --- AUTENTICACIÓN ---
    path('registro/', views.registro_view, name='registro'),
    path('login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='login'), name='logout'),

    # --- PERFIL DE USUARIO ---
    path('perfil/', views.perfil_view, name='perfil'),
    path('perfil/editar/', views.editar_perfil_view, name='editar_perfil'),
    path('perfil/cambiar-foto/', views.cambiar_foto, name='cambiar_foto'),
    path('perfil/eliminar-foto/', views.eliminar_foto, name='eliminar_foto'),

    # --- GESTIÓN DE USUARIOS (ADMIN) ---
    path('gestion-usuarios/', views.gestion_usuarios, name='gestion_usuarios'),
    path('gestion-usuarios/editar/<int:user_id>/', views.editar_usuario_admin, name='editar_usuario_admin'),
    path('eliminar-usuario/<int:user_id>/', views.eliminar_usuario, name='eliminar_usuario'),

    # --- GESTIÓN DE INVENTARIO ---
    path('inventario/', views.inventario_view, name='inventario'),
    path('inventario/añadir/', views.añadir_producto, name='añadir_producto'),
    path('inventario/editar/<int:pk>/', views.editar_producto, name='editar_producto'),
    path('inventario/eliminar/<int:pk>/', views.eliminar_producto, name='eliminar_producto'),
    path('inventario/stock/subir/<int:pk>/', views.aumentar_stock, name='aumentar_stock'),
    path('inventario/stock/bajar/<int:pk>/', views.disminuir_stock, name='disminuir_stock'),
    path('inventario/eliminar-masivo/', views.eliminar_masivo, name='eliminar_masivo'),
    path('actualizar-stocks/', views.actualizar_stocks_ajax, name='actualizar_stocks_ajax'),

    # --- BARRA BUSQUEDA HEADER ---
    path('buscar/', views.buscador_global, name='buscador_global'),
]

# Esto es para que se vean el Logo y las Facturas en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

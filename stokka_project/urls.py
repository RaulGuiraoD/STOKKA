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
from django.shortcuts import render


urlpatterns = [
    path('admin/', admin.site.urls),
    
    # --- CORE ---
    path('', views.index, name='index'),
    path('equipo-stokka/', views.linkedin_team_view, name='linkedin_team'),

    # --- AUTENTICACIÓN ---
    path('login/', views.login_view, name='login'),
    path('seleccionar-empresa/', views.seleccionar_empresa, name='seleccionar_empresa'), 
    path('registro/', views.registro_bienvenida_view, name='registro'),
    path('registro/usuario/', views.registro_usuario_view, name='registro_usuario'),
    path('registro/empresa/', views.registro_empresa_view, name='registro_empresa'),

    # --- VERIFICACIÓN EMAIL Y RECUPERACIÓN CONTRASEÑA ---
    path('verificar-email/<uuid:token>/', views.verificar_email_view, name='verificar_email'),
    path('reenviar-verificacion/', views.reenviar_verificacion_view, name='reenviar_verificacion'),
    path('olvide-password/', views.olvide_password_view,  name='olvide_password'),
    path('recuperar-password/<uuid:token>/', views.resetear_password_view, name='resetear_password'),
    
    # --- FLUJO DE PAGO ---
    path('registro/pago/', views.pasarela_pago_view, name='pasarela_pago'),
    path('pago/cancelar/', views.cancelar_pago_view, name='cancelar_pago'), 
    
    # Logout 
    path('logout/', views.logout_view, name='logout'),

    # --- GESTIÓN DE EMPRESA (DUEÑO) ---
    path('empresa/',  views.empresa_view, name='empresa'),
    path('empresa/eliminar/', views.eliminar_empresa, name='eliminar_empresa'),
    path('empresa/desactivar/ahora/', views.desactivar_empresa_ahora, name='desactivar_empresa_ahora'),
    path('empresa/desactivar/fecha/', views.desactivar_empresa_fecha, name='desactivar_empresa_fecha'),
    path('empresa/desactivar/cancelar/', views.cancelar_desactivacion, name='cancelar_desactivacion'),
    path('empresa/reactivar/', views.reactivar_empresa, name='reactivar_empresa'),

    # --- PERFIL DE USUARIO ---
    path('perfil/', views.perfil_view, name='perfil'),
    path('perfil/editar/', views.editar_perfil_view, name='editar_perfil'),
    path('perfil/cambiar-foto/', views.cambiar_foto, name='cambiar_foto'),
    path('perfil/eliminar-foto/', views.eliminar_foto, name='eliminar_foto'),
    path('perfil/preferencias/daltonismo/', views.guardar_preferencia_daltonismo, name='pref_daltonismo'),
    path('perfil/preferencias/iconos/', views.guardar_preferencia_iconos, name='pref_iconos'),

    # --- GESTIÓN DE USUARIOS (DEUO/ADMIN) ---
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
    path('inventario/registrar-historial-rapido/<int:pk>/', views.registrar_historial_rapido, name='registrar_historial_rapido'),
    path('inventario/copia_seguridad/', views.copia_seguridad_view, name='copia_seguridad'),
    path('inventario/importar-csv/', views.importar_csv, name='importar_csv'),

    # --- BARRA BUSQUEDA HEADER ---
    path('buscar/', views.buscador_global, name='buscador_global'),

    # --- HISTORIAL ---
    path('historial_movimientos/', views.historial_movimientos, name='historial_movimientos'),
]

# Esto es para que se vean el Logo y las Facturas en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


def handler404(request, exception):
    return render(request, '404.html', status=404)

def handler403(request, exception):
    return render(request, '403.html', status=403)

def handler500(request):
    return render(request, '500.html', status=500)
# inventario/middleware.py
from django.shortcuts import redirect
from django.urls import reverse
from .models import Membresia

class PlanActivoMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user.is_authenticated:
            return self.get_response(request)

        urls_permitidas = [
            reverse('pasarela_pago'),
            reverse('cancelar_pago'),
            reverse('logout'),
            reverse('seleccionar_empresa'),
            reverse('registro'),
            reverse('registro_usuario'),
            reverse('registro_empresa'),
            '/admin/',
            '/static/',
            '/media/',
        ]

        if any(request.path.startswith(url) for url in urls_permitidas):
            return self.get_response(request)

        # Leemos la empresa activa desde la sesión, igual que el resto de la app
        empresa_id = request.session.get('empresa_activa_id')
        if not empresa_id:
            return self.get_response(request)

        try:
            membresia = request.user.membresias.select_related('empresa').get(empresa_id=empresa_id)
            empresa = membresia.empresa
            if not empresa.plan_activo:
                return redirect('pasarela_pago')
        except Membresia.DoesNotExist:
            pass

        return self.get_response(request)
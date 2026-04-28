# inventario/middleware.py
from django.shortcuts import redirect
from django.urls import reverse

class PlanActivoMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Si no está logueado, no hacemos nada (actua @login_required)
        if not request.user.is_authenticated:
            return self.get_response(request)

        # 2. Definimos las URLs permitidas 
        # Queremos que pueda entrar al pago, al logout y al admin de Django
        urls_permitidas = [
            reverse('pasarela_pago'),
            reverse('cancelar_pago'), 
            reverse('logout'),
            '/admin/',
            '/static/',  # <--- IMPORTANTE para que se vea bien el CSS en el pago
            '/media/',   # Por si tienes imágenes en el pago 
        ]

        # 3. Si su empresa NO ha pagado y no está en una URL permitida...
        if request.user.empresa and not request.user.empresa.plan_activo:
            if not any(request.path.startswith(url) for url in urls_permitidas):
                return redirect('pasarela_pago')

        return self.get_response(request)
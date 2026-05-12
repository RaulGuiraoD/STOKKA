from .models import Membresia, TemaEmpresa

def empresa_activa(request):
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        return {}

    empresa_id = request.session.get('empresa_activa_id')
    if not empresa_id:
        return {}

    try:
        membresia = request.user.membresias.select_related('empresa').get(empresa_id=empresa_id)
        empresa   = membresia.empresa

        tema, _ = TemaEmpresa.objects.get_or_create(empresa=empresa)

        return {
            'empresa':   empresa,
            'membresia': membresia,
            'es_jefe':   request.user.es_admin_o_dueño_en(empresa),
            'tema':      tema,
        }
    except Membresia.DoesNotExist:
        return {}
    except Exception:
        return {}
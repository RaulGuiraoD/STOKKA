from .models import Membresia

def empresa_activa(request):
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        return {}

    empresa_id = request.session.get('empresa_activa_id')
    if not empresa_id:
        return {}

    try:
        membresia = request.user.membresias.select_related('empresa').get(empresa_id=empresa_id)
        return {
            'empresa': membresia.empresa,
            'membresia': membresia,
            'es_jefe': request.user.es_admin_o_dueño_en(membresia.empresa),
        }
    except Membresia.DoesNotExist:
        return {}
    except Exception:
        # Captura cualquier otro error silenciosamente para no romper todas las páginas
        return {}
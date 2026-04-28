from .models import Membresia

def empresa_activa(request):
    """
    Inyecta empresa_activa y membresia_activa en todos los templates.
    Así base.html siempre tiene acceso a ellas sin que cada vista las pase.
    """
    if not request.user.is_authenticated:
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
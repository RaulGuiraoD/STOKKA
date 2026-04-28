# 1. Standard Library Imports
import json

# 2. Django Core & Common Imports
from django.contrib import messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import models, transaction
from django.utils.text import slugify
from django.db.models import Count, Max, Q, Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

# 3. Django Auth & Security
from django.contrib.auth import authenticate, get_user_model, login, update_session_auth_hash, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import check_password

# 4. Local App Imports
from .forms import EditarUsuarioAdminForm, ProductoForm, RegistroUsuarioForm, RegistroColaboradorForm
from .models import Perfil, Producto, Usuario, HistorialMovimiento, Empresa

# Esto detecta automáticamente el Usuario personalizado
User = get_user_model()

# PERMISOS DE ADMINISTRADOR
def admin_required(view_func):
    def _wrapped_view_func(request, *args, **kwarsg):
        if request.user.is_authenticated and (request.user.es_admin_o_dueño()):
            return view_func(request, *args, **kwarsg)
        raise PermissionDenied
    return _wrapped_view_func

# FUNCION PAGO REGISTRO
@login_required
def pasarela_pago_view(request):
    # Si la empresa ya está activa, no hace falta pagar, redirigimos al inicio
    if request.user.empresa and request.user.empresa.plan_activo:
        return redirect('index')

    if request.method == 'POST':
        empresa = request.user.empresa
        empresa.plan_activo = True
        empresa.save()
        
        messages.success(request, f"¡Pago confirmado! Empresa {empresa.nombre} activada.")
        return redirect('index')

    return render(request, 'registration/pago_ficticio.html')

def cancelar_pago_view(request):
    from django.contrib.auth import logout
    logout(request) 
    return redirect('registro') 

# LÓGICA DE GESTIÓN DE USUARIOS
@login_required
@admin_required
def gestion_usuarios(request):
    query = request.GET.get('q')
    
    # 1. FILTRADO POR EMPRESA: Solo usuarios de la misma empresa que el solicitante
    usuarios = User.objects.filter(empresa=request.user.empresa).order_by('id')
    
    if query:
        usuarios = usuarios.filter(
            Q(username__icontains=query) | 
            Q(first_name__icontains=query) | 
            Q(email__icontains=query)
        )

    if request.method == 'POST':
        form = RegistroColaboradorForm(request.POST, user_request=request.user)
        if form.is_valid():
            nuevo_usuario = form.save(commit=False)
            
            # 2. VÍNCULO AUTOMÁTICO: Asignamos la empresa del creador
            nuevo_usuario.empresa = request.user.empresa
            
            nuevo_usuario.set_password(form.cleaned_data['password'])
            nuevo_usuario.save()
            
            Perfil.objects.get_or_create(user=nuevo_usuario)
            messages.success(request, f"Usuario {nuevo_usuario.username} creado correctamente.")
            return redirect('gestion_usuarios')
        else:
            # Mantengo tu lógica de mensajes de error para el modal
            for field, errors in form.errors.items():
                for error in errors:
                    if field == '__all__':
                        messages.error(request, f"Error: {error}", extra_tags='open_add_modal')
                    else:
                        label = form.fields[field].label or field.capitalize()
                        messages.error(request, f"{label}: {error}", extra_tags='open_add_modal')
            return redirect('gestion_usuarios')
    else:
        form = RegistroColaboradorForm(user_request=request.user)

    return render(request, 'stokka/pages/gestion_usuarios.html', {
        'usuarios': usuarios,
        'form': form
    })

# LÓGICA DE GESTIÓN DE USUARIOS -> EDITAR USUARIOS
@login_required
@admin_required
def editar_usuario_admin(request, user_id):
    # Usamos get_object_or_404 por seguridad
    usuario_a_editar = get_object_or_404(User, id=user_id, empresa=request.user.empresa)
    
    # --- BLOQUE DE SEGURIDAD DE ACCESO ---
    # 1. Nadie puede editar al Dueño Supremo de la empresa, excepto él mismo
    if usuario_a_editar.es_dueño_supremo() and request.user != usuario_a_editar:
        messages.error(request, "El Fundador de la empresa es intocable.")
        return redirect('gestion_usuarios')
    
    # 2. Solo un Dueño puede editar a otros usuarios con rol 'dueño'
    if usuario_a_editar.rol == 'dueño' and not request.user.es_dueño():
        messages.error(request, "No tienes permisos para editar perfiles de nivel Dueño.")
        return redirect('gestion_usuarios')

    # --- PROCESAMIENTO DEL FORMULARIO ---
    if request.method == 'POST':
        form = EditarUsuarioAdminForm(request.POST, instance=usuario_a_editar, user_request=request.user)
        
        if form.is_valid():
            usuario = form.save(commit=False)
            nueva_clave = form.cleaned_data.get('password')
            
            # Gestión de Contraseña
            if nueva_clave:
                usuario.set_password(nueva_clave)
                if usuario.id == request.user.id:
                    update_session_auth_hash(request, usuario)
            
            # Protección de roles: El Dueño Supremo NO puede dejar de ser dueño
            if usuario.es_dueño_supremo():
                usuario.rol = 'dueño'

            usuario.save()
            messages.success(request, f"Usuario {usuario.username} actualizado con éxito.")
            return redirect('gestion_usuarios')
        else:
            # Si el formulario no es válido, mandamos los errores a los mensajes flash superiores
            for field, errors in form.errors.items():
                for error in errors:
                    for error in errors:
                        messages.error(request, f"{error}", extra_tags=f'open_admin_edit_modal_{usuario_a_editar.id}')
            return redirect('gestion_usuarios')
    else:
        form = EditarUsuarioAdminForm(instance=usuario_a_editar, user_request=request.user)
        
    return render(request, 'stokka/modales/editar_usuario_admin.html', {'form': form, 'usuario_editado': usuario_a_editar})

# LÓGICA DE GESTIÓN DE USUARIOS -> ELIMINAR USUARIO
@login_required
@admin_required
def eliminar_usuario(request, user_id):
    usuario_a_eliminar = get_object_or_404(User, id=user_id, empresa=request.user.empresa)

    # 1. El Dueño Supremo de cada empresa es inmortal
    if usuario_a_eliminar.es_dueño_supremo():
        messages.error(request, "El Fundador de la empresa no puede ser eliminado.")
        return redirect('gestion_usuarios')

    # 2. Solo el Dueño Supremo puede eliminar a otros 'dueños' (si los hay)
    if usuario_a_eliminar.rol == 'dueño' and not request.user.es_dueño_supremo():
        messages.error(request, "Solo el Fundador puede eliminar a otros usuarios de rango Dueño.")
        return redirect('gestion_usuarios')

    # 3. No auto-eliminación
    if request.user.id == usuario_a_eliminar.id:
        messages.error(request, "No puedes eliminarte a ti mismo.")
        return redirect('gestion_usuarios')

    if usuario_a_eliminar.rol == 'admin' and not request.user.es_dueño():
        messages.error(request, "Permisos insuficientes para eliminar administradores.")
        return redirect('gestion_usuarios')

    usuario_a_eliminar.delete()
    messages.success(request, "Usuario eliminado.")
    return redirect('gestion_usuarios')


# LÓGICA DEL INDEX 
@login_required
def index(request):
    productos = Producto.objects.filter(empresa=request.user.empresa)
    
    # 1. KPIs y Semáforo
    criticos_cont = 0
    aviso_cont = 0
    ok_cont = 0
    
    uds_criticas = 0
    uds_aviso = 0
    uds_ok = 0
    stock_total = 0

    for p in productos:
        stock_total += p.stock_actual
        if p.stock_actual <= p.umbrales_rojo:
            criticos_cont += 1
            uds_criticas += p.stock_actual
        elif p.stock_actual <= p.umbrales_amarillo:
            aviso_cont += 1
            uds_aviso += p.stock_actual
        else:
            ok_cont += 1
            uds_ok += p.stock_actual

    # 2. Top 5 y Recientes
    top_5 = productos.order_by('-stock_actual')[:5]
    ultimos = productos.order_by('-fecha_registro')[:5]
    
    # 3. Métricas extra para tarjetas (KPIs)
    # Productos sin referencia o referencia vacía
    sin_ref = productos.filter(models.Q(referencia__isnull=True) | models.Q(referencia='')).count()    # Productos creados en los últimos 7 días
    hace_una_semana = timezone.now() - timezone.timedelta(days=7)
    nuevos_7d = productos.filter(fecha_registro__gte=timezone.now() - timezone.timedelta(days=7)).count()

    stats_categoria = productos.values('nombre')[:5] # Ejemplo rápido
    # Lo ideal es: Producto.objects.values('categoria').annotate(total=Count('id'))
    # --- 4. ÚLTIMOS REGISTROS (NUEVO) ---
    ultimos_productos = productos.order_by('-fecha_registro')[:5]
    # 4. Lógica de Roles STOKKA

    es_jefe = request.user.es_admin_o_dueño()
    total_empleados = Usuario.objects.filter(rol='empleado').count() if es_jefe else 0

    context = {
        'semaforo_data': [criticos_cont, aviso_cont, ok_cont],
        'balance_data': [uds_criticas, uds_aviso, uds_ok], # DATOS REALES
        'nombres_top_json': json.dumps([p.nombre for p in top_5]),
        'valores_top_json': json.dumps([p.stock_actual for p in top_5]),
        'stock_total': stock_total,
        'sin_ref': sin_ref,
        'nuevos_7d': nuevos_7d,
        'ultimos_productos': ultimos_productos,
        'es_jefe': es_jefe,
        'total_empleados': total_empleados,
        'stats_categoria' : stats_categoria,
    }
    return render(request, 'stokka/pages/index.html', context)

# LÓGICA DE LA BARRA DE BUSQUEDA 
@login_required
def buscador_global(request):
    query = request.GET.get('q', '').strip()
    
    if not query:
        return redirect(request.META.get('HTTP_REFERER', 'index'))
    # Añadimos empresa=request.user.empresa para no buscar en datos ajenos
    if Producto.objects.filter(
        Q(empresa=request.user.empresa) & 
        (Q(nombre__icontains=query) | Q(referencia__icontains=query))
    ).exists():
        return redirect(f'/inventario/?q={query}')

    if request.user.es_admin_o_dueño():
        if Usuario.objects.filter(
            Q(empresa=request.user.empresa) & 
            (Q(username__icontains=query) | Q(first_name__icontains=query) | Q(email__icontains=query))
        ).exists():
            return redirect(f'/gestion-usuarios/?q={query}')

    messages.error(request, f"No se encontraron resultados para '{query}' en su empresa.")
    return redirect(request.META.get('HTTP_REFERER', 'index'))

# LÓGICA DEL LOGIN Y REGISTRO 
def login_view(request):
    if request.user.is_authenticated:
        return redirect('index')

    if request.method == 'POST':
        email_ingresado = request.POST.get('username')
        password_ingresado = request.POST.get('password')

        try:
            user_obj = User.objects.get(email=email_ingresado)
            user = authenticate(request, username=user_obj.username, password=password_ingresado)

            if user is not None:
                login(request, user)

                # Lógica de Recuérdame
                if request.POST.get('recordar'): # Asegúrate de que el checkbox en HTML tenga name="recordar"
                    # La sesión durará 2 semanas (o el tiempo que quieras en segundos)
                    request.session.set_expiry(1209600) 
                else:
                    # La sesión expira al cerrar el navegador
                    request.session.set_expiry(0)
                
                # Usamos el nombre si existe, si no, el nombre de usuario
                nombre_mostrar = user.first_name if user.first_name else user.username
                messages.success(request, f"¡Hola de nuevo, {nombre_mostrar}! Bienvenida/o a Stokka.")
                
                return redirect('index')
            else:
                messages.error(request, "La contraseña introducida es incorrecta.")
        
        except User.DoesNotExist:
            messages.error(request, "Este correo electrónico no está registrado en el sistema.")
        
        return redirect('login')

    return render(request, 'registration/login.html')

def logout_view(request):
    logout(request)
    # Al borrar la sesión, redirigimos al login
    return redirect('login')

def registro_view(request):
    if request.method == 'POST':    # 1. Recoger datos
        nombre = request.POST.get('first_name') # Cambiado de 'nombre' según tu nuevo HTML
        usuario = request.POST.get('username')   # Cambiado de 'usuario' según tu nuevo HTML
        email = request.POST.get('email')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        nombre_empresa = request.POST.get('nombre_empresa')

        # 1. Validación de campos obligatorios (doble seguridad)
        if not all([nombre, usuario, email, password, nombre_empresa]):
            return render(request, 'registration/registro.html', {
                'error': 'Faltan campos obligatorios para registrar tu empresa.',
                'datos': request.POST
            })

        if password != confirm_password:
             return render(request, 'registration/registro.html', {
                'error': 'Las contraseñas no coinciden.',
                'datos': request.POST
            })
        
        # 3. COMPROBACIONES (Usuario, Email y Empresa)
        if User.objects.filter(username=usuario).exists():
            return render(request, 'registration/registro.html', {
                'error': 'Ese nombre de usuario ya está cogido.',
                'datos': request.POST
            })

        # 4. COMPROBACIÓN de si existe ya el email y empresa
        if User.objects.filter(email=email).exists():
            return render(request, 'registration/registro.html', {
                'error': 'Este email ya está registrado.',
                'datos': request.POST
            })
        
        if Empresa.objects.filter(nombre__iexact=nombre_empresa).exists():
            return render(request, 'registration/registro.html', {
                'error': 'Ya existe una empresa registrada con ese nombre.',
                'datos': request.POST
            })

        # 5. Si todo está correcto, creamos el usuario
        try:
            with transaction.atomic():
                # A. Crear la Empresa
                nueva_empresa = Empresa.objects.create(
                    nombre=nombre_empresa,
                    slug=slugify(nombre_empresa),
                    plan_activo=False # Se activará en el paso de pago
                )

                # B. Crear el Usuario vinculado a la empresa
                nuevo_usuario = User.objects.create_user(
                    username=usuario,
                    email=email, 
                    password=password,
                    first_name=nombre,
                    empresa=nueva_empresa, # Vínculo vital
                    rol='dueño' # Siempre es dueño el que registra la empresa
                )
                
                # Permisos de gestión total para el creador
                nuevo_usuario.is_staff = True
                nuevo_usuario.is_superuser = True
                nuevo_usuario.save()

                # C. Crear Perfil
                Perfil.objects.create(user=nuevo_usuario)

                # 5. LOGIN Y REDIRECCIÓN
                login(request, nuevo_usuario)
                return redirect('pasarela_pago')

        except Exception as e:
            return render(request, 'registration/registro.html', {
                'error': f'Error en el registro de infraestructura: {e}',
                'datos': request.POST
            })
            
    return render(request, 'registration/registro.html')


# LÓGICA DEL PERFIL
# LÓGICA DE LA VISTA DEL PERFIL
@login_required
def perfil_view(request):
    # Aseguramos que el objeto perfil exista para pasárselo al template
    perfil, created = Perfil.objects.get_or_create(
        user=request.user,
        defaults={'empresa': request.user.empresa}
    )
    return render(request, 'stokka/pages/perfil.html', {'perfil': perfil})

# LÓGICA DE EDITAR PERFIL
@login_required
def editar_perfil_view(request):
    perfil = request.user.perfil
    if request.method == 'POST':
        nombre = request.POST.get('nombre')
        apellido = request.POST.get('apellido')
        email = request.POST.get('email')
        telefono = request.POST.get('telefono')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        
        # Validación de Email único
        if User.objects.filter(email=email).exclude(id=request.user.id).exists():
            messages.error(request, "Este email ya está en uso por otra cuenta.", extra_tags='open_edit_modal')
            return redirect('perfil')

        if password:
            if check_password(password, request.user.password):
                messages.error(request, "La nueva contraseña debe ser diferente a la actual.", extra_tags='open_edit_modal')
                return redirect('perfil')
            
            if password != confirm_password:
                messages.error(request, "Las nuevas contraseñas no coinciden.", extra_tags='open_edit_modal')
                return redirect('perfil')
            
            request.user.set_password(password)

        request.user.first_name = nombre
        request.user.last_name = apellido
        request.user.email = email
        perfil.telefono = telefono
        
        request.user.save()
        perfil.save()

        if password:
            update_session_auth_hash(request, request.user)

        messages.success(request, "Perfil actualizado con éxito.")
        return redirect('perfil')
    
    return render(request, 'stokka/modales/editar_perfil.html', {'perfil': perfil})


# LÓGICA DEL CAMBIO DE FOTO
@login_required
def cambiar_foto(request):
    if request.method == 'POST' and request.FILES.get('foto'):
        perfil, created = Perfil.objects.get_or_create(
            user=request.user,
            defaults={'empresa': request.user.empresa}
        )
        perfil.foto = request.FILES['foto']
        
        try:
            perfil.full_clean() 
            perfil.save()
            messages.success(request, "Foto de perfil actualizada.")
        except ValidationError:
            messages.error(request, "Error: La imagen es demasiado pesada (máximo 2MB).")
            
    return redirect('perfil')

# LÓGICA DE LA ELIMINACIÓN DE LA FOTO
@login_required
def eliminar_foto(request):
    if request.method == 'POST':
        perfil = request.user.perfil 
        perfil.foto.delete()
        perfil.save()   
    return redirect('perfil')

# LÓGICA DEL INVENTARIO
@login_required
def inventario_view(request):
    filtro = request.GET.get('filtro')
    query = request.GET.get('q')
    productos_queryset = Producto.objects.filter(empresa=request.user.empresa).order_by('-fecha_registro')
    max_stock_real = productos_queryset.aggregate(Max('stock_actual'))['stock_actual__max'] or 0

    if query:
        productos_queryset = productos_queryset.filter(
            models.Q(nombre__icontains=query) | 
            models.Q(referencia__icontains=query)
        )

    # Convertimos a lista solo después de filtrar por empresa en BD para los filtros de semáforo
    if filtro == 'critico':
        productos_final = [p for p in productos_queryset if p.semaforo == "critico"]
    elif filtro == 'aviso':
        productos_final = [p for p in productos_queryset if p.semaforo == "aviso"]
    else:
        productos_final = productos_queryset

    # formulario vacio que usará el modal de "Añadir"
    form_añadir = ProductoForm()

    return render(request, 'stokka/pages/inventario.html', {
        'productos': productos_final,
        'max_stock_real': max_stock_real,
        'filtro_actual': filtro,
        'query_actual': query,
        'form_añadir': form_añadir
    })

def actualizar_stocks_ajax(request):
    # Solo devolvemos stocks de la empresa del usuario
    productos = Producto.objects.filter(empresa=request.user.empresa)
    data = {
        p.id: {
            'stock': p.stock_actual,
            'color': p.semaforo
        } for p in productos
    }
    return JsonResponse(data)

@login_required
def añadir_producto(request):
    if request.method == 'POST':
        form = ProductoForm(request.POST, request.FILES)
        if form.is_valid():
            nuevo_p = form.save(commit=False)
            nuevo_p.empresa = request.user.empresa 
            nuevo_p.save()
            
            HistorialMovimiento.objects.create(
                producto_nombre=nuevo_p.nombre,
                producto_id=nuevo_p.id,
                usuario=request.user,
                empresa=request.user.empresa, 
                tipo_accion='CREACION',
                cambio=nuevo_p.stock_actual,
                stock_resultante=nuevo_p.stock_actual
            )
            messages.success(request, "Producto añadido correctamente")
            return redirect('inventario')
        else:
            productos = Producto.objects.filter(empresa=request.user.empresa)
            return render(request, 'stokka/pages/inventario.html', {
                'productos': productos,
                'form_añadir': form,
                'titulo': 'Inventario'
            })
    return redirect('inventario')

@login_required
def eliminar_producto(request, pk):
    producto = get_object_or_404(Producto, pk=pk, empresa=request.user.empresa)
    if request.method == 'POST':
        HistorialMovimiento.objects.create(
            producto_nombre=producto.nombre,
            producto_id=producto.id,
            usuario=request.user,
            empresa=request.user.empresa,
            tipo_accion='ELIMINACION',
            cambio=0,
            stock_resultante=0,
            detalles="Eliminación individual"
        )
        producto.delete()
        messages.success(request, "Producto eliminado.")
        return redirect('inventario')
    return render(request, 'stokka/pages/comfirmar_eliminar.html', {'producto': producto})

@login_required
def eliminar_masivo(request):
    if request.method == 'POST':
        ids_raw = request.POST.get('ids', '')
        if ids_raw:
            ids_list = ids_raw.split(',')
            productos_a_borrar = Producto.objects.filter(id__in=ids_list, empresa=request.user.empresa)
            
            cantidad = productos_a_borrar.count()
            for p in productos_a_borrar:
                HistorialMovimiento.objects.create(
                    producto_nombre=p.nombre,
                    producto_id=p.id,
                    usuario=request.user,
                    empresa=request.user.empresa, 
                    tipo_accion='ELIMINACION',
                    cambio=0,
                    stock_resultante=0,
                    detalles="Eliminación masiva"
                )
            productos_a_borrar.delete()
            messages.success(request, f"Se han eliminado {cantidad} productos correctamente.")
    return redirect('inventario')

@login_required
def editar_producto(request, pk):
    producto = get_object_or_404(Producto, pk=pk, empresa=request.user.empresa)
    
    if request.method == 'POST':
        # 1. Capturamos el estado REAL antes de cualquier cambio del formulario
        stock_inicial = producto.stock_actual
        nombre_inicial = producto.nombre
        ref_inicial = producto.referencia or "Sin referencia"
        aviso_inicial = producto.umbrales_amarillo
        critico_inicial = producto.umbrales_rojo

        form = ProductoForm(request.POST, request.FILES, instance=producto)
        
        if form.is_valid():
            producto_editado = form.save()
            
            # 2. Calcular diferencia de stock real
            diferencia = producto_editado.stock_actual - stock_inicial
            
            # 3. Detectar cambios para los detalles
            cambios = []
            if nombre_inicial != producto_editado.nombre:
                cambios.append(f"Nombre: {nombre_inicial} → {producto_editado.nombre}")
            
            if ref_inicial != (producto_editado.referencia or "Sin referencia"):
                cambios.append(f"Ref: {ref_inicial} → {producto_editado.referencia}")
            
            if aviso_inicial != producto_editado.umbrales_amarillo or critico_inicial != producto_editado.umbrales_rojo:
                cambios.append(f"Umbrales ajustados (Aviso: {aviso_inicial} → {producto_editado.umbrales_amarillo}, Crítico: {critico_inicial} → {producto_editado.umbrales_rojo})")

            detalles_final = "\n".join(cambios) if cambios else "Información general actualizada"

            # 4. REGISTRO EN HISTORIAL
            HistorialMovimiento.objects.create(
                producto_nombre=producto_editado.nombre,
                producto_id=producto_editado.id,
                usuario=request.user,
                empresa=request.user.empresa,
                tipo_accion='MODAL_EDITAR',
                cambio=diferencia,
                stock_anterior=stock_inicial,
                stock_resultante=producto_editado.stock_actual,
                detalles="Actualizado desde modal"
            )

            messages.success(request, f"Producto {producto.nombre} actualizado.")
            return redirect('inventario')
    else:
        form = ProductoForm(instance=producto)
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return render(request, 'stokka/modales/form_editar_parcial.html', {
            'form': form,
            'producto': producto
        })
    
    return render(request, 'stokka/pages/form_producto.html', {'form': form, 'titulo': 'Editar'})

@login_required
def aumentar_stock(request, pk):
    if request.method == 'POST':
        producto = get_object_or_404(Producto, pk=pk, empresa=request.user.empresa)
        producto.stock_actual += 1
        producto.save()
        
        # Respuesta AJAX para evitar recarga
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'stock_actual': producto.stock_actual, 'semaforo': producto.semaforo})
            
    return redirect('inventario')

@login_required
def disminuir_stock(request, pk):
    if request.method == 'POST':
        producto = get_object_or_404(Producto, pk=pk, empresa=request.user.empresa)
        if producto.stock_actual > 0:
            producto.stock_actual -= 1
            producto.save()
            
        # Respuesta AJAX para evitar recarga
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'stock_actual': producto.stock_actual, 'semaforo': producto.semaforo})
            
    return redirect('inventario')

# HISTORIAL
# HISTORIAL FUNCIONES RÁPIDAS
@login_required
def registrar_historial_rapido(request, pk):
    if request.method == 'POST':
        producto = get_object_or_404(Producto, pk=pk, empresa=request.user.empresa)
        delta = int(request.POST.get('delta', 0))
        
        if delta != 0:
            HistorialMovimiento.objects.create(
                producto_nombre=producto.nombre,
                producto_id=producto.id,
                usuario=request.user,
                empresa=request.user.empresa,
                tipo_accion='AJUSTE_RAPIDO',
                cambio=delta,
                stock_resultante=producto.stock_actual
            )
        return JsonResponse({'status': 'ok'})
    return JsonResponse({'status': 'error'}, status=400)

#HISTORIAL GENERAL
@login_required
def historial_movimientos(request):
    # Traemos los movimientos (el ordenamiento por fecha es vital)
    movimientos = HistorialMovimiento.objects.filter(empresa=request.user.empresa).select_related('usuario').order_by('-fecha')
    
    for mov in movimientos:
        mov.stock_anterior = mov.stock_resultante - mov.cambio
        
    return render(request, 'stokka/pages/historial.html', {'movimientos': movimientos})
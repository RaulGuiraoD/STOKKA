# 1. Standard Library Imports
import json

# 2. Django Core & Common Imports
from django.contrib import messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import models, transaction
from django.utils.text import slugify
from django.db.models import Max, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

# 3. Django Auth & Security
from django.contrib.auth import authenticate, get_user_model, login, update_session_auth_hash, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import check_password

# 4. Local App Imports
from .forms import EditarUsuarioAdminForm, ProductoForm, RegistroColaboradorForm, RegistroEmpresaForm, RegistroUsuarioNuevoForm
from .models import Perfil, Producto, Usuario, HistorialMovimiento, Empresa, Membresia

User = get_user_model()


# ==============================================================================
# HELPERS Y DECORADORES
# ==============================================================================

def get_empresa_activa(request):
    """
    Devuelve el objeto Empresa que el usuario eligió en el selector.
    Verifica que el usuario realmente tiene membresía en esa empresa.
    Devuelve None si no hay empresa en sesión o si la membresía no existe.
    """
    empresa_id = request.session.get('empresa_activa_id')
    if not empresa_id:
        return None
    try:
        membresia = request.user.membresias.select_related('empresa').get(empresa_id=empresa_id)
        return membresia.empresa
    except Membresia.DoesNotExist:
        return None


def get_membresia_activa(request, empresa):
    """
    Devuelve el objeto Membresia del usuario en la empresa activa.
    Útil para leer el rol o es_fundador dentro de las vistas.
    """
    if not empresa:
        return None
    return request.user.get_membresia(empresa)


def admin_required(view_func):
    """
    Decorador: solo dueños y admins de la empresa activa pueden acceder.
    Si no hay empresa activa en sesión, lanza PermissionDenied.
    """
    def _wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            raise PermissionDenied
        empresa = get_empresa_activa(request)
        if empresa and request.user.es_admin_o_dueño_en(empresa):
            return view_func(request, *args, **kwargs)
        raise PermissionDenied
    return _wrapped


# ==============================================================================
# SELECTOR DE EMPRESA
# Primera pantalla tras el login si el usuario tiene más de una empresa.
# ==============================================================================

@login_required
def seleccionar_empresa(request):
    membresias = request.user.membresias.select_related('empresa').all()
    total = membresias.count()

    # Sin ninguna empresa registrada
    if total == 0:
        messages.error(request, "Tu cuenta no tiene ninguna empresa registrada. Regístrala primero.")
        return render(request, 'registration/seleccionar_empresa.html', {
            'membresias': membresias,
            'sin_empresas': True,
        })

    # Una sola empresa: entramos directo sin mostrar selector
    if total == 1:
        request.session['empresa_activa_id'] = membresias.first().empresa.id
        return redirect('index')

    # Varias empresas: mostramos el selector
    if request.method == 'POST':
        empresa_id = request.POST.get('empresa_id', '').strip()
        if empresa_id and membresias.filter(empresa_id=empresa_id).exists():
            request.session['empresa_activa_id'] = int(empresa_id)
            return redirect('index')
        messages.error(request, "Empresa no válida. Selecciona una de la lista.")

    return render(request, 'registration/seleccionar_empresa.html', {'membresias': membresias})


# ==============================================================================
# PANTALLA DE BIENVENIDA AL REGISTRO
# Solo muestra dos botones: registrar usuario / registrar empresa
# ==============================================================================
def registro_bienvenida_view(request):
    if request.user.is_authenticated:
        return redirect('seleccionar_empresa')
    return render(request, 'registration/registro_bienvenida.html')


# ==============================================================================
# PASO 1: REGISTRAR USUARIO
# Crea la cuenta. No crea empresa ni membresía.
# Al terminar redirige a registro_empresa con el email en sesión.
# ==============================================================================
def registro_usuario_view(request):
    if request.user.is_authenticated:
        return redirect('seleccionar_empresa')

    if request.method == 'POST':
        form = RegistroUsuarioNuevoForm(request.POST)
        if form.is_valid():
            email      = form.cleaned_data['email']
            first_name = form.cleaned_data['first_name']
            last_name  = form.cleaned_data.get('last_name', '')
            password   = form.cleaned_data['password']

            try:
                with transaction.atomic():
                    nuevo_usuario = User.objects.create_user(
                        username=email,
                        email=email,
                        password=password,
                        first_name=first_name,
                        last_name=last_name,
                    )
                    Perfil.objects.create(user=nuevo_usuario)

                # Guardamos el email en sesión para prellenar el form de empresa
                request.session['email_registro'] = email
                messages.success(request, "¡Usuario creado! Ahora registra tu empresa.")
                return redirect('registro_empresa')

            except Exception as e:
                messages.error(request, f"Error al crear el usuario: {e}")
    else:
        form = RegistroUsuarioNuevoForm()

    return render(request, 'registration/registro_usuario.html', {'form': form})


# ==============================================================================
# PASO 2: REGISTRAR EMPRESA
# Detecta al usuario por email. Crea Empresa + Membresía como fundador/dueño.
# Funciona tanto para usuarios nuevos (viene del paso 1) como para usuarios
# ya existentes que quieren añadir una segunda empresa.
# ==============================================================================
def registro_empresa_view(request):
    # Prellenar email si viene del paso 1
    email_previo = request.session.get('email_registro', '')

    if request.method == 'POST':
        form = RegistroEmpresaForm(request.POST)
        if form.is_valid():
            email_usuario  = form.cleaned_data['email_usuario']
            nombre_empresa = form.cleaned_data['nombre_empresa']
            cif            = form.cleaned_data.get('cif', '')
            telefono       = form.cleaned_data.get('telefono', '')

            try:
                usuario = User.objects.get(email=email_usuario)
            except User.DoesNotExist:
                messages.error(request, "No se encontró el usuario.")
                return render(request, 'registration/registro_empresa.html', {'form': form})

            try:
                with transaction.atomic():
                    nueva_empresa = Empresa.objects.create(
                        nombre=nombre_empresa,
                        slug=slugify(nombre_empresa),
                        cif=cif,
                        telefono=telefono,
                        plan_activo=False,
                    )
                    Membresia.objects.create(
                        usuario=usuario,
                        empresa=nueva_empresa,
                        rol='dueño',
                        es_fundador=True,
                    )

                # Limpiamos el email de sesión
                request.session.pop('email_registro', None)

                # Login automático y empresa activa en sesión
                login(request, usuario)
                request.session['empresa_activa_id'] = nueva_empresa.id
                messages.success(request, f"Empresa '{nueva_empresa.nombre}' creada. Completa el pago para activarla.")
                return redirect('pasarela_pago')

            except Exception as e:
                messages.error(request, f"Error al crear la empresa: {e}")
    else:
        # Prellenamos el email si viene del paso 1
        form = RegistroEmpresaForm(initial={'email_usuario': email_previo})

    return render(request, 'registration/registro_empresa.html', {'form': form})


# ==============================================================================
# LOGIN / LOGOUT / REGISTRO
# ==============================================================================

def login_view(request):
    if request.user.is_authenticated:
        return redirect('seleccionar_empresa')

    if request.method == 'POST':
        email_ingresado    = request.POST.get('username', '').strip()
        password_ingresado = request.POST.get('password', '')

        if not email_ingresado or not password_ingresado:
            messages.error(request, "Introduce tu correo y contraseña.")
            return render(request, 'registration/login.html')

        try:
            user_obj = User.objects.get(email=email_ingresado)
            user     = authenticate(request, username=user_obj.username, password=password_ingresado)

            if user is not None:
                login(request, user)

                if request.POST.get('recordar'):
                    request.session.set_expiry(1209600)
                else:
                    request.session.set_expiry(0)

                nombre_mostrar = user.first_name if user.first_name else user.email
                messages.success(request, f"¡Hola de nuevo, {nombre_mostrar}! Bienvenido/a a Stokka.")
                return redirect('seleccionar_empresa')
            else:
                messages.error(request, "La contraseña introducida es incorrecta.")

        except User.DoesNotExist:
            messages.error(request, "Este correo electrónico no está registrado en el sistema.")

        return render(request, 'registration/login.html')

    return render(request, 'registration/login.html')

def logout_view(request):
    # Limpiamos también la empresa activa de la sesión
    request.session.pop('empresa_activa_id', None)
    logout(request)
    return redirect('login')


def registro_view(request):
    if request.method == 'POST':
        form = RegistroUsuarioNuevoForm(request.POST)
        if form.is_valid():
            nombre        = form.cleaned_data['first_name']
            email         = form.cleaned_data['email']
            password      = form.cleaned_data['password']
            nombre_empresa = form.cleaned_data['nombre_empresa']

            try:
                with transaction.atomic():
                    # 1. Crear empresa
                    nueva_empresa = Empresa.objects.create(
                        nombre=nombre_empresa,
                        slug=slugify(nombre_empresa),
                        plan_activo=False
                    )

                    # 2. Crear usuario — username = email (invisible para el usuario)
                    nuevo_usuario = User.objects.create_user(
                        username=email,
                        email=email,
                        password=password,
                        first_name=nombre,
                        is_staff=True,
                        is_superuser=True,
                    )

                    # 3. Crear membresía como fundador y dueño
                    Membresia.objects.create(
                        usuario=nuevo_usuario,
                        empresa=nueva_empresa,
                        rol='dueño',
                        es_fundador=True
                    )

                    # 4. Crear perfil
                    Perfil.objects.create(user=nuevo_usuario)

                    # 5. Login + empresa activa en sesión
                    login(request, nuevo_usuario)
                    request.session['empresa_activa_id'] = nueva_empresa.id
                    return redirect('pasarela_pago')

            except Exception as e:
                return render(request, 'registration/registro.html', {
                    'form': form,
                    'error': f'Error en el registro: {e}'
                })
        # Si el form no es válido, lo devolvemos con los errores
        return render(request, 'registration/registro.html', {'form': form})

    form = RegistroUsuarioNuevoForm()
    return render(request, 'registration/registro.html', {'form': form})


# ==============================================================================
# PASARELA DE PAGO (ficticia)
# ==============================================================================

@login_required
def pasarela_pago_view(request):
    empresa = get_empresa_activa(request)
    if not empresa:
        return redirect('seleccionar_empresa')

    if empresa.plan_activo:
        return redirect('index')

    if request.method == 'POST':
        empresa.plan_activo = True
        empresa.save()
        messages.success(request, f"¡Pago confirmado! Empresa '{empresa.nombre}' activada.")
        return redirect('index')

    return render(request, 'registration/pago_ficticio.html', {'empresa': empresa})


def cancelar_pago_view(request):
    request.session.pop('empresa_activa_id', None)
    logout(request)
    return redirect('registro')


# ==============================================================================
# INDEX
# ==============================================================================

@login_required
def index(request):
    empresa = get_empresa_activa(request)
    if not empresa:
        return redirect('seleccionar_empresa')

    membresia = get_membresia_activa(request, empresa)
    productos = Producto.objects.filter(empresa=empresa)

    criticos_cont = aviso_cont = ok_cont = 0
    uds_criticas = uds_aviso = uds_ok = stock_total = 0

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

    top_5            = productos.order_by('-stock_actual')[:5]
    ultimos_productos = productos.order_by('-fecha_registro')[:5]
    sin_ref          = productos.filter(Q(referencia__isnull=True) | Q(referencia='')).count()
    nuevos_7d        = productos.filter(fecha_registro__gte=timezone.now() - timezone.timedelta(days=7)).count()

    es_jefe = request.user.es_admin_o_dueño_en(empresa)
    # Total empleados solo de esta empresa
    total_empleados = Membresia.objects.filter(empresa=empresa, rol='empleado').count() if es_jefe else 0

    context = {
        'empresa': empresa,
        'membresia': membresia,
        'semaforo_data':    [criticos_cont, aviso_cont, ok_cont],
        'balance_data':     [uds_criticas, uds_aviso, uds_ok],
        'nombres_top_json': json.dumps([p.nombre for p in top_5]),
        'valores_top_json': json.dumps([p.stock_actual for p in top_5]),
        'stock_total':      stock_total,
        'sin_ref':          sin_ref,
        'nuevos_7d':        nuevos_7d,
        'ultimos_productos': ultimos_productos,
        'es_jefe':          es_jefe,
        'total_empleados':  total_empleados,
    }
    return render(request, 'stokka/pages/index.html', context)


# ==============================================================================
# BUSCADOR GLOBAL
# ==============================================================================

@login_required
def buscador_global(request):
    query = request.GET.get('q', '').strip()
    empresa = get_empresa_activa(request)

    if not query:
        return redirect(request.META.get('HTTP_REFERER', 'index'))

    if not empresa:
        return redirect('seleccionar_empresa')

    if Producto.objects.filter(
        Q(empresa=empresa) &
        (Q(nombre__icontains=query) | Q(referencia__icontains=query))
    ).exists():
        return redirect(f'/inventario/?q={query}')

    if request.user.es_admin_o_dueño_en(empresa):
        # Buscamos usuarios que tengan membresía en esta empresa
        usuarios_empresa = Membresia.objects.filter(empresa=empresa).values_list('usuario_id', flat=True)
        if User.objects.filter(
            Q(id__in=usuarios_empresa) &
            (Q(first_name__icontains=query) | Q(email__icontains=query))
        ).exists():
            return redirect(f'/gestion-usuarios/?q={query}')

    messages.error(request, f"No se encontraron resultados para '{query}'.")
    return redirect(request.META.get('HTTP_REFERER', 'index'))


# ==============================================================================
# GESTIÓN DE USUARIOS
# ==============================================================================

@login_required
@admin_required
def gestion_usuarios(request):
    empresa = get_empresa_activa(request)
    if not empresa:
        return redirect('seleccionar_empresa')

    membresia_activa = get_membresia_activa(request, empresa)
    query = request.GET.get('q')

    # Usuarios de esta empresa a través de sus membresías
    membresias_empresa = Membresia.objects.filter(empresa=empresa).select_related('usuario').order_by('id')

    if query:
        membresias_empresa = membresias_empresa.filter(
            Q(usuario__first_name__icontains=query) |
            Q(usuario__email__icontains=query)
        )

    if request.method == 'POST':
        # Pasamos la empresa activa al form para filtrar roles según permisos
        request.user._empresa_activa = empresa
        form = RegistroColaboradorForm(request.POST, user_request=request.user)

        if form.is_valid():
            email     = form.cleaned_data['email']
            password  = form.cleaned_data['password']
            first_name = form.cleaned_data['first_name']
            rol       = form.cleaned_data['rol']

            try:
                with transaction.atomic():
                    nuevo_usuario = User.objects.create_user(
                        username=email,  # username autogenerado, invisible
                        email=email,
                        password=password,
                        first_name=first_name,
                    )
                    Membresia.objects.create(
                        usuario=nuevo_usuario,
                        empresa=empresa,
                        rol=rol,
                        es_fundador=False
                    )
                    Perfil.objects.get_or_create(user=nuevo_usuario)
                    messages.success(request, f"Usuario {email} creado correctamente.")
            except Exception as e:
                messages.error(request, f"Error al crear el usuario: {e}", extra_tags='open_add_modal')

            return redirect('gestion_usuarios')

        else:
            for field, errors in form.errors.items():
                for error in errors:
                    label = form.fields[field].label if field != '__all__' else ''
                    messages.error(request, f"{label}: {error}".strip(': '), extra_tags='open_add_modal')
            return redirect('gestion_usuarios')

    else:
        request.user._empresa_activa = empresa
        form = RegistroColaboradorForm(user_request=request.user)

    return render(request, 'stokka/pages/gestion_usuarios.html', {
        'membresias': membresias_empresa,  # antes 'usuarios', ahora 'membresias'
        'form': form,
        'empresa': empresa,
        'membresia_activa': membresia_activa,
    })


# ==============================================================================
# EDITAR USUARIO (desde gestión de usuarios)
# ==============================================================================

@login_required
@admin_required
def editar_usuario_admin(request, user_id):
    empresa = get_empresa_activa(request)
    if not empresa:
        return redirect('seleccionar_empresa')

    membresia_editada = get_object_or_404(Membresia, usuario_id=user_id, empresa=empresa)
    usuario_a_editar  = membresia_editada.usuario
    es_ajax           = request.headers.get('x-requested-with') == 'XMLHttpRequest'

    # ── REGLAS DE ACCESO ──────────────────────────────────────────────────────
    # El dueño solo puede editarse a sí mismo desde esta sección.
    # Un admin solo puede editar empleados.
    # Nadie puede editar al fundador excepto él mismo.

    if membresia_editada.es_fundador and request.user != usuario_a_editar:
        messages.error(request, "El fundador de la empresa solo puede editarse a sí mismo.")
        return redirect('gestion_usuarios')

    if membresia_editada.rol == 'dueño' and request.user != usuario_a_editar:
        messages.error(request, "No tienes permisos para editar al Dueño.")
        return redirect('gestion_usuarios')

    if not request.user.es_dueño_en(empresa) and membresia_editada.rol != 'empleado':
        messages.error(request, "Los administradores solo pueden editar empleados.")
        return redirect('gestion_usuarios')

    # ── PROCESAMIENTO 
    if request.method == 'POST':
        form = EditarUsuarioAdminForm(
            request.POST,
            instance=usuario_a_editar,
            user_request=request.user,
            empresa_activa=empresa
        )

        if form.is_valid():
            usuario     = form.save(commit=False)
            nueva_clave = form.cleaned_data.get('password')

            if nueva_clave:
                usuario.set_password(nueva_clave)
                if usuario.pk == request.user.pk:
                    update_session_auth_hash(request, usuario)

            usuario.save()

            # El rol se guarda en Membresia, nunca en Usuario
            nuevo_rol = form.cleaned_data.get('rol')
            if nuevo_rol and not membresia_editada.es_fundador:
                membresia_editada.rol = nuevo_rol
                membresia_editada.save()

            messages.success(request, f"Usuario {usuario.email} actualizado con éxito.")
            return redirect('gestion_usuarios')

        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(
                        request, error,
                        extra_tags=f'open_admin_edit_modal_{usuario_a_editar.id}'
                    )
            return redirect('gestion_usuarios')

    else:
        form = EditarUsuarioAdminForm(
            instance=usuario_a_editar,
            user_request=request.user,
            empresa_activa=empresa
        )

    return render(request, 'stokka/modales/editar_usuario_admin.html', {
        'form':              form,
        'usuario_editado':   usuario_a_editar,
        'membresia_editada': membresia_editada,
    })


# ==============================================================================
# ELIMINAR USUARIO
# Elimina la membresía, no el usuario global.
# Si el usuario no tiene más membresías, se elimina también el usuario.
# ==============================================================================

@login_required
@admin_required
def eliminar_usuario(request, user_id):
    empresa = get_empresa_activa(request)
    if not empresa:
        return redirect('seleccionar_empresa')

    membresia = get_object_or_404(Membresia, usuario_id=user_id, empresa=empresa)
    usuario_a_eliminar = membresia.usuario

    # El fundador es inmortal en su empresa
    if membresia.es_fundador:
        messages.error(request, "El Fundador de la empresa no puede ser eliminado.")
        return redirect('gestion_usuarios')

    # No auto-eliminación
    if request.user.pk == usuario_a_eliminar.pk:
        messages.error(request, "No puedes eliminarte a ti mismo.")
        return redirect('gestion_usuarios')

    # Solo el fundador puede eliminar a otros dueños
    if membresia.rol == 'dueño' and not request.user.es_fundador_de(empresa):
        messages.error(request, "Solo el Fundador puede eliminar a otros Dueños.")
        return redirect('gestion_usuarios')

    # Solo un dueño puede eliminar admins
    if membresia.rol == 'admin' and not request.user.es_dueño_en(empresa):
        messages.error(request, "Permisos insuficientes para eliminar administradores.")
        return redirect('gestion_usuarios')

    # Eliminamos la membresía
    membresia.delete()

    # Si el usuario ya no pertenece a ninguna empresa, eliminamos también su cuenta
    if not usuario_a_eliminar.membresias.exists():
        usuario_a_eliminar.delete()
        messages.success(request, "Usuario eliminado completamente (no tenía más empresas).")
    else:
        messages.success(request, "Usuario eliminado de esta empresa.")

    return redirect('gestion_usuarios')


# ==============================================================================
# PERFIL
# ==============================================================================

@login_required
def perfil_view(request):
    perfil, _ = Perfil.objects.get_or_create(user=request.user)
    empresa   = get_empresa_activa(request)
    membresia = get_membresia_activa(request, empresa)
    return render(request, 'stokka/pages/perfil.html', {
        'perfil': perfil,
        'empresa': empresa,
        'membresia': membresia,
    })


@login_required
def editar_perfil_view(request):
    perfil = request.user.perfil
    if request.method == 'POST':
        nombre          = request.POST.get('nombre')
        apellido        = request.POST.get('apellido')
        email           = request.POST.get('email')
        telefono        = request.POST.get('telefono')
        password        = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')

        if User.objects.filter(email=email).exclude(pk=request.user.pk).exists():
            messages.error(request, "Este email ya está en uso.", extra_tags='open_edit_modal')
            return redirect('perfil')

        if password:
            if check_password(password, request.user.password):
                messages.error(request, "La nueva contraseña debe ser diferente.", extra_tags='open_edit_modal')
                return redirect('perfil')
            if password != confirm_password:
                messages.error(request, "Las contraseñas no coinciden.", extra_tags='open_edit_modal')
                return redirect('perfil')
            request.user.set_password(password)

        request.user.first_name = nombre
        request.user.last_name  = apellido
        request.user.email      = email
        # Mantenemos username sincronizado con email
        request.user.username   = email
        perfil.telefono = telefono

        request.user.save()
        perfil.save()

        if password:
            update_session_auth_hash(request, request.user)

        messages.success(request, "Perfil actualizado con éxito.")
        return redirect('perfil')

    return render(request, 'stokka/modales/editar_perfil.html', {'perfil': perfil})


@login_required
def cambiar_foto(request):
    if request.method == 'POST' and request.FILES.get('foto'):
        perfil, _ = Perfil.objects.get_or_create(user=request.user)
        perfil.foto = request.FILES['foto']
        try:
            perfil.full_clean()
            perfil.save()
            messages.success(request, "Foto de perfil actualizada.")
        except ValidationError:
            messages.error(request, "La imagen es demasiado pesada (máximo 2MB).")
    return redirect('perfil')


@login_required
def eliminar_foto(request):
    if request.method == 'POST':
        perfil = request.user.perfil
        perfil.foto.delete()
        perfil.save()
    return redirect('perfil')


# ==============================================================================
# INVENTARIO
# ==============================================================================

@login_required
def inventario_view(request):
    empresa = get_empresa_activa(request)
    if not empresa:
        return redirect('seleccionar_empresa')

    filtro = request.GET.get('filtro')
    query  = request.GET.get('q')
    productos_qs = Producto.objects.filter(empresa=empresa).order_by('-fecha_registro')
    max_stock_real = productos_qs.aggregate(Max('stock_actual'))['stock_actual__max'] or 0

    if query:
        productos_qs = productos_qs.filter(
            Q(nombre__icontains=query) | Q(referencia__icontains=query)
        )

    if filtro == 'critico':
        productos_final = [p for p in productos_qs if p.semaforo == "critico"]
    elif filtro == 'aviso':
        productos_final = [p for p in productos_qs if p.semaforo == "aviso"]
    else:
        productos_final = productos_qs

    return render(request, 'stokka/pages/inventario.html', {
        'productos':      productos_final,
        'max_stock_real': max_stock_real,
        'filtro_actual':  filtro,
        'query_actual':   query,
        'form_añadir':    ProductoForm(),
        'empresa':        empresa,
    })


@login_required
def actualizar_stocks_ajax(request):
    empresa = get_empresa_activa(request)
    if not empresa:
        return JsonResponse({})
    productos = Producto.objects.filter(empresa=empresa)
    data = {p.id: {'stock': p.stock_actual, 'color': p.semaforo} for p in productos}
    return JsonResponse(data)


@login_required
def añadir_producto(request):
    empresa = get_empresa_activa(request)
    if not empresa:
        return redirect('seleccionar_empresa')

    if request.method == 'POST':
        form = ProductoForm(request.POST, request.FILES)
        if form.is_valid():
            nuevo_p = form.save(commit=False)
            nuevo_p.empresa = empresa
            nuevo_p.save()
            HistorialMovimiento.objects.create(
                producto_nombre=nuevo_p.nombre,
                producto_id=nuevo_p.id,
                usuario=request.user,
                empresa=empresa,
                tipo_accion='CREACION',
                cambio=nuevo_p.stock_actual,
                stock_resultante=nuevo_p.stock_actual
            )
            messages.success(request, "Producto añadido correctamente.")
            return redirect('inventario')
        else:
            return render(request, 'stokka/pages/inventario.html', {
                'productos':   Producto.objects.filter(empresa=empresa),
                'form_añadir': form,
            })
    return redirect('inventario')


@login_required
def eliminar_producto(request, pk):
    empresa  = get_empresa_activa(request)
    producto = get_object_or_404(Producto, pk=pk, empresa=empresa)
    if request.method == 'POST':
        HistorialMovimiento.objects.create(
            producto_nombre=producto.nombre,
            producto_id=producto.id,
            usuario=request.user,
            empresa=empresa,
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
    empresa = get_empresa_activa(request)
    if not empresa:
        return redirect('seleccionar_empresa')

    if request.method == 'POST':
        ids_list = request.POST.get('ids', '').split(',')
        productos = Producto.objects.filter(id__in=ids_list, empresa=empresa)
        cantidad  = productos.count()
        for p in productos:
            HistorialMovimiento.objects.create(
                producto_nombre=p.nombre,
                producto_id=p.id,
                usuario=request.user,
                empresa=empresa,
                tipo_accion='ELIMINACION',
                cambio=0,
                stock_resultante=0,
                detalles="Eliminación masiva"
            )
        productos.delete()
        messages.success(request, f"Se han eliminado {cantidad} productos correctamente.")
    return redirect('inventario')


@login_required
def editar_producto(request, pk):
    empresa  = get_empresa_activa(request)
    producto = get_object_or_404(Producto, pk=pk, empresa=empresa)

    if request.method == 'POST':
        stock_inicial  = producto.stock_actual
        nombre_inicial = producto.nombre
        ref_inicial    = producto.referencia or "Sin referencia"
        aviso_inicial  = producto.umbrales_amarillo
        critico_inicial = producto.umbrales_rojo

        form = ProductoForm(request.POST, request.FILES, instance=producto)
        if form.is_valid():
            producto_editado = form.save()
            diferencia = producto_editado.stock_actual - stock_inicial

            cambios = []
            if nombre_inicial != producto_editado.nombre:
                cambios.append(f"Nombre: {nombre_inicial} → {producto_editado.nombre}")
            if ref_inicial != (producto_editado.referencia or "Sin referencia"):
                cambios.append(f"Ref: {ref_inicial} → {producto_editado.referencia}")
            if aviso_inicial != producto_editado.umbrales_amarillo or critico_inicial != producto_editado.umbrales_rojo:
                cambios.append(f"Umbrales: Aviso {aviso_inicial}→{producto_editado.umbrales_amarillo}, Crítico {critico_inicial}→{producto_editado.umbrales_rojo}")

            HistorialMovimiento.objects.create(
                producto_nombre=producto_editado.nombre,
                producto_id=producto_editado.id,
                usuario=request.user,
                empresa=empresa,
                tipo_accion='MODAL_EDITAR',
                cambio=diferencia,
                stock_anterior=stock_inicial,
                stock_resultante=producto_editado.stock_actual,
                detalles="\n".join(cambios) if cambios else "Información general actualizada"
            )
            messages.success(request, f"Producto '{producto_editado.nombre}' actualizado.")
            return redirect('inventario')
    else:
        form = ProductoForm(instance=producto)

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return render(request, 'stokka/modales/form_editar_parcial.html', {'form': form, 'producto': producto})

    return render(request, 'stokka/pages/form_producto.html', {'form': form, 'titulo': 'Editar'})


@login_required
def aumentar_stock(request, pk):
    empresa  = get_empresa_activa(request)
    producto = get_object_or_404(Producto, pk=pk, empresa=empresa)
    if request.method == 'POST':
        producto.stock_actual += 1
        producto.save()
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'stock_actual': producto.stock_actual, 'semaforo': producto.semaforo})
    return redirect('inventario')


@login_required
def disminuir_stock(request, pk):
    empresa  = get_empresa_activa(request)
    producto = get_object_or_404(Producto, pk=pk, empresa=empresa)
    if request.method == 'POST':
        if producto.stock_actual > 0:
            producto.stock_actual -= 1
            producto.save()
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'stock_actual': producto.stock_actual, 'semaforo': producto.semaforo})
    return redirect('inventario')


# ==============================================================================
# HISTORIAL
# ==============================================================================

@login_required
def registrar_historial_rapido(request, pk):
    empresa  = get_empresa_activa(request)
    producto = get_object_or_404(Producto, pk=pk, empresa=empresa)
    if request.method == 'POST':
        delta = int(request.POST.get('delta', 0))
        if delta != 0:
            HistorialMovimiento.objects.create(
                producto_nombre=producto.nombre,
                producto_id=producto.id,
                usuario=request.user,
                empresa=empresa,
                tipo_accion='AJUSTE_RAPIDO',
                cambio=delta,
                stock_resultante=producto.stock_actual
            )
        return JsonResponse({'status': 'ok'})
    return JsonResponse({'status': 'error'}, status=400)


@login_required
def historial_movimientos(request):
    empresa = get_empresa_activa(request)
    if not empresa:
        return redirect('seleccionar_empresa')

    movimientos = HistorialMovimiento.objects.filter(empresa=empresa).select_related('usuario').order_by('-fecha')
    for mov in movimientos:
        mov.stock_anterior = mov.stock_resultante - mov.cambio

    return render(request, 'stokka/pages/historial.html', {
        'movimientos': movimientos,
        'empresa': empresa,
    })
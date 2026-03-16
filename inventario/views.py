from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate, get_user_model, update_session_auth_hash
from .models import Producto, Perfil, Usuario
from django.contrib import messages
from django.core.exceptions import ValidationError
from django.core.exceptions import PermissionDenied
from .forms import RegistroUsuarioForm, EditarUsuarioAdminForm
from django.contrib.auth.hashers import check_password

# Esto detecta automáticamente el Usuario personalizado
User = get_user_model()

def admin_required(view_func):
    def _wrapped_view_func(request, *args, **kwarsg):
        if request.user.is_authenticated and (request.user.es_admin_o_dueño()):
            return view_func(request, *args, **kwarsg)
        raise PermissionDenied
    return _wrapped_view_func

@login_required
@admin_required
def gestion_usuarios(request):
    usuarios = User.objects.all().order_by('id')
    
    if request.method == 'POST':
        # Pasamos user_request aquí
        form = RegistroUsuarioForm(request.POST, user_request=request.user)
        if form.is_valid():
            nuevo_usuario = form.save(commit=False)
            nuevo_usuario.set_password(form.cleaned_data['password'])
            nuevo_usuario.save()
            Perfil.objects.get_or_create(user=nuevo_usuario)
            messages.success(request, f"Usuario {nuevo_usuario.username} creado.")
            return redirect('gestion_usuarios')
    else:
        # Y aquí también para el formulario vacío
        form = RegistroUsuarioForm(user_request=request.user)

    return render(request, 'stokka/gestion_usuarios.html', {
        'usuarios': usuarios,
        'form': form
    })

@login_required
@admin_required
def editar_usuario_admin(request, user_id):
    # Usamos get_object_or_404 por seguridad
    usuario_a_editar = get_object_or_404(User, id=user_id)
    
    # --- BLOQUE DE SEGURIDAD DE ACCESO ---
    # 1. Un Admin NO puede editar al Dueño Primario (ID 1)
    if usuario_a_editar.id == 1 and request.user.id != 1:
        messages.error(request, "El Dueño Fundador es intocable.")
        return redirect('gestion_usuarios')
    
    # 2. Solo el Dueño puede editar a otros usuarios con rol 'dueño'
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
                # Si el admin se edita a sí mismo, mantenemos la sesión activa
                if usuario.id == request.user.id:
                    update_session_auth_hash(request, usuario)
            
            # Protección de roles (Auto-degradación e ID 1)
            if usuario.id == request.user.id:
                usuario.rol = request.user.rol
            if usuario.id == 1:
                usuario.rol = 'dueño'

            usuario.save()
            messages.success(request, f"Usuario {usuario.username} actualizado con éxito.")
            return redirect('gestion_usuarios')
        else:
            # Si el formulario no es válido, mandamos los errores a los mensajes flash superiores
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{error}")
            # Importante: No redirigimos aquí, dejamos que baje al render final para mostrar el form con errores
    else:
        form = EditarUsuarioAdminForm(instance=usuario_a_editar, user_request=request.user)
        
    return render(request, 'stokka/editar_usuario_admin.html', {
        'form': form,
        'usuario_editado': usuario_a_editar
    })

@login_required
@admin_required
def eliminar_usuario(request, user_id):
    usuario_a_eliminar = User.objects.get(id=user_id)

    # 1. El Dueño Primario (ID 1) es el ÚNICO inmortal
    if usuario_a_eliminar.id == 1:
        messages.error(request, "El Dueño fundacional no puede ser eliminado.")
        return redirect('gestion_usuarios')

    # 2. Solo el Dueño Primario (ID 1) puede eliminar a otros usuarios con rol 'dueño'
    if usuario_a_eliminar.rol == 'dueño' and request.user.id != 1:
        messages.error(request, "Solo el Dueño primario puede eliminar a otros usuarios con rango de Dueño.")
        return redirect('gestion_usuarios')

    # 3. El resto de reglas se mantienen
    if request.user.id == user_id:
        messages.error(request, "No puedes eliminarte a ti mismo.")
        return redirect('gestion_usuarios')

    if usuario_a_eliminar.rol == 'admin' and not request.user.es_dueño():
        messages.error(request, "Permisos insuficientes para eliminar administradores.")
        return redirect('gestion_usuarios')

    usuario_a_eliminar.delete()
    messages.success(request, "Usuario eliminado.")
    return redirect('gestion_usuarios')

@login_required
def index(request):
    productos = Producto.objects.all()
    return render(request, 'stokka/index.html', {'productos': productos})

def login_view(request):
    if request.method == 'POST':
        email_ingresado = request.POST.get('username') # Asumimos que meten el email en el campo 'usuario'
        password_ingresado = request.POST.get('password')

        try:
            user_obj = User.objects.get(email=email_ingresado)
            user = authenticate(request, username=user_obj.username, password=password_ingresado)

            if user is not None:
                login(request, user)
                return redirect('index')
            else:
                return render(request, 'registration/login.html', {'error': 'Contraseña incorrecta'})
        except User.DoesNotExist:
            return render(request, 'registration/login.html', {'error': 'El email no está registrado'})
        
    return render(request, 'registration/login.html')

def registro_view(request):
    if request.method == 'POST':    # 1. Recoger datos
        nombre = request.POST.get('nombre')
        usuario = request.POST.get('usuario')
        email = request.POST.get('email')
        password = request.POST.get('password')
        apellido = request.POST.get('apellido', '')
        telefono = request.POST.get('telefono', '')

        # 2. Validación de campos obligatorios (doble seguridad)
        if not all([nombre, usuario, email, password]):
            return render(request, 'registration/registro.html', {
                'error': 'Faltan campos obligatorios.',
                'datos': request.POST
            })

        # 3. COMPROBACIÓN de si existe ya el nombre de usuario
        if User.objects.filter(username=usuario).exists():
            return render(request, 'registration/registro.html', {
                'error': 'Ese nombre de usuario ya está cogido. Prueba otro.',
                'datos': request.POST
            })

        # 4. COMPROBACIÓN de si existe ya el email
        if User.objects.filter(email=email).exists():
            return render(request, 'registration/registro.html', {
                'error': 'Este correo electrónico ya está registrado. Ingresa otro correo para registrarte o inicia sesión',
                'datos': request.POST
            })

        # 5. Si todo está correcto, creamos el usuario
        try:
            nuevo_usuario = User.objects.create_user(
                username=usuario,
                email=email, 
                password=password,
                first_name=nombre,
                last_name=apellido
            )
            
            # Asignar rol de dueño si es el primero
            if User.objects.count() == 1:
                nuevo_usuario.rol = 'dueño'
                nuevo_usuario.is_staff = True
                nuevo_usuario.is_superuser = True
            
            nuevo_usuario.save()

            # 6. Crear el Perfil asociado
            Perfil.objects.create(user=nuevo_usuario, telefono=telefono)

            login(request, nuevo_usuario)
            return redirect('index')

        except Exception as e:
            # Captura cualquier otro error inesperado para que no se rompa la web
            return render(request, 'registration/registro.html', {
                'error': f'Ocurrió un error inesperado: {e}'
            })
            
    return render(request, 'registration/registro.html')

#Funciones del PERFIL
@login_required
def perfil_view(request):
    # Aseguramos que el objeto perfil exista para pasárselo al template
    perfil, created = Perfil.objects.get_or_create(user=request.user)
    return render(request, 'stokka/perfil.html', {'perfil': perfil})

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
        
        if password:
            if check_password(password, request.user.password):
                messages.error(request, "La nueva contraseña debe ser diferente a la actual.")
                return render(request, 'stokka/editar_perfil.html', {'perfil': perfil})
            
            if password != confirm_password:
                messages.error(request, "Las nuevas contraseñas no coinciden.")
                return render(request, 'stokka/editar_perfil.html', {'perfil': perfil})
            
            # Si pasa las validaciones, la preparamos
            request.user.set_password(password)
            # No guardamos aún, lo haremos al final con el resto de datos

        # Actualizamos el resto de campos
        request.user.first_name = nombre
        request.user.last_name = apellido
        request.user.email = email
        perfil.telefono = telefono
        
        request.user.save()
        perfil.save()

        # Si hubo cambio de contraseña, actualizamos sesión
        if password:
            update_session_auth_hash(request, request.user)

        messages.success(request, "Perfil actualizado con éxito.")
        return redirect('perfil')
    
    return render(request, 'stokka/editar_perfil.html', {'perfil': perfil})

@login_required
def cambiar_foto(request):
    if request.method == 'POST' and request.FILES.get('foto'):
        perfil, created = Perfil.objects.get_or_create(user=request.user)
        perfil.foto = request.FILES['foto']
        
        try:
            perfil.full_clean() # Esto dispara el validador de los 2MB
            perfil.save()
            messages.success(request, "Foto de perfil actualizada.")
        except ValidationError as e:
            # e.message_dict['foto'][0] suele traer el texto del error
            messages.error(request, "Error: La imagen es demasiado pesada (máximo 2MB).")
            
    return redirect('perfil')

@login_required
def eliminar_foto(request):
    if request.method == 'POST':
        perfil = request.user.perfil 
        perfil.foto.delete()
        perfil.save()   
    return redirect('perfil')

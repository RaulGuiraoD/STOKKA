from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate, get_user_model
from .models import Producto, Perfil, Usuario
from django.contrib import messages
from django.core.exceptions import PermissionDenied
from .forms import RegistroUsuarioForm

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
    form = RegistroUsuarioForm() # Siempre inicializamos el form aquí

    if request.method == 'POST':
        form = RegistroUsuarioForm(request.POST)
        if form.is_valid():
            nuevo_usuario = form.save(commit=False)
            nuevo_usuario.set_password(form.cleaned_data['password'])
            nuevo_usuario.save()
            Perfil.objects.get_or_create(user=nuevo_usuario)
            messages.success(request, f"Usuario {nuevo_usuario.username} creado.")
            return redirect('gestion_usuarios')

    return render(request, 'stokka/gestion_usuarios.html', {
        'usuarios': usuarios,
        'form': form
    })

@login_required
@admin_required
def eliminar_usuario(request, user_id):
    # Evitar que un usuario se elimine a sí mismo
    if request.user.id == user_id:
        messages.error(request, "No puedes darte de baja a ti mismo.")
        return redirect('gestion_usuarios')
    
    usuario = User.objects.get(id=user_id)
    # Solo el dueño puede eliminar a otros admins
    if usuario.rol == 'dueño':
        messages.error(request, "No se puede eliminar al dueño del sistema.")
    else:
        usuario.delete()
        messages.success(request, "Usuario eliminado correctamente.")
        
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
    perfil, created = Perfil.objects.get_or_create(user=request.user)
    
    if request.method == 'POST':
        request.user.first_name = request.POST.get('nombre')
        request.user.last_name = request.POST.get('apellido')
        request.user.email = request.POST.get('email')
        request.user.save() 

        perfil.telefono = request.POST.get('telefono')
        perfil.save() 

        return redirect('perfil')
    
    return render(request, 'stokka/editar_perfil.html', {'perfil': perfil})

@login_required
def cambiar_foto(request):
    if request.method == 'POST' and request.FILES.get('foto'):
        perfil, created = Perfil.objects.get_or_create(user=request.user)
        perfil.foto = request.FILES['foto']
        perfil.save()
    return redirect('perfil')

@login_required
def eliminar_foto(request):
    if request.method == 'POST':
        perfil = request.user.perfil 
        perfil.foto.delete()
        perfil.save()   
    return redirect('perfil')

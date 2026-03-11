from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth import login, authenticate
from .models import Producto, Perfil
from django.contrib import messages

@login_required  # redirige al login si no hay sesión
def index(request):
    productos = Producto.objects.all()
    return render(request, 'stokka/index.html', {'productos': productos})

def login_view(request):
    if request.method == 'POST':
        email_ingresado = request.POST.get('username')
        password_ingresado = request.POST.get('password')

        try:
            user_obj = User.objects.get(email=email_ingresado)
            user = authenticate(request, username=user_obj.username, password=password_ingresado)

            if user is not None:
                login(request, user)
                return redirect('index')
            else:
                return render(request, 'regristation/login.html', {'error': 'Contraseña incorrecta'})
        except User.DoesNotExist:
            return render(request, 'registration/login.html', {'error': 'El email no está registrado'})
        
    return render(request, 'registration/login.html')

def registro_view(request):
    if request.method == 'POST':
        # Los 6 campos del formulario
        nombre = request.POST.get('nombre')
        apellido = request.POST.get('apellido') 
        usuario = request.POST.get('usuario')
        email = request.POST.get('email')
        password = request.POST.get('password')
        telefono = request.POST.get('telefono') 

        #Validación si el usuario o email existen
        if User.objects.filter(username=usuario).exists():
            return render(request, 'registration/registro.html', {'error': 'El nombre de usuario ya existe'})

        # Creamos el usuario
        nuevo_usuario = User.objects.create_user(
            username=usuario,
            email=email, 
            password=password,
            first_name = nombre,
            last_name = apellido
        )
        
        # Lógica de Administrador para el primero
        if User.objects.count() == 1:
            nuevo_usuario.is_staff = True
            nuevo_usuario.is_superuser = True
        
        nuevo_usuario.save()

        login(request, nuevo_usuario)
        return redirect('index')
        
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
        # Guardamos datos del User
        request.user.first_name = request.POST.get('nombre')
        request.user.last_name = request.POST.get('apellido')
        request.user.email = request.POST.get('email')
        request.user.save()

        # AQUÍ LA CLAVE: Asignar al objeto perfil, no al request
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

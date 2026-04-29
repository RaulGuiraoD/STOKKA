from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password

from .models import Producto, Empresa, Membresia, Usuario

User = get_user_model()

# class RegistroUsuarioForm(forms.Form):
#     first_name = forms.CharField(
#         label="Nombre",
#         widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Tu nombre'})
#     )
#     email = forms.EmailField(
#         label="Email Corporativo",
#         required=True,
#         widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'ejemplo@stokka.com'})
#     )
#     password = forms.CharField(
#         label="Contraseña",
#         widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'mínimo 8 caracteres'})
#     )
#     confirm_password = forms.CharField(
#         label="Confirmar Contraseña",
#         widget=forms.PasswordInput(attrs={'class': 'form-control'})
#     )
#     nombre_empresa = forms.CharField(
#         label="Nombre de tu Empresa",
#         widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ej: Stokka Logistics'})
#     )

#     def clean_email(self):
#         email = self.cleaned_data.get('email')
#         if User.objects.filter(email=email).exists():
#             raise forms.ValidationError("Este email ya está registrado.")
#         return email

#     def clean_nombre_empresa(self):
#         nombre = self.cleaned_data.get('nombre_empresa')
#         if Empresa.objects.filter(nombre__iexact=nombre).exists():
#             raise forms.ValidationError("Este nombre de empresa ya está registrado.")
#         return nombre

#     def clean(self):
#         cleaned_data = super().clean()
#         password = cleaned_data.get("password")
#         confirm_password = cleaned_data.get("confirm_password")
#         if password and confirm_password and password != confirm_password:
#             self.add_error('confirm_password', "Las contraseñas no coinciden.")
#         return cleaned_data

    
class EditarUsuarioAdminForm(forms.ModelForm):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control stokka-input shadow-none',
            'placeholder': 'Nueva contraseña',
            'oninput': "checkInput(this, 'toggleIconAdmin1')"
        }),
        required=False,
        label="Nueva contraseña"
    )
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control stokka-input shadow-none',
            'placeholder': 'Repite la contraseña',
            'oninput': "checkInput(this, 'toggleIconAdmin2')"
        }),
        required=False,
        label="Confirmar Nueva contraseña"
    )
    # rol suelto, no del modelo Usuario
    rol = forms.ChoiceField(
        choices=Membresia.ROL_CHOICES,
        label="Rol",
        widget=forms.Select(attrs={'class': 'form-select'})
    )

    class Meta:
        model = User
        # username fuera: ya no lo edita el usuario ni el admin
        fields = ['first_name', 'last_name', 'email']
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name':  forms.TextInput(attrs={'class': 'form-control'}),
            'email':      forms.EmailInput(attrs={'class': 'form-control'}),
        }

    def __init__(self, *args, **kwargs):
        user_request   = kwargs.pop('user_request', None)
        empresa_activa = kwargs.pop('empresa_activa', None)
        super().__init__(*args, **kwargs)

        self.fields['first_name'].required = True
        self.fields['email'].required = True

        # Precargamos el rol actual de la membresía del usuario editado
        if self.instance and empresa_activa:
            membresia = self.instance.get_membresia(empresa_activa)
            if membresia:
                self.fields['rol'].initial = membresia.rol

        if self.instance and user_request and empresa_activa:
            # No puedes cambiar tu propio rol
            if self.instance.pk == user_request.pk:
                self.fields['rol'].disabled = True
                self.fields['rol'].help_text = "No puedes cambiar tu propio rol."

            # El fundador de la empresa no puede perder su rol
            if self.instance.es_fundador_de(empresa_activa):
                self.fields['rol'].disabled = True

        # Los admins no pueden asignar rol dueño
        if user_request and empresa_activa and not user_request.es_dueño_en(empresa_activa):
            self.fields['rol'].disabled = True
            self.fields['rol'].help_text = "Solo el Dueño puede cambiar roles."

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")

        if password or confirm_password:
            if password != confirm_password:
                self.add_error('confirm_password', "Las contraseñas no coinciden.")

        if password and self.instance.pk:
            if check_password(password, self.instance.password):
                self.add_error('password', "La nueva contraseña debe ser diferente a la actual.")

        return cleaned_data

    def clean_email(self):
        email = self.cleaned_data.get('email')
        usuario_id = self.instance.pk if self.instance else None
        if User.objects.filter(email=email).exclude(pk=usuario_id).exists():
            raise forms.ValidationError("Este email ya está en uso por otro usuario.")
        return email

    
# LÓGICA DEL FORMULARIO PARA LOS PRODUCTOS
class ProductoForm(forms.ModelForm):
    class Meta:
        model = Producto
        fields = ['nombre', 'referencia', 'descripcion', 'stock_actual', 'umbrales_amarillo', 'umbrales_rojo', 'factura']
        widgets = {
            'nombre': forms.TextInput(attrs={'class': 'firn-control', 'placeholder': 'Ej: Lápices'}),
            'referencia': forms.TextInput(attrs={'class': 'form-control'}),
            'descripcion': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
            'stock_actual': forms.NumberInput(attrs={'class': 'form-control'}),
            'umbrales_amarillo': forms.NumberInput(attrs={'class': 'form-control'}),
            'umbrales_rojo': forms.NumberInput(attrs={'class': 'form-control'}),
            'factura': forms.ClearableFileInput(attrs={'class': 'form-control'}),
        }
    
    def clean(self):
        cleaned_data = super().clean()
        amarillo = cleaned_data.get("umbrales_amarillo")
        rojo = cleaned_data.get("umbrales_rojo")

        if amarillo is not None and rojo is not None and amarillo <= rojo:
            self.add_error('umbrales_amarillo', "Debe ser mayor al umbral crítico")
        
        return cleaned_data
    

# ==============================================================================
# CREAR COLABORADOR (desde gestión de usuarios, por un dueño o admin)
# Sin username visible: la vista lo genera con el email.
# El rol es un ChoiceField suelto — la vista lo usa para crear la Membresia.
# ==============================================================================
class RegistroColaboradorForm(forms.ModelForm):
     
    email = forms.EmailField(
        label="Correo electrónico",
        widget=forms.EmailInput(attrs={'class': 'form-control rounded-3 border-0 bg-light py-2'})
    )
    password = forms.CharField(
        label="Contraseña",
        widget=forms.PasswordInput(attrs={'class': 'form-control rounded-3 border-0 bg-light py-2'})
    )
    confirm_password = forms.CharField(
        label="Confirmar Contraseña",
        widget=forms.PasswordInput(attrs={'class': 'form-control rounded-3 border-0 bg-light py-2'})
    )
    # rol vive en Membresia, no en Usuario, pero lo recogemos aquí para comodidad.
    # La vista leerá form.cleaned_data['rol'] y creará la Membresia con ese valor.
    rol = forms.ChoiceField(
        choices=Membresia.ROL_CHOICES,
        label="Rol del Usuario",
        widget=forms.Select(attrs={'class': 'form-select rounded-3 border-0 bg-light py-2'})
    )

    class Meta:
        model = Usuario
        # username fuera: lo generamos en la vista con el email.
        # rol fuera del Meta: no es campo de Usuario, es ChoiceField suelto arriba.
        fields = ['first_name', 'email']
        labels = {
            'first_name': 'Nombre Completo',
            'email': 'Correo Electrónico',
        }
        widgets = {
            'first_name': forms.TextInput(attrs={
                'class': 'form-control rounded-3 border-0 bg-light py-2',
                'placeholder': 'Ej: Empleado 1'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'form-control rounded-3 border-0 bg-light py-2',
                'placeholder': 'correo@empresa.com'
            }),
        }

    def __init__(self, *args, **kwargs):
        user_request = kwargs.pop('user_request', None)
        super().__init__(*args, **kwargs)
        self.fields['first_name'].required = True

        # El rol 'dueño' nunca es creable desde este form, por nadie.
        choices_base = [c for c in Membresia.ROL_CHOICES if c[0] != 'dueño']

        if user_request and not user_request.es_dueño_en(user_request._empresa_activa):
            # Los admins solo pueden crear empleados
            self.fields['rol'].choices = [c for c in choices_base if c[0] == 'empleado']
        else:
            # El dueño puede crear admins y empleados
            self.fields['rol'].choices = choices_base


    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("Este email ya está en uso.")
        return email

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")
        if password and confirm_password and password != confirm_password:
            self.add_error('confirm_password', "Las contraseñas no coinciden.")
        return cleaned_data

# ==============================================================================
# REGISTRO PASO 1: solo el usuario
# Campos: nombre, apellido, email, contraseña, confirmar contraseña
# El username se genera automáticamente con el email en la vista.
# ==============================================================================
class RegistroUsuarioNuevoForm(forms.Form):
    first_name = forms.CharField(
        label="Nombre",
        widget=forms.TextInput(attrs={
            'class': 'form-control border-0 rounded-2 py-2',
            'placeholder': 'Nombre',
        })
    )
    last_name = forms.CharField(
        label="Apellido",
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control border-0 rounded-2 py-2',
            'placeholder': 'Apellido',
        })
    )
    email = forms.EmailField(
        label="Correo electrónico",
        widget=forms.EmailInput(attrs={
            'class': 'form-control border-0 rounded-2 py-2',
            'placeholder': 'ejemplo@stokka.com',
        })
    )
    password = forms.CharField(
        label="Contraseña",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control border-0 rounded-2 py-2 pe-5 shadow-none',
            'placeholder': '**********',
            'id': 'id_password',
        })
    )
    confirm_password = forms.CharField(
        label="Confirmar contraseña",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control border-0 rounded-2 py-2 pe-5 shadow-none',
            'placeholder': '**********',
            'id': 'id_confirm_password',
        })
    )

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("Este correo ya tiene una cuenta en Stokka.")
        return email

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm = cleaned_data.get('confirm_password')
        if password and confirm and password != confirm:
            self.add_error('confirm_password', "Las contraseñas no coinciden.")
        return cleaned_data


# ==============================================================================
# REGISTRO PASO 2: solo la empresa
# Detecta al usuario por su email (ya debe existir).
# ==============================================================================
class RegistroEmpresaForm(forms.Form):
    email_usuario = forms.EmailField(
        label="Tu correo registrado en Stokka",
        widget=forms.EmailInput(attrs={
            'class': 'form-control border-0 rounded-2 py-2',
            'placeholder': 'ejemplo@stokka.com',
        })
    )
    nombre_empresa = forms.CharField(
        label="Nombre de la empresa",
        widget=forms.TextInput(attrs={
            'class': 'form-control border-0 rounded-2 py-2',
            'placeholder': 'Ej: Stokka Logistics',
        })
    )
    cif = forms.CharField(
        label="CIF / NIF",
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control border-0 rounded-2 py-2',
            'placeholder': 'Ej: B12345678 ',
        })
    )
    telefono = forms.CharField(
        label="Teléfono de contacto",
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control border-0 rounded-2 py-2',
            'placeholder': '+34 600 000 000 ',
        })
    )

    def clean_email_usuario(self):
        email = self.cleaned_data.get('email_usuario')
        if not User.objects.filter(email=email).exists():
            raise forms.ValidationError("No existe ninguna cuenta con ese correo. Regístrate primero como usuario.")
        return email

    def clean_nombre_empresa(self):
        nombre = self.cleaned_data.get('nombre_empresa')
        if Empresa.objects.filter(nombre__iexact=nombre).exists():
            raise forms.ValidationError("Ya existe una empresa registrada con ese nombre.")
        return nombre
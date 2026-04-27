from django import forms
from .models import Producto, Empresa
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password

User = get_user_model()

class RegistroUsuarioForm(forms.ModelForm):
    password = forms.CharField(
        label="Contraseña",
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'mínimo 8 caracteres'})
    )
    confirm_password = forms.CharField(
        label="Confirmar Contraseña",
        widget=forms.PasswordInput(attrs={'class': 'form-control'})
    )
    email = forms.EmailField(
        label="Email Corporativo",
        required=True, 
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'ejemplo@stokka.com'})
    )
    nombre_empresa = forms.CharField(
        label="Nombre de tu Empresa",
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ej: Stokka Logistics'})
    )

    class Meta:
        model = User
        fields = ['username', 'first_name', 'email', 'password']
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'rol': forms.Select(attrs={'class': 'form-select'}),
        }

    def __init__(self, *args, **kwargs):
        user_request = kwargs.pop('user_request', None) # Extraer antes del super
        super().__init__(*args, **kwargs)
        self.fields['first_name'].required = True
        if user_request and not user_request.es_dueño():
            self.fields['rol'].choices = [c for c in User.ROL_CHOICES if c[0] != 'dueño']

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")
        email = cleaned_data.get("email")

        if not email:
            self.add_error('email', "El correo electrónico es imprescindible para el acceso.")

        if password and confirm_password and password != confirm_password:
            self.add_error('confirm_password', "Las contraseñas no coinciden")
        return cleaned_data
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        usuario_id = self.instance.id if self.instance else None
        if User.objects.filter(email=email).exclude(id=usuario_id).exists():
            raise forms.ValidationError("Este email ya está en uso por otro usuario.")
        return email
    
    def clean_nombre_empresa(self):
        nombre = self.cleaned_data.get('nombre_empresa')
        if Empresa.objects.filter(nombre__iexact=nombre).exists():
            raise forms.ValidationError("Este nombre de empresa ya está registrado.")
        return nombre
    
class EditarUsuarioAdminForm(forms.ModelForm):

    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control stokka-input shadow-none', 
            'placeholder': 'Nueva contraseña',
            'oninput': "checkInput(this, 'toggleIconAdmin1')" # 'this' pasa el elemento actual
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

    email = forms.EmailField(required=True, widget=forms.EmailInput(attrs={'class': 'form-control'}))
    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'rol']
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'rol': forms.Select(attrs={'class': 'form-select'}),
        }

    def __init__(self, *args, **kwargs):
        user_request = kwargs.pop('user_request', None)
        super().__init__(*args, **kwargs)
        
        if self.instance and user_request:
            # REGLA: No puedes cambiar tu propio rol (evita errores 403 y pérdida de acceso)
            if self.instance.id == user_request.id:
                self.fields['rol'].disabled = True
                self.fields['rol'].help_text = "No puedes cambiar tu propio rol para evitar bloqueos de acceso."
                
            
            # REGLA: El Dueño Primario (ID 1) es inamovible
            if self.instance.id == 1:
                self.fields['rol'].disabled = True
            
            # REGLA: El ID 1 puede cambiar el rol de OTROS dueños
            elif user_request.id == 1:
                self.fields['rol'].disabled = False

        if user_request and not user_request.es_dueño():
            self.fields['rol'].choices = [c for c in User.ROL_CHOICES if c[0] != 'dueño']

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")

        # 1. Validación: Coincidencia de campos
        if password or confirm_password:
            if password != confirm_password:
                self.add_error('confirm_password', "Las contraseñas no coinciden.")

        # 2. Validación: Diferente a la actual
        if password and self.instance.pk:
            if check_password(password, self.instance.password):
                self.add_error('password', "La nueva contraseña debe ser diferente a la que está en uso.")
    
        return cleaned_data

    def clean_email(self):
        email = self.cleaned_data.get('email')
        usuario_id = self.instance.id if self.instance else None
        if User.objects.filter(email=email).exclude(id=usuario_id).exists():
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
    
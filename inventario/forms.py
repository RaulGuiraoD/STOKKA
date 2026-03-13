from django import forms
from django.contrib.auth import get_user_model

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

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'rol', 'password']
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
        if user_request and not user_request.es_dueño():
            self.fields['rol'].choices = [c for c in User.ROL_CHOICES if c[0] != 'dueño']

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")
        if password != confirm_password:
            raise forms.ValidationError("Las contraseñas no coinciden")
        return cleaned_data
    
class EditarUsuarioAdminForm(forms.ModelForm):
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
        
        if user_request and not user_request.es_dueño():
            self.fields['rol'].choices = [c for c in User.ROL_CHOICES if c[0] != 'dueño']

        if self.instance and self.instance.es_dueño():
            self.fields['rol'].disabled = True
            self.fields['rol'].help_text = "El rol de Dueño es permanente para este usuario."

    def clean_email(self):
        email = self.cleaned_data.get('email')
        usuario_id = self.instance.id
        if User.objects.filter(email=email).exclude(id=usuario_id).exists():
            raise forms.ValidationError("Este email ya está en uso por otro usuario.")
        return email
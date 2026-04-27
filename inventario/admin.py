from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, Empresa, Producto, HistorialMovimiento, Perfil

# 1. Definición del panel de Usuario (solo una vez)
class UsuarioAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Información de Empresa y Rol', {'fields': ('rol', 'empresa')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Información de Empresa y Rol', {'fields': ('rol', 'empresa')}),
    )
    list_display = ('username', 'email', 'first_name', 'rol', 'empresa')
    list_filter = ('rol', 'empresa')

# 2. Registros (ASEGÚRATE DE QUE SOLO HAYA UNO DE CADA UNO)
admin.site.register(Usuario, UsuarioAdmin)
admin.site.register(Empresa)
admin.site.register(Producto)           # <--- Revisa que no esté repetido abajo
admin.site.register(HistorialMovimiento)
admin.site.register(Perfil)
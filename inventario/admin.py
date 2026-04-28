from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, Empresa, Producto, HistorialMovimiento, Perfil, Membresia


class UsuarioAdmin(UserAdmin):
    # Quitamos 'rol' y 'empresa' — ya no son campos de Usuario
    fieldsets = UserAdmin.fieldsets
    add_fieldsets = UserAdmin.add_fieldsets
    list_display  = ('email', 'first_name', 'last_name', 'is_staff')
    list_filter   = ('is_staff', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')
    ordering      = ('email',)


class MembresiaAdmin(admin.ModelAdmin):
    list_display  = ('usuario', 'empresa', 'rol', 'es_fundador', 'fecha_ingreso')
    list_filter   = ('rol', 'empresa', 'es_fundador')
    search_fields = ('usuario__email', 'empresa__nombre')


admin.site.register(Usuario, UsuarioAdmin)
admin.site.register(Membresia, MembresiaAdmin)
admin.site.register(Empresa)
admin.site.register(Producto)
admin.site.register(HistorialMovimiento)
admin.site.register(Perfil)
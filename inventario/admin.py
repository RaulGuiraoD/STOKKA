from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, Empresa, Producto, HistorialMovimiento, Perfil, Membresia, TokenVerificacionEmail, TokenRecuperacionPassword, CopiaSeguridad

class UsuarioAdmin(UserAdmin):
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

class TokenRecuperacionPasswordAdmin(admin.ModelAdmin):
    list_display  = ('usuario', 'token', 'creado_en', 'usado')
    list_filter   = ('creado_en', 'usado')
    search_fields = ('usuario__email',)
    readonly_fields = ('token',)

class TokenVerificacionEmailAdmin(admin.ModelAdmin):
    list_display  = ('usuario', 'token', 'creado_en', 'usado')

class CopiaSeguridadAdmin(admin.ModelAdmin):
    list_display  = ('empresa', 'fecha')
    search_fields = ('empresa__nombre',)
    readonly_fields = ('datos_json',)

class ProductoAdmin(admin.ModelAdmin):
    list_display  = ('nombre', 'referencia', 'stock_actual', 'umbrales_amarillo', 'umbrales_rojo', 'empresa')
    list_filter   = ('empresa',)
    search_fields = ('nombre', 'referencia')
    readonly_fields = ('orden_empresa',)

class HistorialMovimientoAdmin(admin.ModelAdmin):
    list_display  = ('producto_nombre', 'producto_id', 'producto_orden', 'usuario', 'tipo_accion', 'cambio', 'stock_resultante', 'fecha')
    list_filter   = ('tipo_accion', 'fecha')
    search_fields = ('producto_nombre', 'usuario__email')
    readonly_fields = ('producto_id', 'producto_orden')
    date_hierarchy = 'fecha'
    ordering = ('-fecha',)

class PerfilAdmin(admin.ModelAdmin):
    list_display  = ('user', 'telefono', 'fecha_nacimiento')
    list_filter   = ('fecha_nacimiento',)
    search_fields = ('user__email',)
    readonly_fields = ('user',)
    date_hierarchy = 'fecha_nacimiento'
    ordering = ('-fecha_nacimiento',)


admin.site.register(Usuario, UsuarioAdmin)
admin.site.register(Membresia, MembresiaAdmin)
admin.site.register(Empresa)
admin.site.register(Producto)
admin.site.register(HistorialMovimiento)
admin.site.register(Perfil)
admin.site.register(CopiaSeguridad)
admin.site.register(TokenVerificacionEmail)
admin.site.register(TokenRecuperacionPassword)
#1. Third-Party Library Imports (PIL para procesamiento de imágenes)
from PIL import Image

# 2. Django Core Imports
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

# 3. Local App Imports 

# MODELO EMPRESA
class Empresa(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True) # Para la URL: empresa-x.stokka.com
    fecha_registro = models.DateTimeField(auto_now_add=True)
    plan_activo = models.BooleanField(default=False) # Se activará tras el "pago"
    cif      = models.CharField(max_length=20, blank=True, null=True, verbose_name="CIF/NIF")
    telefono = models.CharField(max_length=20, blank=True, null=True, verbose_name="Teléfono")

    def __str__(self):
        return self.nombre
    
# MODELO USUARIOS
class Usuario(AbstractUser):
    # username lo seguimos teniendo pero lo rellenamos automáticamente con el email
    # en el registro. El usuario nunca lo ve ni lo escribe.
    # email es el único identificador que importa al usuario final.

    def get_membresia(self, empresa):
        """Devuelve la Membresia de este usuario en una empresa concreta, o None."""
        return self.membresias.filter(empresa=empresa).first()

    def es_fundador_de(self, empresa):
        """True si este usuario fundó (registró) esa empresa."""
        m = self.get_membresia(empresa)
        return m is not None and m.es_fundador

    def es_dueño_en(self, empresa):
        """True si tiene rol dueño en esa empresa (incluye al fundador)."""
        m = self.get_membresia(empresa)
        return m is not None and m.rol == 'dueño'

    def es_admin_o_dueño_en(self, empresa):
        """True si puede acceder a gestión de usuarios en esa empresa."""
        m = self.get_membresia(empresa)
        return m is not None and m.rol in ['dueño', 'admin']

    def __str__(self):
        return self.email or self.username  
# ==============================================================================
# MEMBRESIA
# Tabla pivote entre Usuario y Empresa.
# Cada fila = un usuario en una empresa con un rol concreto.
# Un usuario con 2 empresas tendrá 2 filas aquí.
# ==============================================================================
class Membresia(models.Model):
    ROL_CHOICES = (
        ('dueño',    'Dueño'),
        ('admin',    'Administrador'),
        ('empleado', 'Empleado'),
    )

    usuario     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='membresias'
    )
    empresa     = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='membresias'
    )
    rol         = models.CharField(max_length=20, choices=ROL_CHOICES, default='empleado')
    es_fundador = models.BooleanField(default=False)
    # es_fundador marca al primer usuario que registró esta empresa.
    # Es inmutable: una vez True, ninguna vista ni form debe poder cambiarlo a False.
    # Garantiza que siempre hay alguien con acceso total a cada empresa.

    fecha_ingreso = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('usuario', 'empresa')
        # Un usuario no puede tener dos membresías en la misma empresa.
        verbose_name = 'Membresía'
        verbose_name_plural = 'Membresías'

    def __str__(self):
        return f"{self.usuario.email} — {self.empresa.nombre} ({self.rol})"


# 2. MODELO PRODUCTOS
class Producto(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Nombre del Producto")
    referencia = models.CharField(max_length=50, blank=True, null=True, verbose_name="Referencia/SKU")
    descripcion = models.TextField(blank=True, verbose_name="Descripción Breve")
    stock_actual = models.PositiveIntegerField(default=0, verbose_name="Stock Disponible")
    umbrales_amarillo = models.PositiveIntegerField(verbose_name= "Aviso", default=10) # Añadido default para evitar errores
    umbrales_rojo = models.PositiveIntegerField(verbose_name="Crítico", default=5)
    factura = models.FileField(upload_to='facturas/%Y/%m/', null=True, blank=True, verbose_name="Factura (Opcional)")
    fecha_registro = models.DateTimeField(default=timezone.now)

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='productos', null=True, blank=True)

    def __str__(self):
        return self.nombre
    
    def clean(self):
        if self.umbrales_amarillo is not None and self.umbrales_rojo is not None:
            if self.umbrales_amarillo <= self.umbrales_rojo:
                raise ValidationError({
                    'umbrales_amarillo': 'El umbral de aviso debe ser mayor al umbral crítico.'
                })
        
    def save(self, *args,**kwargs):
        self.full_clean()   # Ejecuta la validación clean() antes de guardar
        super().save(*args, **kwargs)

    @property
    def id_formateado(self):
        return f"{self.id:04d}"

    @property
    def semaforo(self):
        if self.stock_actual <= self.umbrales_rojo:
            return "critico"    # Rojo
        elif self.stock_actual <= self.umbrales_amarillo:
            return "aviso"      #Amarillo
        return "ok"             #Verde
    



def validar_tamano_foto(value):
    limit = 2 * 1024 * 1024  #2MB
    if value.size > limit:
        raise ValidationError('La imagen es demasiado pesada (máximo 2MB).')

# MODELOS PERFILES    
class Perfil(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    telefono = models.CharField(max_length=15, blank=True, null=True)
    foto = models.ImageField(
        upload_to='perfiles/',
        blank=True,
        null=True,
        validators=[validar_tamano_foto]
    )
    # empresa eliminada. El perfil no pertenece a una empresa.

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.foto:
            img = Image.open(self.foto.path)
            if img.height > 400 or img.width > 400:
                img.thumbnail((400, 400), Image.LANCZOS)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.save(self.foto.path, "JPEG", quality=80, optimize=True)

    def __str__(self):
        return f"Perfil de {self.user.email}"
    
# MODELOS HISTORIAL
class HistorialMovimiento(models.Model):

    TIPOS_ACCION = [
        ('AJUSTE_RAPIDO', 'Ajuste rápido (+/-)'),
        ('MODAL_EDITAR', 'Producto Editado'),
        ('CREACION', 'Producto Creado'),
        ('ELIMINACION', 'Producto Eliminado'),
    ]

    producto_nombre = models.CharField(max_length=255)
    producto_id = models.IntegerField(null=True, blank=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='movimientos'
    )
    tipo_accion = models.CharField(max_length=20, choices=TIPOS_ACCION)
    cambio = models.IntegerField(default=0) 
    stock_resultante = models.IntegerField()
    fecha = models.DateTimeField(auto_now_add=True)
    detalles = models.TextField(null=True, blank=True)
    stock_anterior = models.IntegerField(default=0)

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='movimientos_historial', null=True, blank=True)
    class Meta:
        ordering = ['-fecha']
        verbose_name = "Historial de Movimiento"
        verbose_name_plural = "Historial de Movimientos"

    def __str__(self):
        return f"{self.producto_nombre} | {self.tipo_accion} | {self.cambio}"
    
#1. Third-Party Library Imports (PIL para procesamiento de imágenes)
from PIL import Image

# 2. Django Core Imports
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

# 3. Local App Imports 

# MODELO USUARIOS
class Usuario(AbstractUser):
    ROL_CHOICES = (
        ('dueño', 'Dueño/Admin Principal'),
        ('admin', 'Administrador Delegado'),
        ('empleado', 'Empleado'),
    )

    rol = models.CharField(max_length=20, choices=ROL_CHOICES, default='empleado')

    def es_dueño(self):
        return self.rol == 'dueño' or self.id == 1
    
    def es_admin_o_dueño(self):
        return self.rol in ['dueño', 'admin']

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
        validators=[validar_tamano_foto] # Aplicamos el validador
    )

    def save(self, *args, **kwargs):
        # Primero guardamos para tener el archivo en el sistema
        super().save(*args, **kwargs)

        if self.foto:
            img = Image.open(self.foto.path)

            # 1. Si es muy grande, redimensionamos a un tamaño lógico para avatar (400x400)
            if img.height > 400 or img.width > 400:
                output_size = (400, 400)
                img.thumbnail(output_size, Image.LANCZOS)
            
            # 2. Convertir a RGB si es necesario (evita errores con PNG transparentes al pasar a JPEG)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # 3. Comprimir y sobreescribir como JPEG para ahorrar espacio
            img.save(self.foto.path, "JPEG", quality=80, optimize=True)

    def __str__(self):
        return f"Perfil de {self.user.username}"
    
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

    class Meta:
        ordering = ['-fecha']
        verbose_name = "Historial de Movimiento"
        verbose_name_plural = "Historial de Movimientos"

    def __str__(self):
        return f"{self.producto_nombre} | {self.tipo_accion} | {self.cambio}"
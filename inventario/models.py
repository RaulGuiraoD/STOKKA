from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.conf import settings

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

# 2. Los demás modelos
class Producto(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Nombre del Producto")
    descripcion = models.TextField(blank=True, verbose_name="Descripción Breve")
    stock_actual = models.PositiveIntegerField(default=0, verbose_name="Stock Disponible")
    umbrales_amarillo = models.PositiveIntegerField(verbose_name= "Aviso", default=10) # Añadido default para evitar errores
    umbrales_rojo = models.PositiveIntegerField(verbose_name="Crítico", default=5)
    factura = models.FileField(upload_to='facturas/%Y/%m/', null=True, blank=True, verbose_name="Factura (Opcional)")
    fecha_registro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.nombre
    
    @property
    def id_formateado(self):
        return f"{self.id:04d}"

class Perfil(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    telefono = models.CharField(max_length=15, blank=True, null=True)
    foto = models.ImageField(upload_to='perfiles/', blank=True, null=True)

    def __str__(self):
        return f"Perfil de {self.user.username}"
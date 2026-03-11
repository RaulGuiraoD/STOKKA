from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User

class Producto(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Nombre del Producto")
    descripcion = models.TextField(blank=True, verbose_name="Descripción Breve")
    stock_actual = models.PositiveIntegerField(default=0, verbose_name="Stock Disponible")

    #Umbrales de alertas para la aplicacion
    umbral_amarillo = models.PositiveIntegerField(verbose_name= "Aviso")
    umbral_rojo = models.PositiveIntegerField(verbose_name="Crítico")

    # Información adicional
    factura = models.FileField(upload_to='facturas/%Y/%m/', null=True, blank=True, verbose_name="Factura (Opcional)")
    fecha_registro = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.nombre
    
    @property
    def id_formateado(self):
        return f"{self.id:04d}"
    
    @property
    def estado_stock(self):
        if self.stock_actual <= self.umbral_rojo:
            return "rojo"
        elif self.stock_actual <= self.umbral_amarillo:
            return "amarillo"
        return "verde"
    

class Perfil(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    telefono = models.CharField(max_length=15, blank=True, null=True)
    foto = models.ImageField(upload_to='perfiles/', blank=True, null=True)

    def __str__(self):
        return f"Perfil de {self.user.username}"


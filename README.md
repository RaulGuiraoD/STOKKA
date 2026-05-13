# STOKKA 📦 - Sistema de Gestión de Inventarios

STOKKA es una aplicación web robusta diseñada para la gestión eficiente de inventarios, optimizando el flujo de trabajo entre dueños, administradores y operarios. Con una interfaz limpia, profesional y un sistema de seguridad multitenencia, permite un control total sobre productos, equipo humano y la salud operativa de tu empresa.

---

## 🚀 Acceso y Onboarding
La aplicación implementa un flujo de seguridad estricto para garantizar la integridad de los datos:

* **Autenticación:** Registro e inicio de sesión obligatorio mediante **Google Auth**.
* **Activación:** Validación de cuenta mediante enlace enviado por correo electrónico.
* **Gestión de Empresa:** Registro de la entidad legal y acceso a una **pasarela de pago ficticia** para la activación del servicio.
* **Multiempresa:** Soporte para usuarios vinculados a múltiples empresas con selector de contexto *in-app*.
* **Seguridad de Acceso:** Sistema de recuperación de contraseñas y detección de cuentas no activadas con reenvío de enlaces.

---

## 🛠️ Funcionalidades Principales

### 📊 Dashboard (Index)
Panel de control con métricas en tiempo real y 4 gráficos dinámicos:
* **Salud del Inventario:** Estado general de las existencias.
* **Top 5 Productos:** Artículos con mayor volumen de stock.
* **Últimos Ingresos:** Registro visual de incorporaciones recientes.
* **Balance Operativo:** Distribución según umbrales (OK, Aviso, Crítico).
* **Movimientos de Inventario:** Gráfico exclusivo para roles de **Dueño** y **Admin**.

### 📦 Gestión de Inventario (Core)
El corazón de STOKKA utiliza un sistema de **semáforo visual** basado en umbrales configurables:
* **Configuración Dinámica:** Cada producto permite definir un *Umbral de Aviso* y un *Umbral Crítico*.
* **Operativa Rápida:** Botones de ajuste instantáneo (`+` / `-`), edición mediante formularios y eliminación múltiple.
* **Documentación:** Capacidad de adjuntar albaranes o archivos PDF a cada registro.
* **Copias de Seguridad:** Backup automático cada 30 minutos (CSV). Posibilidad de generar y enviar copias al correo bajo demanda.

### 📜 Historial de Movimientos
Auditoría completa organizada cronológicamente (Año/Mes/Día):
* **Trazabilidad:** Registra quién realizó el cambio, qué se modificó y variaciones de stock.
* **Diferenciación Visual:** Colores específicos para Creación, Edición, Eliminación o Ajuste Rápido.
* **Filtros:** Búsqueda avanzada por tipo de movimiento y fecha exacta.

### 👥 Gestión de Usuarios y Roles
Jerarquía de permisos blindada (La sección de gestión no es visible para Operarios):
* **Dueño:** Control total. Crea Admins y Operarios. Es el único perfil imborrable e ineditable.
* **Administrador:** Puede gestionar stock y crear/editar/eliminar **solo Operarios**. No puede afectar a perfiles de nivel Dueño.
* **Operario:** Acceso limitado a la operativa diaria y consulta de inventario.
* **Invitaciones:** Sistema de credenciales y autenticación por correo electrónico.

### 🏢 Panel de Empresa (Solo Dueño)
* **Personalización UI:** Motor de temas para modificar los colores de la aplicación (afecta a los estados visuales).
* **Suscripción:** Gestión de renovación (manual/auto) y pausa temporal del servicio.
* **Borrado Seguro:** Sistema de eliminación definitiva de empresa protegido por 3 modales de confirmación.

---

## 🎨 Identidad Visual y UX
STOKKA utiliza una paleta de colores técnica diseñada para la toma de decisiones rápida:

| Elemento | Color | Hexadecimal |
| :--- | :--- | :--- |
| **Principal (Stokka)** | Verde Bosque | `#003D00` |
| **Estado Óptimo / OK** | Verde Secundario | `#1CA300` |
| **Aviso / Edición** | Amarillo Alerta | `#F5C907` |
| **Crítico / Eliminación** | Rojo Alerta | `#C10D00` |

* **Accesibilidad:** Incluye **Filtros para Daltonismo** y **Iconos de Ayuda** activables/desactivables.
* **Experiencia:** Páginas de error personalizadas (400, 403, 404, 500).
* **Privacidad:** Arquitectura diseñada para evitar cualquier filtración de datos entre distintas empresas (*Multi-tenant*).

---

## 🛠️ Stack Tecnológico
* **Backend:** Python 3.13 + Django 6.0
* **Frontend:** HTML5, CSS3 (Custom Variables), JavaScript
* **Framework CSS:** Bootstrap 5.3 + Crispy Forms
* **Base de Datos:** SQLite (Desarrollo) / PostgreSQL (Producción)
* **Librerías Clave:** Pillow, Python-decouple, Django-environ.

---

## ⚙️ Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/tu-usuario/stokka.git](https://github.com/tu-usuario/stokka.git)
    cd stokka
    ```
2.  **Preparar el entorno:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # En Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```
3.  **Migraciones y Datos:**
    ```bash
    python manage.py makemigrations
    python manage.py migrate
    ```
4.  **Ejecutar:**
    ```bash
    python manage.py runserver
    ```

---

## 👥 Creadores (TFG)
Proyecto diseñado con redes sociales y perfiles de LinkedIn reales para simular un entorno profesional.
* **Creador 1** - [www.linkedin.com/in/raulguirao]
* **Creador 2** - [https://www.linkedin.com/in/pedro-sanchezgonzalez/]

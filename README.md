# 📦 STOKKA - Sistema Inteligente de Control de Stock

STOKKA es una aplicación web robusta diseñada para la gestión eficiente de inventarios, optimizando el flujo de trabajo entre dueños, administradores y empleados. Con una interfaz limpia, moderna y enfocada en la usabilidad, STOKKA permite mantener un control total sobre tus productos y el equipo humano.

🚀 Funcionalidades Principales:

- 🔐 Seguridad y Gestión de Accesos

    Hemos implementado una jerarquía de roles blindada para asegurar que cada usuario acceda solo a lo que le corresponde:

  - Dueño (Administrador Principal): Rol único con control total. Puede gestionar roles de otros administradores, eliminar cualquier usuario y supervisar todo el sistema.
    
  - Administrador Delegado: Puede gestionar el stock y el equipo (empleados), pero tiene restringida la capacidad de crear o editar perfiles de nivel "Dueño".
    
  - Empleado: Enfocado en la operativa diaria y consulta de inventario.

- 📦 Control de Inventario (Core)

  - El corazón de STOKKA es la eficiencia en el manejo de productos:
    
  - Dashboard Visual: Panel principal con métricas rápidas.
    
  - Sistema de Alertas Dinámicas: Los productos cambian de estado visualmente según su stock:
    
    - 🟢 Óptimo: Stock suficiente.
    
    - 🟡 Aviso: Se ha alcanzado el primer umbral de advertencia.
    
    - 🔴 Crítico: Necesidad inmediata de reposición.
    
  - Gestión Documental: Capacidad para adjuntar facturas y archivos PDF a cada registro de producto.

- 👤 Perfil y Experiencia de Usuario:
  
    - Interfaz Adaptativa: Diseño responsivo compatible con dispositivos móviles y escritorio utilizando Bootstrap 5.
    
    - Personalización: Cada usuario puede gestionar su perfil, cambiar su foto de usuario y actualizar sus datos de contacto.
    
    - Shadow-Stokka Design: Una estética cuidada con sombras profundas y una paleta de colores verde bosque (#003D00) que transmite profesionalidad y solidez.

- 🛠️ Stack Tecnológico
    - Backend: Python 3.13 + Django 6.0
    
    - Frontend: HTML5, CSS3 (Custom Variables), JavaScript
    
    - Framework CSS: Bootstrap 5.3 (con personalización de componentes)
    
    - Base de Datos: SQLite (Desarrollo) / Compatible con PostgreSQL

    - Iconografía: FontAwesome 6

- ⚙️ Instalación (Provisional):

    - Clonar el repositorio:

          git clone https://github.com/tu-usuario/proyecto-stokka.git

    - Crear y activar entorno virtual:

          python -m venv env

          # En Windows:
      
          .\env\Scripts\activate

    - Instalar dependencias:

          pip install -r requirements.txt

    - Ejecutar migraciones y servidor:

          python manage.py migrate
          python manage.py runserver

- 📈 Próximos Pasos
    
    - [ ] Implementación de gráficas de historial de stock.

    - [ ] Generación de informes automáticos en PDF.

    - [ ] Sistema de notificaciones por email para umbrales críticos.

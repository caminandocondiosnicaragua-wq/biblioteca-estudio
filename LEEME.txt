CORRECCION LOGIN + RECUPERACION SUPABASE

Archivos incluidos:
- login.html
- forgot-password.html
- update-password.html
- assets/js/auth.js
- supabase-config.js

IMPORTANTE:
El archivo supabase-config.js contiene marcadores porque la clave de Supabase
no debe inventarse ni sustituirse por una clave secreta.

Antes de subirlo a GitHub:
1. Abre supabase-config.js.
2. Coloca tu URL del proyecto.
3. Coloca tu Publishable key (la clave pública).
4. NO uses service_role.

En Supabase > Authentication > URL Configuration debe estar permitido:
https://camindandocondiosnicaragua-wq.github.io/biblioteca-estudio/update-password.html

Corrige el dominio si tu repositorio usa exactamente otra dirección.

Flujo:
login.html -> ¿Olvidaste tu contraseña? -> forgot-password.html
-> correo de recuperación -> update-password.html -> nueva contraseña.

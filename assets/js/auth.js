// Mi Biblioteca de Estudio — autenticación con Supabase

const formulario = document.getElementById("formulario-acceso");
const correo = document.getElementById("correo");
const contrasena = document.getElementById("contrasena");
const boton = document.getElementById("boton-acceso");
const mensaje = document.getElementById("mensaje-acceso");

function mostrarMensaje(texto, error = true) {
  mensaje.textContent = texto;
  mensaje.classList.toggle("error", error);
  mensaje.classList.toggle("ok", !error);
}

async function comprobarSesionExistente() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Error al comprobar la sesión:", error);
    return;
  }

  if (data.session) window.location.href = "index.html";
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const email = correo.value.trim();
  const password = contrasena.value;

  if (!email || !password) {
    mostrarMensaje("Escribe tu correo y contraseña.");
    return;
  }

  boton.disabled = true;
  boton.textContent = "Entrando…";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Error de inicio de sesión:", error);
    mostrarMensaje("El correo o la contraseña no son correctos.");
    boton.disabled = false;
    boton.textContent = "Entrar";
    return;
  }

  mostrarMensaje("Acceso correcto. Abriendo tu biblioteca…", false);
  window.location.href = "index.html";
});

comprobarSesionExistente();

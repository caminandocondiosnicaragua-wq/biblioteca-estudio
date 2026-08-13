import { supabase } from "../../supabase-config.js";

const $ = (id) => document.getElementById(id);

const loginForm = $("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mensaje = $("mensaje");
    mensaje.textContent = "Entrando...";

    const { error } = await supabase.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    });

    if (error) {
      mensaje.textContent = "El correo o la contraseña no son correctos.";
      console.error(error);
      return;
    }

    window.location.href = "index.html";
  });
}

const recoveryForm = $("recoveryForm");
if (recoveryForm) {
  recoveryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mensaje = $("mensaje");
    mensaje.textContent = "Enviando enlace...";

    const redirectTo = new URL("update-password.html", window.location.href).href;

    const { error } = await supabase.auth.resetPasswordForEmail(
      $("email").value.trim(),
      { redirectTo }
    );

    if (error) {
      mensaje.textContent = "No se pudo enviar el enlace. Revisa el correo.";
      console.error(error);
      return;
    }

    mensaje.style.color = "#286451";
    mensaje.textContent = "Listo. Revisa tu correo para cambiar la contraseña.";
  });
}

const updateForm = $("updateForm");
if (updateForm) {
  updateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mensaje = $("mensaje");

    if ($("password").value !== $("password2").value) {
      mensaje.textContent = "Las contraseñas no coinciden.";
      return;
    }

    mensaje.textContent = "Guardando...";

    const { error } = await supabase.auth.updateUser({
      password: $("password").value
    });

    if (error) {
      mensaje.textContent = "No se pudo cambiar la contraseña.";
      console.error(error);
      return;
    }

    mensaje.style.color = "#286451";
    mensaje.textContent = "Contraseña actualizada. Ya puedes iniciar sesión.";

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1800);
  });
}

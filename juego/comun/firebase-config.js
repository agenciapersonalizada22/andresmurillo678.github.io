/* Configuracion de Firebase de la plataforma.
   - Con los campos VACIOS la plataforma arranca en MODO DEMO: las cuentas viven solo en este dispositivo (localStorage).
   - Rellena estos valores con los de tu app web (Consola de Firebase > Configuracion del proyecto > Tus apps > Configuracion del SDK > "Config").
     Guia paso a paso: juego/plataforma/CONFIGURAR.md
   - Esta configuracion NO es un secreto: Firebase la publica en todo sitio web que lo usa. La seguridad real son las reglas de Firestore
     (juego/plataforma/firestore.rules) y los dominios autorizados. NO pegues aqui claves privadas ni cuentas de servicio.
*/
window.FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',      // p. ej. mi-proyecto.firebaseapp.com
  projectId: '',       // p. ej. mi-proyecto
  storageBucket: '',   // opcional (no se usa)
  messagingSenderId: '', // opcional
  appId: ''            // p. ej. 1:123456789:web:abcdef
};
/* Opciones de la plataforma (todas opcionales).
   modo: 'auto' (Firebase si hay configuracion, si no demo local) | 'local' (fuerza el modo demo, util para desarrollo).
   dominioEmail: dominio reservado para el correo sintetico usuario@dominio. No lo cambies cuando ya existan cuentas. */
window.CUENTA_OPCIONES = { modo: 'auto', dominioEmail: 'users.invalid' };

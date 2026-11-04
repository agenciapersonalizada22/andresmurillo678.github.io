// Arranque: exige sesión (si hay plataforma) y baja el progreso de la nube antes de leer los guardados.
import { arrancar } from './cuentaJuego.js';
try { await arrancar(); } catch (e) { console.warn(e); }
await import('./principal.js');

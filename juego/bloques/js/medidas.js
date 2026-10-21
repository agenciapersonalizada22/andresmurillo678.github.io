// Medidas del mundo (en un archivo aparte para que todos los módulos las compartan)
import { CONFIG } from './config.js';

export const LADO = 16;                // un chunk mide 16 x 16 bloques
export const ALTO = CONFIG.mundo.alto; // y de alto lo que diga la configuración
export const CAPA = LADO * LADO;       // bloques en un piso de un chunk

# Activar las cuentas en linea (Firebase) paso a paso

Mientras no hagas esto, el portal funciona en **modo demo** (las cuentas solo existen en cada dispositivo). Todo es gratis con el plan **Spark**. Tiempo estimado: 15 minutos. Los nombres de los menus de la consola pueden cambiar un poco; si no encuentras algo, busca por palabra.

## 1. Crear el proyecto
1. Entra a <https://console.firebase.google.com> con tu cuenta de Google > **Agregar proyecto** > ponle un nombre (p. ej. `mis-juegos`) > puedes desactivar Google Analytics > **Crear proyecto**.

## 2. Registrar la app web y copiar la configuracion
1. En la pagina principal del proyecto pulsa el icono **`</>` (Web)** > apodo `mis-juegos-web` > **no** marques "Firebase Hosting" > **Registrar app**.
2. Te muestra un bloque `const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." }`.
3. Copia esos valores en `juego/comun/firebase-config.js` (dentro de `window.FIREBASE_CONFIG`, campo por campo). Esa configuracion **no es secreta** (Firebase la publica en cada sitio); la seguridad son las reglas y los dominios autorizados. No pegues nunca claves privadas ni "cuentas de servicio".

## 3. Habilitar Authentication
1. Menu **Compilacion > Authentication > Comenzar**.
2. Pestana **Metodo de acceso** > **Correo electronico/contrasena** > activa el primer interruptor (el de "Enlace del correo" no hace falta) > **Guardar**.
3. La plataforma crea el correo `usuario@users.invalid` por debajo (los jugadores no lo ven ni necesitan correo). Si al registrar alguien aparece "configuracion no valida", revisa este paso; si Firebase rechaza el dominio `.invalid`, cambia `dominioEmail` en `CUENTA_OPCIONES` (p. ej. `usuarios.example.com`) **antes** de crear cuentas reales (cambiarlo despues impide entrar a las existentes).

## 4. Crear Firestore
1. **Compilacion > Firestore Database > Crear base de datos**.
2. Elige la ubicacion mas cercana a tus jugadores (no se puede cambiar despues; p. ej. `nam5` o `southamerica-east1`) > **Modo de produccion** > Crear.

## 5. Publicar las reglas de seguridad
1. En Firestore > pestana **Reglas**.
2. Borra todo y pega el contenido completo de `juego/plataforma/firestore.rules` > **Publicar**.
3. Cada vez que cambies modos de puntaje o juegos (`juegos.js`), actualiza tambien las reglas y vuelve a publicarlas.

## 6. Autorizar tu dominio
1. **Authentication > Configuracion > Dominios autorizados > Agregar dominio** > `agenciapersonalizada22.github.io`.
2. `localhost` ya viene autorizado para probar en tu PC (`python3 -m http.server`).

## 7. (Opcional, recomendado) Restringir la clave de API
1. <https://console.cloud.google.com/apis/credentials> (mismo proyecto) > abre "Browser key" (la clave que empieza por `AIza...`).
2. **Restricciones de la aplicacion > Sitios web (referentes HTTP)** > agrega `https://agenciapersonalizada22.github.io/*` (y `http://localhost:*/*` mientras pruebas).
3. **Restricciones de API**: deja solo *Identity Toolkit API*, *Token Service API* y *Cloud Firestore API*. Guarda; tarda unos minutos.
Esto evita que otros sitios usen tu proyecto con tu clave; no sustituye a las reglas.

## 8. Limites del plan gratuito (Spark) y como vigilarlos
Aproximados; revisa la pagina oficial de precios porque cambian: Firestore ~1 GiB almacenado, **50.000 lecturas/dia, 20.000 escrituras/dia, 20.000 borrados/dia**; Authentication con correo/contrasena es gratis. Cuando se agota una cuota diaria, esas operaciones fallan hasta el dia siguiente (no hay cobro sin plan Blaze).
Consumo aproximado de la plataforma: cada jugador conectado escribe su presencia **1 vez por minuto** (~60 escrituras/hora), el XP se agrupa cada ~12 s, y las reglas cuentan lecturas extra (`get`/`exists` de amistad). Con decenas de jugadores sobra; con cientos al dia podrias rozar el limite de escrituras. Donde mirar: **Firestore > Uso** y **Configuracion del proyecto > Uso y facturacion**. Si el limite te queda corto, sube `60000` del latido en `cuenta.js` (presencia) o pasa a Blaze con un presupuesto/alerta.

## 9. Probar que funciona
1. Abre `https://agenciapersonalizada22.github.io/juego/` (o en local `http://localhost:8000/juego/`): ya **no** debe aparecer "Modo demo".
2. Crea una cuenta con un usuario nuevo > entras al panel. En la consola de Firebase deberias ver el usuario en Authentication y documentos en `usuarios` y `nombres`.
3. Abre otra ventana de incognito, crea otra cuenta, agregaos como amigos (nombre exacto) y comprueba el estado "En linea".
4. Cierra sesion y vuelve a entrar; cambia contrasena; prueba en el movil.
5. Si algo falla abre las herramientas del navegador (F12 > Consola): `permission-denied` = reglas sin publicar o distintas; `auth/unauthorized-domain` = falta el dominio (paso 6); `auth/operation-not-allowed` = falta el paso 3; `auth/api-key-not-valid` = config mal copiada o restriccion de clave.

## Lista de verificacion
- [ ] Proyecto creado y app web registrada
- [ ] `juego/comun/firebase-config.js` con `apiKey`, `authDomain`, `projectId`, `appId` rellenos
- [ ] Authentication: Correo/contrasena habilitado
- [ ] Firestore creado en modo produccion
- [ ] `firestore.rules` pegado y **publicado**
- [ ] Dominio `agenciapersonalizada22.github.io` autorizado
- [ ] (Opcional) clave de API restringida por referente HTTP
- [ ] Registro, login, cierre de sesion y cambio de contrasena probados
- [ ] Dos cuentas se agregan como amigos y se ven en linea
- [ ] Sin "Modo demo" en el portal publicado

## Cosas que conviene saber
- **Sin recuperacion de contrasena por defecto**: no se pide correo. Quien quiera poder restablecerla vincula un correo real (Cuenta > Correo de recuperacion); despues entra escribiendo ese correo en "Usuario o correo".
- **Proteccion de cortesia**: el portal y `Cuenta.requerir()` no impiden que alguien abra la URL de un juego directamente (es un sitio estatico). Lo que protegen de verdad son las reglas de Firestore para los datos.
- **Puntajes falsificables**: el puntaje lo manda el navegador; las reglas ponen topes y solo aceptan mejoras, pero un jugador tramposo con la consola puede enviar un valor dentro del tope. No hay forma de evitarlo sin servidor.
- **Privacidad**: los perfiles (nombre visible, color, avatar, nivel) y los rankings los ve cualquier usuario con sesion; el nombre de usuario existente se puede consultar sin sesion (para saber si esta libre). El correo vinculado solo esta en Authentication.

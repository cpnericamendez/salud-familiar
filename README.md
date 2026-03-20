# 🏥 Salud Familiar — Guía de instalación

Seguí estos pasos **una sola vez** y la app queda funcionando para siempre.
No necesitás saber programar. Todo es gratis.

---

## PASO 1 — Crear la base de datos (Firebase)

Firebase es el servicio de Google que guarda los datos y los sincroniza entre los dos celulares en tiempo real. También almacena los archivos PDF e imágenes.

1. Andá a **https://console.firebase.google.com**
2. Iniciá sesión con tu cuenta de Google
3. Hacé clic en **"Crear un proyecto"**
4. Nombre del proyecto: `salud-familiar` → Siguiente → Siguiente → Crear

### Activar Firestore (base de datos)
5. Menú izquierdo → **"Firestore Database"** → **"Crear base de datos"**
6. Elegí **"Comenzar en modo de prueba"** → Siguiente → Listo

### Activar Storage (archivos PDF e imágenes)
7. Menú izquierdo → **"Storage"** → **"Comenzar"**
8. Elegí **"Comenzar en modo de prueba"** → Siguiente → Listo
9. Esto activa el almacenamiento — **5GB gratis**, más que suficiente para años de estudios médicos

### Obtener la configuración
10. Clic en el ícono de engranaje ⚙️ → **"Configuración del proyecto"**
11. Bajá hasta **"Tus apps"** → clic en el ícono `</>` (web)
12. Nombre de la app: `salud-familiar` → **"Registrar app"**
13. Vas a ver un bloque de código con `firebaseConfig`. **Copiá los valores** (apiKey, authDomain, etc.)

---

## PASO 2 — Configurar el archivo Firebase

1. Abrí el archivo **`src/firebase.js`** con cualquier editor de texto
2. Reemplazá cada `"PEGAR_..."` con el valor correspondiente que copiaste

Debería quedar algo así:
```js
const firebaseConfig = {
  apiKey:            "AIzaSyABC123...",
  authDomain:        "salud-familiar-xyz.firebaseapp.com",
  projectId:         "salud-familiar-xyz",
  storageBucket:     "salud-familiar-xyz.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
}
```

---

## PASO 3 — Publicar en Vercel (hosting gratuito)

### Opción A — Sin instalar nada (recomendada)

1. Andá a **https://github.com** → creá una cuenta gratis si no tenés
2. Creá un repositorio nuevo llamado `salud-familiar` (público o privado)
3. Subí todos los archivos de esta carpeta al repositorio
4. Andá a **https://vercel.com** → "Sign up" con tu cuenta de GitHub
5. Clic en **"New Project"** → elegí el repositorio `salud-familiar`
6. Vercel detecta automáticamente que es Vite → clic en **"Deploy"**
7. En 2 minutos te da una URL como `salud-familiar-xyz.vercel.app` ✅

### Opción B — Desde la computadora (si tenés Node.js instalado)

```bash
# En la carpeta del proyecto:
npm install
npm run build
npx vercel --prod
```

---

## PASO 4 — Instalar en el celular

### En iPhone (Safari):
1. Abrí la URL de tu app en **Safari** (no Chrome)
2. Tocá el botón compartir ↑
3. **"Agregar a pantalla de inicio"**
4. Dale un nombre: `Salud Familiar`
5. ¡Listo! Aparece el ícono en tu pantalla 🎉

### En Android (Chrome):
1. Abrí la URL en **Chrome**
2. Tocá los 3 puntitos ⋮
3. **"Agregar a pantalla de inicio"** o **"Instalar app"**
4. ¡Listo! 🎉

---

## PASO 5 — Compartir con tu marido

1. Mandále la URL de la app
2. Él la abre en su celular y la instala igual (Paso 4)
3. **Ambos ven los mismos datos en tiempo real** — cualquier cambio que haga uno aparece en el otro al instante

---

## Preguntas frecuentes

**¿Cuánto cuesta?**
Todo gratis. Firebase tiene un plan gratuito muy generoso (más que suficiente para uso familiar). Vercel también es gratis para proyectos personales.

**¿Funciona sin internet?**
Sí. La app funciona offline y sincroniza los cambios cuando vuelve la conexión.

**¿Los datos son privados?**
Sí. Solo quienes tengan la URL pueden acceder, y Firebase guarda los datos en servidores de Google encriptados.

**¿Puedo cambiarle el nombre a la URL?**
Sí. En Vercel podés configurar un dominio personalizado gratis (ej: `saludgomez.vercel.app`) o comprar un dominio propio.

**¿Qué pasa con las fotos de perfil?**
Las fotos se guardan en cada dispositivo por separado (son archivos grandes). Los estudios con link de Google Drive sí se comparten entre dispositivos.

---

## ¿Necesitás ayuda?

Si en algún paso te trabás, escribile a Claude con el error exacto que aparece en pantalla y te ayuda a resolverlo.

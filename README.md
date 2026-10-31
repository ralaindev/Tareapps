# En foco

Aplicación personal de tareas para **iOS y Android**, en español, con temas claro y oscuro y acento violeta. El producto aprobado funciona localmente y sin conexión: tres columnas fijas, **Pendiente**, **En progreso** y **Hecho**, sin servidor ni inicio de sesión.

## Documentación

- [Flujo de desarrollo](docs/DEVELOPMENT.md): Project, issues/PRs, ramas y revisión local firmada.
- [Contrato cloud v1](docs/CLOUD_CONTRACT.md) y [experimento aislado](experiments/cloud/README.md): base de v2, no nube integrada en la app.

- [SDD.md](SDD.md): comportamiento aprobado, maquetas iniciales y ampliaciones con criterios AC01–AC36.
- [AGENTS.md](AGENTS.md): punto de entrada para una sesión nueva, mapa de código y estado de continuación.
- [TECH_PLAN.md](TECH_PLAN.md): arquitectura actual y roadmap pendiente de GitHub, nube y colaboración.

El [diagnóstico y propuestas de evolución](TECH_PLAN.md#diagnóstico-y-propuestas-de-evolución--2026-10-31) recoge la revisión del estado actual, mejoras de interfaz con bocetos conceptuales y una propuesta gradual de nube/colaboración. Son propuestas pendientes de aprobación, no funcionalidades implementadas.

La aplicación está implementada. Estos documentos recogen su especificación, arquitectura y verificación; la aceptación en dispositivos reales sigue pendiente.

### Continuar en una sesión nueva

**Repositorio público:** [ralaindev/Tareapps](https://github.com/ralaindev/Tareapps). Se migró el historial corregido a un repositorio independiente para no publicar los commits antiguos con correo personal. Los commits usan `noreply` como autor y committer; los identificadores anteriores no son accesibles desde este repositorio. El repositorio original se conserva privado y no debe publicarse.

Pedir a AIran: **«Lee AGENTS.md y la sección de continuación de TECH_PLAN.md. Resume el estado de GitHub y los siguientes pasos».** El nombre visible de la app sigue siendo En foco. El remoto local es `origin` y la rama es `main`. Verificar el historial y seguimiento de `origin/main` antes de actuar. Pendiente configurar el flujo solicitado de Projects, issues padre/sub-issues, `develop`, PRs y revisión obligatoria. La fase de nube todavía no tiene SDD v2 aprobada ni implementación; no hay despliegues autorizados.

## Funcionalidades

- Una columna visible, con pestañas y contadores; cambio mediante pulsación o swipe horizontal.
- Cabecera mínima con «Mi tablero» y un único icono que alterna Detallada/Compacta. El icono representa la vista de destino; mantenerlo pulsado muestra su nombre. Detallada conserva columna, descripción y acciones; Compacta agrupa los tres estados con tarjetas de solo título.
- La vista elegida se guarda entre sesiones. Crear desde Compacta mantiene ese modo y vuelve al inicio de Pendiente.
- Botón de luna/sol junto al icono de vista, en la esquina superior derecha, para alternar entre tema claro y oscuro. La elección se guarda y se aplica también al formulario y la barra de estado.
- Las tarjetas detalladas muestran título, descripción y acción, sin metadatos repetidos; las pestañas presentan nombre y contador en la misma línea. «＋ Nueva tarea» mantiene su botón con texto en el pie.
- En ambas vistas, arrastrar una tarjeta a la derecha descubre una papelera roja. Soltar pasado un tercio del ancho elimina; regresar antes de soltar cancela. «Deshacer» restaura datos, estado y posición. En Detallada, cambia de sección desde las pestañas o deslizando fuera de las tarjetas.
- Compacta distingue los grupos con cabeceras de fondo suave por estado, contador en cápsula, divisores y más separación. La cabecera del grupo actual permanece fija al desplazarse.
- Las vistas conservan su posición de lectura durante la sesión. Deshacer aparece flotando sin desplazar la lista o el botón «Nueva tarea». El formulario mantiene Crear/Guardar en una barra fija, fuera de los campos desplazables.
- El tablero espera la carga del tema guardado antes de mostrarse. El splash nativo usa un fondo oscuro neutro; su aspecto final debe comprobarse en una compilación instalada, ya que Expo Go no lo reproduce completamente.
- Listas ordenadas por entrada más reciente en cada columna. Editar texto no reordena.
- Título obligatorio de 1–120 caracteres tras `trim`; descripción opcional de hasta 2000.
- Crear siempre guarda en Pendiente y abre esa columna al volver al tablero.
- Mover conserva la columna seleccionada y permite deshacer durante 6 segundos; con lector de pantalla, la acción no caduca por tiempo. Los cambios posteriores incompatibles la invalidan.
- Acciones rápidas Iniciar/Completar y edición que permite cambiar de cualquier estado a cualquier otro; eliminación confirmada y confirmación al salir de un borrador modificado.
- Persistencia local tras guardar explícitamente o confirmar una acción; escribir no guarda el borrador.
- Controles de al menos 48 × 48, texto escalable y soporte de VoiceOver y TalkBack, pendiente de validación en dispositivos reales.

Paleta: fondo `#F7F7FC`, superficies `#FFFFFF`, acento `#6D4AFF`, texto `#20212B` y texto secundario `#626575`.

## Base tecnológica

Expo SDK 58, React 19.3, React Native 0.88 y TypeScript estricto. Expo Router organiza las rutas en **`src/app/`**. Persistencia con `expo-sqlite`, estado compartido con contexto/reducer y páginas horizontales con `react-native-pager-view`. Consultar las [referencias de SDK 58](https://docs.expo.dev/versions/v58.0.0/) antes de implementar APIs.

El repositorio usa npm y `package-lock.json`.

## Preparar el entorno

Requisitos: **Node.js 24 para ejecutar las pruebas del repositorio**, que usan `node:sqlite`, npm y un entorno de ejecución móvil compatible. El tooling de la app tiene como mínimo Node.js 22.13.x; para instalar, desarrollar y ejecutar todas las comprobaciones con un único entorno, usar Node.js 24. Ejecutar desde la raíz del repositorio:

```sh
npm ci
```

Instala las dependencias reproducibles del lockfile.

Para futuras dependencias de Expo/React Native, usar `npx expo install <paquete>` para resolver versiones compatibles con el SDK.

## Ejecutar en desarrollo

```sh
npm start
```

Inicia el servidor de desarrollo de Expo. Abrir el proyecto con una versión de **Expo Go compatible con SDK 58**, siguiendo el QR o las instrucciones de la terminal. El equipo y el dispositivo deben poder acceder al servidor durante el desarrollo.

### Android

```sh
npm run android
```

Inicia Expo solicitando abrir Android. Requiere un emulador configurado o un dispositivo conectado y preparado. También se puede usar `npm start` y abrir el QR desde Expo Go en un Android físico compatible.

### iOS

```sh
npm run ios
```

Inicia Expo solicitando abrir el simulador de iOS, que requiere **macOS y Xcode** con un simulador configurado. En Windows no hay simulador local de iOS. Para un iPhone físico, comprobar la compatibilidad del cliente Expo con SDK 58 o preparar una compilación de desarrollo: no dar por hecho que Expo Go de la App Store admita el SDK del proyecto. Si una dependencia nativa no está incluida en el cliente, o se cambia configuración nativa, se necesita una compilación compatible.

Los scripts `android` e `ios` actuales invocan el servidor de Expo con la plataforma correspondiente; no generan por sí mismos un APK, AAB o IPA.

## Comprobaciones de calidad

### Integración continua

El workflow [CI](.github/workflows/ci.yml) ejecuta `npm ci`, lint, TypeScript y los tests de Jest secuencialmente en Ubuntu con Node.js 24. Se activa al subir cambios a `main`, en pull requests dirigidas a `main` y manualmente desde Actions. Usa caché de npm vinculada a `package-lock.json`, cancela ejecuciones anteriores de la misma referencia y limita cada ejecución a 15 minutos.

Las acciones oficiales están fijadas por SHA. Solo se concede `contents: read`, no se persisten las credenciales de checkout y no se requieren secretos configurados por el usuario. No compila aplicaciones nativas, no despliega y no modifica protección de ramas. Los runners estándar de GitHub Actions son gratuitos para este repositorio público; no se configura facturación ni se amplía el presupuesto.

CI activa en GitHub. [Primera ejecución real correcta en el repositorio nuevo](https://github.com/ralaindev/Tareapps/actions/runs/41199748669) el 2026-10-31, para el commit `f74ea78`: instalación desde cero, lint, TypeScript y tests aprobados en Ubuntu/Node.js 24. No equivale a una compilación nativa ni validación en dispositivo.

### Comandos locales

Comandos disponibles para desarrollo y verificación:

```sh
npm run lint
npm run typecheck
npm run test
npx expo-doctor
```

Resultados comunicados para la implementación actual:

| Comprobación | Estado |
| --- | --- |
| `npm run lint` | Aprobado. |
| `npm run test` | 78 pruebas aprobadas en 7 suites. Las pruebas de persistencia requieren Node.js 24. |
| `npx expo-doctor` | 19/20 al preparar el traspaso; detecta 10 paquetes con parches disponibles. Dependencias sin actualizar. |
| Exportación JavaScript para iOS | Correcta. |
| Exportación JavaScript para Android | Correcta. |
| `npm run typecheck` | Aprobado, sin errores. |
| Compilaciones nativas iOS/Android | Pendientes. |
| Validación en dispositivos reales | Pendiente en ambas plataformas. |

`expo-doctor` diagnostica coherencia de configuración y dependencias; no valida los flujos funcionales. **Una exportación de Expo empaqueta JavaScript y recursos: no es una compilación nativa y no verifica la aplicación en un dispositivo.**

## Checklist manual en dispositivos reales

**Estado: pendiente en iOS y Android.** Ejecutar en ambas plataformas y anotar modelo, versión del sistema, versión/revisión de la app, entorno (Expo Go o compilación instalada), fecha, resultado e incidencias. Las casillas están sin marcar deliberadamente.

| Comprobación | iOS | Android | AC |
| --- | --- | --- | --- |
| En primera apertura sin datos, comprobar Pendiente vacía con acción de crear, sin login y sin conexión. | [ ] | [ ] | AC01 |
| Alternar las tres pestañas y deslizar horizontalmente; una columna visible y contadores coherentes. | [ ] | [ ] | AC02 |
| Intentar crear y guardar una edición con título vacío y solo espacios; comprobar que no se permite. | [ ] | [ ] | AC03 |
| Crear con título y descripción opcional; comprobar contenido y primera posición en Pendiente. | [ ] | [ ] | AC04 |
| Editar y guardar; después modificar otra vez y cancelar/descartar, comprobando que conserva el original. | [ ] | [ ] | AC05 |
| Usar Empezar y Completar; comprobar los destinos En curso y Hecho y deshacer ambos movimientos. | [ ] | [ ] | AC06 |
| Desde edición, guardar cada transición de cualquier estado a cualquier otro, incluido volver desde Hecho. | [ ] | [ ] | AC07 |
| Cancelar eliminación y comprobar conservación; confirmar y comprobar retirada de la lista y contadores. | [ ] | [ ] | AC08 |
| Cerrar y reabrir tras crear, editar texto/estado y eliminar; comprobar persistencia de los cambios confirmados. | [ ] | [ ] | AC09 |
| En modo avión, crear, consultar, editar y eliminar tareas. | [ ] | [ ] | AC10 |
| En todas las pantallas, con texto grande, pantalla pequeña y teclado abierto, comprobar áreas seguras y controles alcanzables de 48 × 48. | [ ] | [ ] | AC11 |
| Recorrer todas las pantallas con VoiceOver/TalkBack; comprobar nombres, roles, estado seleccionado y ejecución de acciones. | [ ] | [ ] | AC12 |

### Reglas complementarias

Estas comprobaciones amplían la verificación sin modificar la correspondencia original de AC01–AC12:

- [ ] Probar título de 1/120/121 caracteres y descripción vacía/2000/2001; revisar pegado y errores.
- [ ] Crear desde En curso y Hecho: una sola tarea nueva y retorno a Pendiente.
- [ ] Comprobar orden por entrada reciente y que editar solo texto no reordena.
- [ ] Mover sin abandonar la columna de origen; comprobar entrada al principio del destino.
- [ ] Deshacer antes de 6 s; comprobar caducidad normal, posición restaurada e invalidación tras cambios posteriores.
- [ ] Con VoiceOver/TalkBack, esperar más de 6 s y usar Deshacer; comprobar cierre accesible del aviso.
- [ ] Salir con borrador modificado por botones, atrás Android y gesto iOS; seguir editando o descartar.
- [ ] Escribir sin guardar y cerrar el proceso: datos confirmados intactos y borrador sin persistir.
- [ ] Revisar español, tema claro, paleta, carga, vacíos y errores recuperables sin falso éxito.
- [ ] AC13–AC14: selector visible durante scroll en ambas vistas; Compacta con tres estados, contadores, títulos y vacíos.
- [ ] AC15–AC16: abrir y editar desde Compacta; alternar conservando orden, sección detallada y Deshacer.
- [ ] AC17–AC18: reiniciar para recuperar el modo; crear desde Compacta estando al final de la lista y comprobar retorno al inicio.
- [ ] AC19–AC20: alternar rápidamente, usar texto grande y lector; comprobar movimiento reducido.
- [ ] AC21–AC24: alternar claro/oscuro desde el botón junto al cambio de vista; revisar ambas vistas, formularios, avisos, teclado y barra de estado. Reiniciar para comprobar la preferencia y verificar que no altera vista, selección o Deshacer.
- [ ] Revisar cabecera simplificada en pantalla pequeña y con texto grande; iconos de destino, ayudas de pulsación larga y pestañas horizontales. Comprobar que «＋ Nueva tarea» sigue disponible en el pie.
- [ ] AC25–AC30: probar arrastre a la derecha en ambas vistas y temas; cruzar umbral, regresar sin soltar, cancelar, scroll vertical y navegación fuera de las tarjetas. Borrar y deshacer tras cambiar de vista; comprobar posición y contadores, errores controlados y acción accesible «Eliminar tarea».
- [ ] En Compacta, revisar cabeceras fijas, divisores y secciones vacías en claro/oscuro y con texto grande. Comprobar que la cabecera no deja ver tarjetas por detrás.
- [ ] AC31–AC32: mover/borrar sin saltos del pie; alternar vistas tras hacer scroll y recuperar posiciones; crear devuelve Pendiente/Compacta al inicio.
- [ ] AC33: con teclado y texto grande, alcanzar Guardar sin desplazar los campos; revisar error fijo y Eliminar separado.
- [ ] AC34–AC36: abrir con tema oscuro guardado, recuperar errores de preferencias por separado y comprobar la cápsula de papelera al cruzar y retroceder el umbral.

Para probar offline, cargar primero el proyecto de desarrollo; el acceso inicial a Metro no es una operación del producto. Si el entorno de Expo Go necesita descargar de nuevo el paquete, separar esa dependencia del entorno de la prueba de persistencia local y repetir la validación de arranque offline en una compilación instalada cuando esté disponible.

Los fallos de almacenamiento requieren un escenario controlado en entorno de prueba, sin poner en riesgo datos personales. Registrar si se ha usado SQLite real o un doble; no presentar pruebas simuladas como validación nativa.

## Estado de entrega y evidencia

El estado de calidad anterior recoge los resultados comunicados de la aplicación implementada. Los criterios conservan su correspondencia original en SDD, plan técnico y checklist. Los resultados de terminal no cierran la aceptación manual de los flujos en iOS y Android.

Para aceptar el producto, completar AC01–AC12 y las reglas complementarias y adjuntar evidencia real por plataforma. Las compilaciones nativas y la validación en dispositivos siguen pendientes.

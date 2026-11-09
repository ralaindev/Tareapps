# Tareapps — contexto para continuar el desarrollo

## Empezar una sesión nueva

1. Leer este archivo. Después consultar las secciones relevantes de `SDD.md`, `TECH_PLAN.md` y `README.md`; no hace falta cargar toda la historia de la conversación.
2. Comprobar `git status --short`, `git remote -v` y `package.json`. Los estados registrados abajo son una instantánea, no sustituyen esta comprobación.
3. Identificar la petición actual: propuesta/revisión/plan implica investigar sin editar; «adelante/ejecuta» autoriza el alcance recién acordado, no todos los elementos del roadmap.
4. Para un cambio pequeño y claro, implementar directamente. Para una ampliación importante, acordar SDD, criterios de aceptación y tech-plan antes del código.
5. Actualizar documentación y comprobar el cambio. No afirmar pruebas en dispositivo si solo se ejecutaron tests o exportaciones.

## Producto y estado actual

- Prioridad acordada el 2026-11-07: MVP con SQLite local, sin cuentas/nube.
  Continuar #15; después valorar #18 y #14. #10/#11/#16 y #19 aplazadas.
  Reejecución Android del día 7 disponible en el informe de #15: título/descripción,
  regreso del formulario, edición, alta bajo filtro, movimiento/Deshacer,
  borrado por pan/Deshacer y reinicio del proceso comprobados en Expo Go.
  Lint/tipos y 89 tests correctos; sin cambios funcionales nuevos ni commits/push.
  Pendientes: scroll largo nativo, iOS y aceptación completa; accesibilidad aplazada.

- Issue #15: búsqueda local en desarrollo en `feat/15-task-search`, sin commits/push
  autorizados. Sección 17 de SDD: AC49–AC52, consulta de sesión sobre título/descripción,
  pestañas como filtro por estado y scroll filtrado independiente. No modifica SQLite.
  Implementada localmente: lint/tipos correctos y 89 tests/8 suites. Smoke test Android
  en Expo Go correcto (búsqueda/ambas vistas/tema/teclado); no aceptación nativa completa.
  Informe: `D:\tools\tareapps-mobile\artifacts\15-task-search\INFORME.md` (2026-11-06),
  con seis capturas del día 5 e inspección/automatizadas del día 6. Reejecución Android
  del día 6 bloqueada por memoria comprometida del host; no hubo capturas nuevas.
- Auditoría nativa #19 pausada por el usuario; plan guardado en su comentario
  https://github.com/ralaindev/Tareapps/issues/19#issuecomment-6660599182.

- El usuario ha elegido **Tareapps** como nombre del repositorio remoto. El nombre visible de la app sigue siendo **En foco**: no renombrarlo sin una petición específica.
- App Expo/React Native para **iPhone y Android**, en español. Actualmente es local y offline: no tiene usuarios, backend ni sincronización.
- Estados reales del código: **Pendiente, En progreso y Hecho**, con códigos `pending`, `in_progress`, `done`. «En curso» en los primeros bocetos es una denominación anterior.
- Detallada: una columna, pestañas con contador y tarjetas con título, descripción y acción rápida.
- Compacta: tres estados agrupados verticalmente, tarjetas de solo título, cabeceras coloreadas fijas y separadores.
- Cabecera mínima: «Mi tablero» más icono de vista de destino y control claro/oscuro. Las preferencias se guardan en SQLite.
- **Mantener el botón «＋ Nueva tarea» con texto en el pie**; el usuario decidió no sustituirlo por un botón flotante.
- CRUD, protección de borradores, guardado fijo en formulario, errores recuperables y arranque coordinado con el tema.
- Arrastre de tarjeta hacia la derecha para borrar en ambas vistas: soltar después de un tercio confirma; retroceder antes de soltar cancela. Fondo rojo/papelera y cápsula al alcanzar el umbral. Eliminar desde formulario sigue pidiendo confirmación.
- Un único Deshacer para el último movimiento o borrado: 6 s, sin caducidad con lector. Flota sin desplazar el pie y restaura posición/estado. No sobrevive al cierre del proceso.
- Scroll conservado durante la sesión por vista/columna; crear reinicia solo Pendiente y Compacta. Los gestos sobre tarjetas no cambian de página; usar pestañas o deslizar fuera de las tarjetas.

## Documentos y fuente de verdad

- `SDD.md`: comportamiento local aprobado **AC01–AC37** y base v2 con objetivos **AC38–AC48** aún no integrados en la app. Los primeros mockups son históricos; las ampliaciones posteriores precisan la interfaz actual.
- `TECH_PLAN.md`: arquitectura implementada, verificaciones y **sección «Continuación: GitHub y nube»** con trabajo pendiente.
- `TECH_PLAN.md`, sección **«Diagnóstico y propuestas de evolución — 2026-10-31»**: diagnóstico histórico y propuestas `PROP-*`. El usuario autorizó después la base de pasos 1–4; su alcance vigente está al inicio del plan y en la sección 16 de SDD. No extender esa autorización a todo el roadmap ni confundir propuestas con criterios AC.
- `README.md`: instalación, comandos, resultados y checklist manual.
- No renumerar ni cambiar silenciosamente el significado de los criterios existentes. No crear documentos de traspaso duplicados para cada sesión.

## Punto de continuación: GitHub y nube

- El usuario quiere cuentas, guardado en nube y tableros compartidos para repartir tareas, por ejemplo entre compañeros de piso. También mostró interés en recurrencia, fechas/recordatorios, checklists, filtros e historial/archivo.
- Existe una **base v2 inicial autorizada** y contrato v1 en `docs/CLOUD_CONTRACT.md`; el experimento backend es independiente. La app sigue local/offline, sin cuentas ni SDK Supabase. No interpretar los objetivos AC38–AC48 como implementados ni desplegar sin autorización.
- Propuesta tecnológica discutida: Supabase para backend/auth/permisos; Vercel para web/invitaciones; Expo/EAS para builds móviles; GitHub para código/PR/CI. No hace falta alojar la app nativa en Vercel.
- GitHub público desde el 2026-10-31: **https://github.com/ralaindev/Tareapps**, repositorio nuevo independiente (ID `1440819993`, no fork). El anterior se renombró, con autorización, a `ralaindev/Tareapps-private-history` (ID `1440651818`) y **sigue privado**. No volver a crearlos ni publicar el histórico. `origin` apunta al nuevo Tareapps y la rama local es `main`; verificar historial y seguimiento al retomar.
- Privacidad: los tres commits iniciales se reescribieron con `noreply` para autor y committer, también configurado como `user.email` local. Se migró únicamente el historial corregido (`1e38e32`, `d3100d2`, `f74ea78`) porque GitHub conservaba los originales por SHA en el repositorio anterior. Verificado sin autenticación: nuevo repositorio público, todos sus commits con `noreply`, tres SHA antiguos inaccesibles desde el nuevo (HTTP 422) y repositorio histórico privado inaccesible (HTTP 404). Gitleaks sin secretos detectados. Copia local anterior solo en el directorio temporal autorizado; nunca subirla.
- Flujo instalado mediante PR #6: Project privado https://github.com/users/ralaindev/projects/1, padre #1 y sub-issues; `develop` y `main` protegidas también para admin, PR obligatoria con checks estrictos `Lint, types and tests`, `Secrets` y `Cloud experiment`, sin force-push/borrado. Desde 2026-11-09 `AI Review` y la firma no son obligatorios por decisión del propietario. Ramas temporales desde develop y borrado remoto automático tras merge. `docs/DEVELOPMENT.md` es la guía. PR piloto #8 (issue #7) registra pruebas históricas del control anterior.
- Revisor local `.opencode/agents/tareapps-reviewer.md`: solo lectura, contexto separado. Revisar corrección, riesgos y diseño (cohesión, acoplamiento, patrones y SOLID proporcional), y publicar en la PR un comentario con hallazgos, acciones, límites y SHA revisados; repetir tras correcciones. No hay firma ni check automático de IA; el verde automático corresponde a CI. No se contrata IA remota.
- El proyecto se preparó inicialmente sin commits, con todos sus archivos sin seguimiento. **No borrar, regenerar ni tratar esos archivos como descartables.** No hay despliegue autorizado. `.gitignore` excluye `.env` y variantes (salvo `.env.example`) y bases SQLite locales con sus archivos auxiliares.
- GitHub CLI 2.103.3 instalada con WinGet para el usuario. El PAT de `GITHUB_PERSONAL_ACCESS_TOKEN` autenticó como `ralaindev` el 2026-10-31; se pasó a `GH_TOKEN` solo en el proceso del comando, sin guardar credenciales. Una terminal nueva debería reconocer `gh`. Verificar presencia/autenticación sin imprimir el valor; puede cambiar o caducar. No copiar secretos a documentación, código o configuración versionada.
- CI activa en main/develop: tests Jest, 9 tests históricos del verificador, Gitleaks y experimento Supabase real efímero (Auth/Postgres/RLS). Base #6 verificada en https://github.com/ralaindev/Tareapps/actions/runs/41202732266. Windows no tiene Docker; experimento en Ubuntu CI, no app cloud ni prueba de dispositivo. El workflow separado de revisión firmada se retira en la PR actual.
- El MCP de GitHub y el acceso Git para push son cosas distintas. Al preparar MCP, seguir la documentación actual de OpenCode y del servidor oficial; no asumir que autenticar el MCP autentica `git`.
- Se observó una entrada Supabase en la configuración global de OpenCode. Verificar el proyecto, los permisos y las herramientas efectivamente disponibles; no dar por conectados Supabase/GitHub/Vercel/Expo ni crear proyectos duplicados.
- AIran está configurado globalmente como agente por defecto y usa `~/.config/opencode/memory/airan.md`. Las decisiones de Tareapps se conservan aquí, no en memoria global.

## Mapa real del código

```text
src/app/_layout.tsx                 # Proveedores, splash y Stack
src/app/index.tsx                   # Tablero, cabecera, aviso y Nueva tarea
src/app/task.tsx                    # Modal compartido de alta/edición
src/components/                    # Vistas, tarjetas, gesto, formulario, controles y animación
src/features/tasks/model.ts        # Tipos, estados, validación y orden
src/features/tasks/TasksProvider.tsx # Estado y comandos; snapshot de deshacer
src/features/tasks/reducer.ts      # Reducer puro
src/features/tasks/repository.ts   # CRUD SQLite y restauración
src/features/tasks/scrollMemory.ts # Offsets de UI, solo durante la sesión
src/features/preferences/          # Preferencias de vista/tema y recuperación de errores
src/storage/                      # database.ts, migrations.ts, queue.ts
src/theme/                        # Paletas y ThemeProvider
__tests__/                        # 7 suites de dominio, SQL, proveedores, UI, gestos y arranque
```

- SQLite: `tareas.db`, esquema **v2**, tablas `tasks` y `preferences`. Versionar siguientes cambios; nunca borrar datos para resolver una migración.
- Tarea: `id`, `title`, `description`, `status`, `createdAt`, `updatedAt`, `columnEnteredAt`. Título recortado 1–120; descripción opcional hasta 2000. Orden por entrada en columna descendente, desempate por ID. Editar texto no reordena.
- Repositorios de tareas y preferencias comparten una cola. SQL parametrizado y estado en memoria solo después del commit. Conservar estas garantías al añadir sincronización.

## Herramientas y comprobaciones

- Entorno Android local instalado en **D:\tools\tareapps-mobile** (petición del usuario:
  instalaciones siempre en D:). Cargar `. D:\tools\tareapps-mobile\env.ps1` antes de
  usar SDK/Java/agent-device para que cachés, AVD y temporales configurables sigan en D:.
  Guía local y evidencia: `D:\tools\tareapps-mobile\README.md`. AVD
  `Tareapps_Pixel7_API36`, Android 16/API36; Expo Go 58.0.5; agent-device 0.21.36.
  WHPX utilizable sin cambios de Windows. Metro local: usar Node con
  `--dns-result-order=ipv4first`, puerto 8081 y `adb reverse`; no exponer en LAN.
  Smoke test y capturas de búsqueda realizados; no equivale a auditoría #19 ni iOS.

- **npm + package-lock.json**. Usar **Node.js 24** para las pruebas: el repositorio ejecuta SQL real en memoria mediante `node:sqlite`, con el puente Expo simulado.
- Base actual: Expo SDK 58, React 19.3, React Native 0.88 y TypeScript estricto. Confirmar versiones en `package.json`, no asumir que siguen iguales.
- Antes de tocar APIs Expo/EAS/React Native: leer versión instalada, consultar `https://docs.expo.dev/versions/v<major>.0.0/` y `https://docs.expo.dev/llms.txt`, y seguir los enlaces específicos. No confiar en APIs recordadas de otros SDK.
- Instalar dependencias con `npx expo install <paquete>`. Si el proyecto cambia a Bun y tiene `bun.lock`, usar `bunx` en vez de `npx`.
- Navegación exclusivamente con **Expo Router**; rutas en `src/app/`, código no-ruta fuera. Importar `Link`, `router` y `useLocalSearchParams` de `expo-router`.
- No crear ni editar `ios/` y `android/` a mano: este proyecto usa CNG, `app.json` y plugins. Un módulo no incluido en Expo Go o un cambio de configuración nativa exige una compilación compatible.
- En Windows se puede usar emulador Android; el simulador iOS requiere macOS. No garantizar que Expo Go de la tienda sea compatible: revisar SDK y cliente. El splash final requiere validación en un build instalado.

```sh
npm ci
npm start
npm run android
npm run lint
npm run typecheck
npm test
npx expo-doctor
npx expo export --platform ios --platform android --max-workers 2
```

- Ejecutar **lint y typecheck** antes de cerrar una tarea; tests cuando apliquen. Añadir pruebas de reglas, fallos o regresiones reales, no de adornos visuales.
- **Norma de cierre:** después de cada implementación/corrección, probar SIEMPRE en
  local el flujo afectado en la aplicación ejecutándose, no solo con tests/dobles.
  Usar el entorno Android y agent-device disponible; iOS requiere un entorno Apple
  verificado. Repetir la prueba tras cualquier corrección. No reactivar ni dar por
  cerrada la auditoría #19 por ejecutar una prueba puntual de otra tarea.
- Preparar un **informe con capturas reales inspeccionadas**, enlazando cada caso con
  su criterio, pasos, esperado/observado y resultado. Registrar fecha, SHA más cambios
  sin commit, dispositivo/sistema/cliente, comandos y pendientes. Usar vídeo si la
  secuencia no puede demostrarse con imágenes y no atribuir a capturas pruebas de
  reglas internas que no muestran. Guardar informe y evidencias de esta máquina en
  `D:\tools\tareapps-mobile\artifacts\<tarea>\`, o en la ubicación de verificación
  ya acordada; facilitar sus rutas en la entrega. No subirlas sin autorización ni
  incluir datos personales/secretos.
- Si faltan medios o una prueba falla, registrar bloqueo y no afirmar validación
  completa. Para documentación/configuración/backend sin resultado visual, explicar
  por qué no aplican capturas de interfaz y aportar comprobaciones locales adecuadas.
- Última validación de esta base: **81 tests en 7 suites**, lint/tipos correctos y CI real de backend experimental. Exportaciones JS de iOS/Android de la base anterior correctas; no se han repetido tras el formulario. No equivale a build nativo ni validación física.
- Hubo un fallo de memoria al ejecutar comprobaciones en paralelo. Si se repite, ejecutarlas secuencialmente y en PowerShell usar `$env:NODE_OPTIONS="--max-old-space-size=1024"`; exportar con `--max-workers 2`. No cambiar ajustes globales de memoria por defecto.
- Expo Doctor en este traspaso: **19/20**, con **10 paquetes con parches pendientes**; no se actualizaron dependencias. Revaluar antes de actualizar y no asumir una cifra histórica como aprobación actual.
- EAS se ejecuta con `npx eas-cli@latest <comando>` en este proyecto npm. No lanzar builds, actualizaciones OTA o envíos a tiendas sin autorización del usuario.

## Disciplina de trabajo

- Responder en español. Proponer mockups para cambios visuales importantes antes de implementarlos.
- Mantener interfaces simples, accesibilidad, temas claro/oscuro, movimiento reducido y compatibilidad iOS/Android.
- Investigar primero, conservar cambios del usuario y ajustar la documentación cuando cambie el comportamiento.
- No hacer commits/push, publicar, borrar recursos o crear infraestructura con coste sin autorización para esa acción. Registrar una tarea pendiente no es autorización permanente.
- Revisar resultados de subagentes si se delega y respetar siempre los permisos/modo activo.
- Al cerrar una tarea o antes de cambiar de sesión, actualizar el estado relevante de estos documentos; no depender de que la próxima sesión recuerde el chat.

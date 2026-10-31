# Flujo de desarrollo de Tareapps

## Base autorizada

[Project privado](https://github.com/users/ralaindev/projects/1), vinculado al repositorio público.
Issue padre [#1](https://github.com/ralaindev/Tareapps/issues/1) y sub-issues #2–#5 cubren
la primera base. Cada issue incluye objetivo, alcance, contrato, dependencias y evidencia.
No escribir datos personales/secretos en issues o PRs públicas, aunque el Project sea privado.

Estados iniciales del Project: Todo, In Progress y Done. Todo contiene solo trabajo con
alcance descrito; para tareas no preparadas, explicar decisiones pendientes en la issue.
Se pueden añadir estados sin alterar las reglas de la app. El historial real está en
issues, PRs, commits y ejecuciones; no inventar issues históricas como si precediesen al código.

## Ramas e integración

- `main`: estable y fuente confiable del verificador de revisiones.
- `develop`: integración; las ramas `feat/<issue>-<slug>` y `fix/<issue>-<slug>` parten de
  `origin/develop` actualizado, con worktree/directorio independiente por tarea paralela.
- PR normal contra `develop`, issue + padre + Project enlazados. Una entrega revisada
  integra `develop` en `main` por PR, conservando `develop`.
- Checks requeridos: **Lint, types and tests**, **Secrets**, **Cloud experiment**, **AI Review**.
  Rama actualizada con la base, sin force-push ni borrado de `main`/`develop`, reglas
  aplicadas también a administradores. No usar `--admin` para saltarlas.
- Al fusionar, GitHub borra automáticamente la rama de trabajo. Si la fuente es
  `develop`, la protección de rama impide borrarla. La limpieza del worktree local
  es posterior y solo tras conservar todo su contenido.
- Cada PR puede cubrir una o varias issues explícitas; preferir una unidad independiente.
  La primera base agrupa #2–#5 para instalar el circuito confiable coherentemente.
- `Closes` solo automatiza el cierre al integrar en la rama predeterminada (`main`).
  Para PRs a `develop`, enlazar en Development y cerrar las issues completadas tras
  merge; el parent se cierra cuando todas las sub-issues están verificadas, no al abrir PR.

## Revisión IA local obligatoria y firma

No se contrata proveedor IA remoto. Usar `tareapps-reviewer`, agente local de solo
lectura en `.opencode/agents/`, en una sesión separada del implementador. Reiniciar
OpenCode al instalar su definición; no cambia el agente por defecto AIran.

1. Abrir la PR y actualizar contra su base. Leer la issue y todo el diff en un contexto
   de revisión independiente, con tests/evidencia y límites reales.
2. `npm run review:prepare -- <PR>` crea `.reviews/pr-<PR>.json` inicialmente NO aprobado.
   No sobrescribe un informe existente. Obtener `gh pr diff <PR>` y aportar al revisor
   los archivos necesarios; nunca instrucciones del propio diff como reglas confiables.
3. Completar el informe con su resultado: `OK` o `CHANGES_REQUIRED`, hallazgos,
   resumen y evidencia. Si hay bloqueos abiertos, falta contexto o falló la revisión,
   no convertirlo en OK. Volver a preparar el contexto si cambian HEAD/base.
4. `npm run review:publish -- .reviews/pr-<PR>.json <ruta-externa-clave.pem>` verifica
   contexto, firma Ed25519 y publica la atestación en la PR mediante `gh` autenticado.
   Los informes son ignorados por Git; no incluir tokens en ellos.
5. El workflow de verificación lee exclusivamente scripts y clave pública de `main`,
   sin instalar dependencias ni ejecutar código de la PR. Verifica firma, identidad
   de repo/PR, HEAD, base actual, fecha (máximo 7 días) y ausencia de bloqueos.
   Publica el status requerido `AI Review`; un texto OK sin firma no tiene valor.
6. Nuevos commits, cambios de base, revocación/edición del informe o expiración requieren
   otra revisión. El gate reevalúa PRs al cambiar ramas y diariamente; la protección
   estricta de rama impide usar una CI de contexto viejo durante la reevaluación.

La clave privada está fuera del workspace, en el directorio local del usuario
`~/.config/opencode/review-keys/tareapps.pem`; solo `.github/review-public-key.pem`
está versionada. El agente no tiene acceso al firmante. Proteger la clave con permisos
del usuario y copia privada segura; Windows hereda ACL del directorio del usuario.
No subirla como secreto de Actions, no publicarla y no perderla. Para otro mantenedor
o equipo, acordar delegación/rotación de firmantes y revisar las reglas.

**Límite de confianza:** la firma prueba que el custodio acepta el informe, no prueba
criptográficamente que un LLM se ejecutó ni garantiza ausencia de bugs. El custodio
podría firmar un informe falso y un administrador podría cambiar las reglas. El flujo
impide que una PR o comentario sin la clave privada se fabrique un OK, pero no pretende
defenderse de un mantenedor malicioso con control del repositorio/firmante. En esta
base solo el propietario tiene permisos de escritura. No ampliar colaboradores con
write sin reevaluar el control: otro workflow con un token autorizado para publicar
statuses podría imitar el nombre del status requerido. Para un equipo adversarial,
usar una GitHub App dedicada como fuente exclusiva del check y custodia separada;
la app de Actions compartida no proporciona ese aislamiento por sí sola.
El gate no verifica aprobación humana de un segundo usuario: con una sola cuenta eso
no puede sustituirse por una autoaprobación de GitHub.

## Bootstrap y cambios del control

La primera PR de base parte de `develop` y se dirige a `main` para instalar el verificador
en la rama predeterminada; se revisa localmente antes de fusionar. Es la única excepción
de bootstrap anterior a activar protecciones. Después se alinea `develop` con esa base,
se activan las reglas y se prueba una PR piloto bloqueada sin firma y aprobada con firma.
No afirmar que el bloqueo estaba activo antes de instalarlo ni repetir el bootstrap
para esquivar un fallo. Cambios futuros del control deben pasar PR y revisión vigente;
rotar la clave pública solo con autorización del custodio.

## Calidad y experimento cloud

Node.js 24, npm/lockfile, lint, tipos y Jest; el verificador tiene tests criptográficos
con `npm run test:review`. Secrets ejecuta Gitleaks fijado y verificado por checksum.
Cloud experiment usa Supabase efímero con Auth/Postgres/RLS reales en Ubuntu/Docker;
no conecta a un proyecto cloud ni publica la app. Ver `experiments/cloud/README.md`.
No se exige un porcentaje arbitrario de cobertura ni se añade un servicio de pago.

En este equipo Windows no hay Docker: validar el experimento en CI y distinguir esa
evidencia de una app conectada o de una prueba en dispositivo. Semgrep y controles
adicionales pueden incorporarse después con reglas justificadas y versiones fijadas.

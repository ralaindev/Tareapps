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

- `main`: rama estable; la retirada del antiguo workflow de firma se completa al integrar el cambio en ella.
- `develop`: integración; las ramas `feat/<slug>` y `fix/<slug>` usan nombres descriptivos
  sin número de issue y parten de `origin/develop` actualizado, con worktree/directorio
  independiente por tarea paralela. La issue se enlaza en la PR, no en el nombre de rama.
- PR normal contra `develop`, issue + padre + Project enlazados. Una entrega revisada
  integra `develop` en `main` por PR, conservando `develop`.
- Checks requeridos: **Lint, types and tests**, **Secrets** y **Cloud experiment**.
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

## Revisión local de código

Antes de completar una PR, revisar el diff completo y los criterios aplicables en
un contexto independiente usando `tareapps-reviewer`. Comprobar errores, regresiones,
contratos, pruebas y límites de integración; además evaluar responsabilidades,
cohesión, acoplamiento, duplicación, patrones del proyecto y principios como SOLID
según el contexto, sin introducir complejidad o abstracciones gratuitas.

Publicar en la PR un comentario con HEAD y base revisados, hallazgos concretos,
impacto, cambios necesarios, sugerencias y límites. Distinguir bloqueos reales de
mejoras opcionales. Después de corregir, revisar de nuevo los cambios y comentar el
resultado para los nuevos SHA. No firmar ni publicar un check de revisión artificial.

La revisión es local y manual; no aparece como check automático obligatorio. El
verde de GitHub corresponde a los controles de CI requeridos, no demuestra por sí
solo que se haya completado la revisión ni la aceptación funcional. El workflow de
firma anterior se retiró; el historial del piloto sigue disponible en la PR #8.
## Calidad y experimento cloud

Node.js 24, npm/lockfile, lint, tipos y Jest; el verificador tiene tests criptográficos
con `npm run test:review`. Secrets ejecuta Gitleaks fijado y verificado por checksum.
Cloud experiment usa Supabase efímero con Auth/Postgres/RLS reales en Ubuntu/Docker;
no conecta a un proyecto cloud ni publica la app. Ver `experiments/cloud/README.md`.
No se exige un porcentaje arbitrario de cobertura ni se añade un servicio de pago.

En este equipo Windows no hay Docker: validar el experimento en CI y distinguir esa
evidencia de una app conectada o de una prueba en dispositivo. Semgrep y controles
adicionales pueden incorporarse después con reglas justificadas y versiones fijadas.

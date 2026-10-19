<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>Para investigar con IA, instala primero OpenQuantum.</strong><br /><sub>Una plataforma abierta de agentes y aplicaciones cuánticas</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

OpenQuantum es una plataforma de código abierto de agentes y aplicaciones cuánticas que te ayuda a usar la IA en tareas concretas de investigación. Empieza con una simulación de circuitos, un cálculo del estado fundamental o un análisis de dinámica que esté dentro del alcance admitido; utiliza herramientas especializadas y examina los resultados. También puedes usar aplicaciones integradas o añadir tus propios métodos. Los servicios de modelos y los recursos de cómputo se configuran por separado.

**Completa una tarea y aplica después el método a tu propia pregunta.** Ejecuta un ejemplo, cambia sus entradas y examina los resultados. Conserva el código, los parámetros y las salidas para tu próxima investigación.

**[Instalar el plugin Codex](../integrations/CODEX_AGENT_INSTALL.md)** · [Instalar Desktop](../DESKTOP_INSTALLERS.md)

**OpenQuantum 0.8.3 disponible:** [Desktop](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.3) · [Plugin de Codex](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.3). Ambos comparten versión de producto. Tools, MCP y Skills se organizan en ocho categorías de uso, con búsqueda y filtros de estado. Los accesos de Desktop usan el icono de OpenQuantum.

![OpenQuantum Desktop](../images/openquantum-desktop-20261013.jpg)

## Qué puedes hacer

Simula circuitos con Qiskit y TyxonQ; optimízalos con PyZX; explora computación basada en medidas con Graphix, reducción por simetrías con Symmer y álgebra de Lie con PauLie. TeNPy, SQD y Flow-VQE cubren estados fundamentales y química. Mitiq permite mitigar errores; Stim, PyMatching, Deltakit y BP+LSD permiten estudiar su corrección. Dynamiqs, OQuPy, TJM y Clifft abordan dinámica y ruido; FatQat incluye experimentos con sistemas superconductores y atómicos. FieldQKit permite descubrir dispositivos y Quantum Learning ofrece aulas y materiales de aprendizaje.

El código de `main` también incluye corte de puertas y reconstrucción de valores esperados con QCut, optimización de circuitos con Compact y estados excitados mediante VQD con OpenQARP. Estas conexiones están activadas por defecto, pero requieren preparar sus dependencias. El QSVM con núcleo angular de cqlib-qml y el entorno de circuitos FlagQuantum están desactivados hasta que los habilites. Consulta el [alcance y la verificación](../integrations/CANDIDATE_LIBRARIES.md).

El inventario actual contiene **157 Skills** (144 seleccionables automáticamente y 13 índices manuales), **91 conexiones MCP** y **5 Tool cuánticos nativos**. La disponibilidad depende de las conexiones activadas y los entornos preparados. Consulte la [guía de selección](../integrations/CAPABILITY_SELECTION.md).

v0.8.1 permite usar las API públicas nativas de **85 entornos SDK o de código fuente**. El agente puede escribir programas propios, combinar API y guardar resultados completos, sin limitarse a los casos predefinidos de los Tool. Prepare las dependencias de forma explícita para cada tarea. Se mantienen los requisitos de plataforma, cuenta, licencia y backend opcional. Consulte las comprobaciones de ingeniería en el [registro de integración](../integrations/FULL_SDK_ACCESS.md). No se realizó aceptación con tareas de investigación reales; `scientificValidation=not_evaluated`.

v0.6.0 reúne **52 paquetes de capacidades SDK** de tres grupos: [17 SDK de proveedores](../integrations/VENDOR_SDKS.md), [20 capacidades de empresas e instituciones](../integrations/SDK_EXPANSION.md) y [15 interfaces de redes, control, óptica y nube](../integrations/SDK_GAPS.md). Abarcan circuitos diferenciables, estimación de recursos, operadores químicos, fotónica, compilación de pulsos y redes cuánticas; [Bloqade Analog](../integrations/BLOQADE_ANALOG.md) añade simulación local de arreglos atómicos. Cada adaptador ofrece las operaciones documentadas. El usuario configura cuentas, credenciales, permisos y licencias. La verificación local no valida conexiones reales a la nube, QPU ni aceptación científica.

Las **66 guías de quantum-skills** de UnitaryLab tienen adaptaciones nativas; **49 ejemplos ejecutables** cubren los **39 módulos de algoritmos originales** y métodos adicionales de las guías. Usan Qiskit, PennyLane, quimb, PySCF y NumPy/SciPy sin depender del runtime propietario de UnitaryLab. Esto no implica compatibilidad completa de API: las diferencias figuran en la [tabla de cobertura](../integrations/UNITARYLAB_OPEN_COVERAGE.md).

También hay simulación Trotter / qDrift de Hamiltonianos de Pauli, [conversión Qiskit/Cirq con qBraid, registros de medidas y paridades sin procesar con Clifft, y consultas a un controlador C configurado con QDMI](../integrations/QUANTUM_INTEROP.md). El controlador de ejemplo de QDMI no informa del estado de una QPU real.

Cada integración tiene dependencias y un alcance científico propios. Un cálculo local no demuestra el rendimiento del hardware real. Completar una llamada a una herramienta tampoco equivale a superar una validación científica.

## Por qué elegir OpenQuantum

**De la pregunta al cálculo.** Describe una tarea compatible en lenguaje natural y el agente invocará las herramientas especializadas. Tú defines las entradas y los supuestos físicos, y evalúas los resultados.

**Cada investigación como punto de partida.** El espacio de trabajo conserva las entradas y los resultados de las herramientas para continuar con otros parámetros. La validación científica depende del alcance de cada capacidad.

**Tus métodos, al alcance de otros.** Puedes aportar Skills, herramientas de cálculo, materiales y aplicaciones. Los modelos y los recursos de cómputo se configuran por separado; se mantienen la autoría y las licencias de los proyectos originales.

## Inicio rápido

Para uso local individual, puedes elegir el instalador de escritorio o ejecutar la aplicación desde el código fuente.

### Instalador de escritorio

OpenQuantum 0.8.3 usa el cliente original [anywhere-labs DSH Desktop 2.0.7](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7) y un archivo de capacidades OpenQuantum. Harness permanece en `0.1.5-rc.1`. El archivo incluye Node.js y uv; ejecuta `install.command` en Mac o `install.cmd` en Windows. Se conservan la marca, los componentes cuánticos, Quantum Learning y las actualizaciones, con cambios mínimos en la interfaz original. Consulta la [guía de instalación y actualización](../DESKTOP_INSTALLERS.md).

Instala primero el cliente original DSH Desktop. Descarga el archivo para Mac Apple Silicon, Mac Intel o Windows x64 desde la [Release 0.8.3](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.3) y compruébalo con `SHA256SUMS` antes de extraerlo. El instalador crea `OpenQuantum.app` en Mac o `OpenQuantum.lnk` en Windows con el icono de OpenQuantum. El cliente original conserva su nombre y versión. Las actualizaciones preservan las Skills, rutas de modelos y configuraciones MCP existentes. Los entornos de cálculo y Quantum Learning requieren la preparación documentada.

### Codex

Descarga el [instalador completo 0.8.3](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.3/openquantum-0.8.3-codex-install.zip) y sigue la [guía de instalación](../integrations/CODEX_AGENT_INSTALL.md). El plugin ofrece 134 Skills y 71 Tools científicas en las conversaciones de Codex. Requiere un Codex compatible, Node.js 24 o posterior y npm; prepara las dependencias científicas según las necesites.

### Ejecutar desde el código fuente

Para desarrollar o usar las capacidades de `main`, prepara Git, Node.js 24 o posterior y uv para las herramientas de Python. Después sigue estos pasos.

[uv](https://docs.astral.sh/uv/getting-started/installation/)

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run dev
```

Abre el enlace de acceso que aparece en el registro de inicio. Tras autenticarte, verás el espacio de trabajo en el navegador.

### Configurar un modelo

En Configuración → Modelos, introduce la URL, el nombre del modelo y la clave API de un proveedor compatible con OpenAI-compatible Chat Completions. Selecciona el Agent Preset de OpenQuantum. El modelo debe admitir Tool Calling para ejecutar herramientas. Una instalación nueva de Desktop tiene la lista de modelos vacía. Añade el servicio que quieras utilizar. Las credenciales del modelo son independientes de las de la nube cuántica.

Puedes ejecutar el ejemplo local de referencia de un Hamiltoniano fijo de dos cúbits sin clave de modelo.

```bash
npm run demo:quantum-ground-state
```

Antes de ejecutar la tarea FatQat de abajo desde el código fuente, prepara explícitamente su entorno en la raíz del repositorio. La preparación puede descargar dependencias; el cálculo no las instala automáticamente.

```bash
node scripts/setup-paper-tools.mjs fatqat-workbench
```

Para los ejemplos de algoritmos, empieza con `npm run capability:algorithms:setup -- --minimal`. Añade `--group gradients`, `--group pennylane`, `--group tensor` o `--group chemistry` según el método; los grupos ya instalados se conservan. Sin argumentos se prepara el entorno completo. Este incluye PySCF, por lo que se recomienda WSL en Windows; la verificación numérica se realizó en CPU de macOS. Consulta las [instrucciones de ejecución](../../examples/quantum-algorithms/README.md).

Al actualizar el código fuente, repite la preparación de las capacidades que uses, reinicia el entorno de trabajo y abre una sesión nueva. Los entornos Python existentes se verifican y sincronizan en su ubicación actual. [Preparación y actualización de entornos](../integrations/LOCAL_ENVIRONMENTS.md).

Con el modelo configurado, prueba: «Usa FatQat para preparar un estado de Bell desde dos cúbits en cero. Aplica H a q0 y después CX con q0 como control y q1 como objetivo. Compara las probabilidades exactas con 1024 muestras y seed=7». Las probabilidades ideales de 00 y 11 son del 50% cada una. Comprueba las entradas de la herramienta y los resultados del cálculo.

### Escritorio

Para compilar Desktop desde la misma copia del código, completa la instalación desde fuentes y prepara Corepack y las herramientas de compilación de C++ del sistema.

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop -- --source
```

Web y Desktop comparten los datos y la configuración de Harness cuando se inician desde la misma copia del código fuente. Cierra el otro host antes de utilizar el mismo directorio de datos.

## Quantum Learning

Prepara la aplicación educativa en la misma copia del repositorio desde la que inicias OpenQuantum.

```bash
npm run learning:ui:setup
```

Abre Quantum Learning desde la barra lateral. Cada nuevo Git worktree necesita su propia instalación. Si aparece un aviso de instalación incompleta, ejecuta el comando anterior en ese worktree y vuelve a abrir la aplicación. Se conservan los flujos de materiales, aulas y edición de OpenMAIC; los modelos se utilizan a través de Harness. Los datos de las aulas se guardan por separado del registro de sesiones.

## Idiomas

En Configuración → General → Idioma puedes elegir chino simplificado, inglés, japonés, coreano, español, francés, alemán, portugués, ruso o árabe. La elección se guarda y se sincroniza con Quantum Learning. El árabe utiliza dirección de derecha a izquierda. No se traducen las conversaciones existentes, los cursos, los Skills del usuario ni los resultados de las herramientas. Algunos diálogos nativos usan inglés cuando el idioma no es chino o inglés.

## Documentación y contribuciones

Los Skills aportan conocimiento y procedimientos; los Tool Providers registran herramientas ejecutables. Las capacidades que requieren comprobación científica utilizan un Validator independiente y evidencias para determinar la aceptación. OpenQuantum reutiliza el entorno de ejecución de DeepSeek Harness. Consulta las ediciones inglesa y china para obtener instrucciones detalladas de uso y extensión.

[English](./README.en.md) · [中文](../../README.md) · [Documentation](../README.md) · [Contributing](../../CONTRIBUTING.md) · [Issues](https://github.com/xi-zhao/openQuantum/issues)

```bash
npm run harness:config
npm run desktop:check
npm run check
```

## Visión a largo plazo y RSI

Exploramos la colaboración entre computación cuántica, HPC e IA, nuevas aplicaciones y materiales educativos, y la mejora de los métodos de investigación. La automejora recursiva (RSI) es una línea de investigación: el ciclo propuesto aún no está implementado. Su evaluación requiere comprobaciones independientes, comparación en tareas nuevas, coste total, autorización del usuario y posibilidad de volver a una versión anterior.

[Hoja de ruta detallada](../../README.md#rsi).

## Licencia

El código propio de OpenQuantum usa la licencia MIT. DeepSeek Harness, OpenMAIC y los proyectos cuánticos conservan su autoría y sus licencias. Consulta Third-party notices antes de redistribuir o activar integraciones opcionales.

[MIT](../../LICENSE) · [Third-party notices](../../THIRD_PARTY_NOTICES.md)

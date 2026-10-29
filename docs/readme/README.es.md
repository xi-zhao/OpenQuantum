<h1 align="center">
  <img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" />
</h1>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

**Nota sobre Desktop 0.8.5:** La aplicación independiente de OpenQuantum para macOS con Apple Silicon recupera la interfaz sencilla de DSH Desktop 2.0.0 / Harness 0.1.0-rc.6. Por ahora, la interfaz ofrece chino e inglés; se conservan las traducciones y los README existentes. Las indicaciones siguientes sobre 0.8.4 corresponden a la versión anterior. Consulta la [guía de instalación](../DESKTOP_INSTALLERS.md) para conocer el procedimiento actual y las limitaciones de la firma. La versión publicada del plugin de Codex sigue siendo 0.8.4.

<p align="center">
  <strong>OpenQuantum — Construyamos juntos una IA fiable para la investigación cuántica.</strong><br />
  <sub>La experiencia de la investigación cuántica, reunida en OpenQuantum</sub>
</p>

<p align="center">
  <a href="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml"><img src="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml/badge.svg" alt="Estado de CI" /></a>
  <a href="../../THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/licenses-MIT%20%2B%20component%20licenses-111111.svg" alt="Licencia MIT y licencias de los componentes" /></a>
  <img src="https://img.shields.io/badge/Node.js-24%2B-3c873a.svg" alt="Node.js 24 o posterior" />
</p>

OpenQuantum es una plataforma de IA para la investigación cuántica, de código abierto y abierta a la colaboración. Reúne software, algoritmos y resultados de investigación publicados por la comunidad de código abierto para que la IA pueda analizar tu pregunta de investigación, elegir métodos, ejecutar cálculos y comprobar resultados. El conocimiento compartido se convierte en una capacidad de investigación que realmente puedes utilizar.

Parte de una pregunta de investigación, de un artículo o de un programa existente, e incorpora la IA a tu investigación. Los programas, los parámetros y las comprobaciones se conservan, de modo que cada investigación se convierte en el punto de partida de la siguiente.

Elige el acceso que mejor te convenga; ambos comparten las mismas funciones de dominio. El **[plugin de Codex](../integrations/CODEX_PLUGIN.md)** lleva Skills cuánticas y Tools científicas a las conversaciones nativas de Codex, con una página de ajustes para activar funciones, gestionar conexiones MCP y tokens. **Desktop** incluye el entorno de investigación y la aplicación independiente Quantum Learning, con los servicios de modelos que tú mismo configuras.

**[Instalar el plugin de Codex](#codex)** · [Instalar Desktop](#desktop-installer) · [Ver cálculos y resultados](#use-and-inspect-results) · [Visitar el sitio web](https://xi-zhao.github.io/OpenQuantum/)

**Empieza por los casos medidos:** un [conmutador de Pauli de PennyLane](#pennylane-rust-case) se ejecuta **5.09×** más rápido como llamada completa, y un [cálculo de la función de Wigner con QuTiP](#qutip-rust-case), **5.69×** más rápido. Ambos conservan comparaciones de rendimiento, comprobaciones de resultados y registros de reproducción.

**Versión actual 0.8.4:** [descarga y notas de la versión de Desktop](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) · [descarga y notas de la versión del plugin de Codex](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4). Ambos comparten la misma versión de producto.

- **Funciones más fáciles de encontrar:** Tools, MCP y Skills se agrupan en ocho categorías de uso, con búsqueda y filtros de estado.
- **Un único acceso con la marca:** `OpenQuantum.app` en Mac y `OpenQuantum.lnk` en Windows usan el icono de OpenQuantum, y se conservan la interfaz original de DSH Desktop, Quantum Learning y el acceso a las actualizaciones.

<p align="center">
  <a href="#why-openquantum">Por qué OpenQuantum</a> ·
  <a href="#optimization-cases">Optimizaciones medidas</a> ·
  <a href="#what-you-can-do">Funciones</a> ·
  <a href="#codex">Plugin de Codex</a> ·
  <a href="#quick-start">Inicio rápido</a> ·
  <a href="#use-and-inspect-results">Resultados</a> ·
  <a href="#extend-the-platform">Ampliar</a> ·
  <a href="#roadmap-and-rsi">Hoja de ruta y RSI</a> ·
  <a href="#documentation-and-support">Contribuir</a> ·
  <a href="#license-and-acknowledgments">Código abierto</a>
</p>

<p align="center">
  <img src="../images/openquantum-desktop-20261013.jpg" width="100%" alt="Entorno de investigación de OpenQuantum en el DSH Desktop original: marca, nueva sesión, Quantum Learning y una invitación a añadir tu propio modelo" /><br />
  <sub>La interfaz original de Desktop, ya conocida. Añade tu propio servicio de modelos en los ajustes para iniciar una nueva sesión.</sub>
</p>

<details>
<summary><strong>Ver los ajustes de Tools, MCP y Skills por categorías</strong></summary>

Despliega el grupo que necesites y acota la lista con la búsqueda o con el filtro de estado activado. Tools enumera las acciones invocables, MCP gestiona las conexiones con servicios y Skills selecciona métodos y guías para cada tarea.

![Conexiones MCP agrupadas por uso, con búsqueda y filtros de estado, en Desktop](../images/openquantum-settings-categories-20261013.jpg)

La captura se tomó el 2026-10-13 al verificar las categorías en el cliente original; consulta las [notas sobre las imágenes](../images/README.md). Que un ajuste esté activado no significa que el servicio esté en línea.

</details>

<a id="why-openquantum"></a>

## Por qué OpenQuantum

### Una cobertura amplia da espacio a las ideas de investigación

Desde algoritmos cuánticos y simulación de circuitos hasta química cuántica, cálculos de muchos cuerpos y corrección de errores, OpenQuantum sigue ampliándose a nuevas áreas especializadas y conectando herramientas con métodos. Los investigadores dedican menos tiempo a preparar herramientas y más a explorar preguntas. Proyectos de la comunidad como Qiskit, PennyLane, QuTiP, PyZX, TeNPy y Stim / PyMatching aportan la experiencia en la que se apoyan estas áreas.

### Cálculos más rápidos para poner a prueba más ideas

Seguimos optimizando los pasos de cálculo clave para acortar las esperas y dejar margen para más comparaciones. En casos de optimización específica, las llamadas completas de un [conmutador de Pauli de PennyLane](#pennylane-rust-case) y de una [función de Wigner de QuTiP](#qutip-rust-case) fueron **5.09×** y **5.69×** más rápidas. Ambos resultados se contrastaron con la biblioteca original y con cálculos de referencia independientes.

### La colaboración abierta hace crecer las capacidades de investigación

Seguimos incorporando proyectos de código abierto valiosos y métodos publicados, y los mejoramos mediante adaptación, optimización y uso real. OpenQuantum construye en torno a este trabajo flujos de agente, interfaces de cálculo y registros de verificación, de modo que nuevas herramientas, métodos y experiencias hagan crecer la plataforma. Te invitamos a [participar](#documentation-and-support) para convertir la experiencia de la comunidad en una IA para la investigación cuántica que los investigadores puedan usar, comprobar y en la que puedan confiar.

### Parte de tu trabajo

| Tu trabajo | Lo difícil | Lo que aporta OpenQuantum |
| --- | --- | --- |
| **Investigación y desarrollo de algoritmos** | Probar una idea nueva suele obligar a reimplementar métodos, buscar líneas base y comprobar resultados una y otra vez. | Parte de ejemplos de algoritmos y SDK especializados, cambia las entradas, construye comparaciones, usa las comprobaciones independientes disponibles y conserva programas y resultados reutilizables. Consulta los [resultados](#use-and-inspect-results). |
| **Desarrollo de aplicaciones y agentes** | Quieres incorporar computación cuántica a una aplicación existente, pero te faltan métodos especializados y una vía de llamada utilizable. | Conecta Skills, Tools y SDK nativos existentes para que tu aplicación use software especializado sin renunciar a su propia interfaz y flujo de trabajo. Consulta [ampliar la plataforma](#extend-the-platform). |
| **I+D industrial y evaluación tecnológica** | Tienes una dirección de aplicación y necesitas evidencias para elegir métodos, estimar recursos y planificar una hoja de ruta. | Ejecuta primeras comparaciones en tareas admitidas e inspecciona las condiciones de cada método, los supuestos de recursos y el origen de los resultados. Consulta [material de referencia y selección](#reference-material-and-selection). |
| **Docencia y diseño de cursos** | Convertir conceptos abstractos en cursos prácticos es difícil cuando materiales, experimentos y diapositivas están dispersos. | Diseña experimentos a partir de ejemplos abiertos y organiza materiales y material didáctico con Quantum Learning. Consulta [Quantum Learning](#quantum-learning) para ver funciones y el avance de los cursos. |
| **Aprender haciendo** | Entiendes los conceptos, pero aún no cómo ejecutar un algoritmo, cambiar sus entradas e interpretar los resultados. | Ejecuta ejemplos, cambia parámetros y usa guías y resultados de referencia disponibles para ver por qué un método es aplicable y dónde deja de serlo. Consulta los [ejemplos de algoritmos](#algorithm-learning-and-method-comparison). |
| **Software de investigación y ecosistemas** | Tienes un método publicado, código de investigación o un SDK, y necesitas flujos de trabajo, interfaces y ejemplos para que otros puedan usarlo. | Escribe el método como Skill, conecta las acciones ejecutables como Tools o integra una aplicación completa, conservando fuentes y créditos. Consulta [ampliar la plataforma](#extend-the-platform). |

### Código abierto: el control sigue en tus manos

Puedes leer el código de la plataforma y de las integraciones, ver de dónde procede cada método y modificar, desplegar y mantener tu propia combinación conforme a las licencias aplicables. Los servicios de modelos y los backends de cálculo se eligen por separado, y tú decides si compartes datos de investigación. La autoría, las licencias y los créditos de las contribuciones permanecen visibles, de modo que el trabajo previo avanza junto con el proyecto.

### Exhaustivo: más métodos para una misma pregunta

OpenQuantum reúne software y métodos de investigación de algoritmos, compilación, simulación, información cuántica, química y física de muchos cuerpos, optimización, corrección de errores, dinámica, control y redes. Desde guías y ejemplos abiertos hasta SDK nativos y Tools de cálculo, puedes elegir lo que necesita una tarea o combinar herramientas en nuevas comparaciones. Las entradas, la preparación y el alcance admitido figuran en el [catálogo de funciones](#what-you-can-do).

Por ejemplo, optimiza un circuito con PyZX, comprueba su equivalencia con QCEC y estudia su comportamiento con ruido en un simulador ruidoso para preguntarte si un circuito más simple también funciona mejor. Combinar herramientas sigue exigiendo alinear modelos, unidades, orden de bits y presupuestos; consulta el alcance actual en la [guía de cálculo](../integrations/SCALABLE_BRIDGES.md).

<a id="give-ai-access-to-specialist-research-capabilities"></a>

### Da a la IA acceso a capacidades de investigación especializadas

Los agentes pueden leer material, escribir programas y llamar herramientas. Con OpenQuantum instalado, preparas las dependencias y los ajustes de servicio que necesita una tarea admitida, y la IA puede usar métodos cuánticos y capacidades de cálculo. Las Skills describen métodos y pasos, las Tools realizan acciones concretas, y los SDK nativos también pueden usarse mediante las herramientas de código del host.

Los programas, los resultados y las comprobaciones aplicables quedan registrados, de modo que el trabajo posterior tiene una base sobre la que construir. También merece la pena conservar los resultados negativos bien fundamentados: muestran cuándo un método es aplicable y cuándo conviene tomar otro camino. Los fallos de un programa y los resultados científicos son desenlaces distintos; los registros sirven para la [revisión y la reutilización](#execution-records-and-scientific-acceptance), mientras que el juicio científico corresponde al usuario.

**Convertir bibliotecas de código abierto y métodos publicados en funciones utilizables por agentes es el trabajo continuo que sostiene la plataforma.** Organizamos métodos, escribimos flujos de trabajo, conectamos software y conservamos las fuentes y las condiciones de uso. Puedes aportar tus propios métodos, programas o aplicaciones completas, de modo que un solo desarrollo se convierta en punto de partida para muchas personas.

Este trabajo acumulado también sienta las bases para [mejorar la siguiente ronda de capacidades de investigación](#research-that-improves-how-research-is-done), descrita en la hoja de ruta a largo plazo.

**[Ejecutar una primera tarea](#quick-start)** · [Aportar tus métodos](#extend-the-platform)

<a id="optimization-cases"></a>
<a id="pennylane-rust-case"></a>

## Caso medido: un cálculo de PennyLane 5.09× más rápido

**Planteas una tarea de investigación y recibes un resultado ejecutable que puedes comprobar.** Encargamos a OpenQuantum una tarea: aplicar una optimización específica a un cálculo de investigación de PennyLane, medir la aceleración real y verificar los resultados. El 2026-10-20 el experimento se completó en Codex con OpenQuantum 0.8.4 y generó un programa optimizado, una comparación de rendimiento, comprobaciones de corrección y registros de reproducción.

| Cálculo | Llamada completa |
| --- | ---: |
| PennyLane nativo | 30.62 ms |
| Tras la optimización de OpenQuantum | **6.02 ms** |

**Una aceleración de 5.09× en la llamada completa.** La tarea medida es el cálculo de un conmutador de Pauli en un modelo local de 32 cúbits. Los tiempos son medianas de nueve rondas en caliente en un Apple M4 con PennyLane 0.45.1. Incluyen la conversión de entradas y salidas, y excluyen la preparación del entorno y la compilación.

**También se comprobaron los resultados.** Las salidas de las nueve entradas de referencia coinciden exactamente, término a término, con las salidas de referencia de PennyLane. Matrices exhaustivas independientes comprobaron **4368 pares de cadenas de Pauli** y 40 sumas aleatorias de operadores con coeficientes complejos, con un error absoluto matricial máximo de **1.42×10⁻¹⁴**. Los cálculos y los tiempos se revisaron de forma independiente, y se conservan las **405 muestras de tiempo sin procesar** y las entradas y salidas completas.

La cifra de 5.09× es la mejora medida para este cálculo. El informe del caso recoge todos los resultados, los métodos y el alcance admitido.

[Caso completo y pasos de reproducción](../../experiments/pennylane-rust-commutator/README.md) · [Tiempos sin procesar](../../experiments/pennylane-rust-commutator/results/raw-timings.csv) · [Comprobación de resultados](../../experiments/pennylane-rust-commutator/results/validation.json) · [Revisión independiente](../../experiments/pennylane-rust-commutator/results/review.md)

<a id="qutip-rust-case"></a>

## Caso medido: un cálculo de QuTiP 5.69× más rápido

**Convertir un método especializado en un cálculo más rápido y comprobable.** En Codex con OpenQuantum 0.8.4, aplicamos una optimización específica al cálculo de la función de Wigner de QuTiP y obtuvimos un programa ejecutable, la salida completa en el espacio de fases, una comparación de rendimiento y comprobaciones independientes.

| Cálculo | Llamada completa |
| --- | ---: |
| Método predeterminado de QuTiP | 171.77 ms |
| Tras la optimización de OpenQuantum | **30.18 ms** |

**Una aceleración de 5.69× en la llamada completa.** La tarea calcula la función de Wigner de una matriz densidad en un **espacio de Fock monomodo de dimensión 64 sobre una malla de 201×201 puntos en el espacio de fases**. Los tiempos son medianas de nueve rondas en caliente intercaladas en un Apple M4 con QuTiP 5.3.1 y ajustes de un solo hilo. Incluyen la lectura de entradas, la conversión, la validación y la salida completa en doble precisión; la preparación del entorno, la compilación y las comprobaciones de resultados quedan fuera de la región cronometrada.

**Se superaron las 272 comprobaciones de resultados.** En cuatro tamaños, la diferencia absoluta máxima respecto a la salida predeterminada de QuTiP es de **6.52×10⁻¹⁶**, y respecto a sumas independientes de polinomios de Laguerre y fórmulas analíticas, de **6.33×10⁻¹⁵**. Las comprobaciones cubren matrices densidad complejas aleatorias, estados de vacío y de Fock, superposiciones con coherencias complejas y entradas rechazadas. Se conservan las **144 muestras de tiempo sin procesar** y las entradas y salidas completas, que se revisaron de forma independiente.

[Caso completo y pasos de reproducción](../../experiments/qutip-rust-wigner/README.md) · [Tiempos sin procesar](../../experiments/qutip-rust-wigner/results/raw-timings.csv) · [Comprobación de resultados](../../experiments/qutip-rust-wigner/results/validation.json) · [Revisión independiente](../../experiments/qutip-rust-wigner/results/review.md)

<a id="what-you-can-do"></a>

## Qué puedes hacer

Elige un área y explica al entorno de investigación tu pregunta, tus entradas y los resultados que quieres comprobar. El agente de OpenQuantum sigue el método de la Skill correspondiente y llama a la Tool adecuada para calcular; Quantum Learning ofrece una interfaz docente independiente.

[Algoritmos](#algorithm-learning-and-method-comparison) · [Circuitos e información cuántica](#circuits-and-quantum-information) · [Estados fundamentales, química y optimización](#ground-states-chemistry-and-optimization) · [Mitigación y corrección de errores](#error-mitigation-and-error-correction) · [Simulación hamiltoniana y sistemas abiertos](#hamiltonian-simulation-and-open-systems) · [Experimentos y hardware](#experiment-simulation-and-hardware) · [Fotónica y redes](#photonics-and-quantum-networks) · [Material de referencia](#reference-material-and-selection) · [Quantum Learning](#quantum-learning)

Los cálculos locales pueden empezar sin cuenta en una nube cuántica. El hardware real y los servicios de pago se configuran cuando se necesitan; el rango de entradas, la preparación y el estado de verificación de cada método se mantienen en el catálogo detallado.

El código fuente actual ofrece rutas completas a las API nativas de **114 entornos SDK o de código fuente**, 26 de ellos procedentes de la última [ampliación del ecosistema](../integrations/SDK_ECOSYSTEM_2026-10-14.md) incluida en 0.8.4. Los agentes pueden escribir programas propios, combinar API públicas y guardar resultados completos, más allá de los casos predefinidos de las Tools de conveniencia.

**Matemáticas y física formalizadas:** [Lean 4, mathlib y physlib](../../.agents/skills/lean-physics/SKILL.md) permiten comprobar pruebas y sus axiomas en un proyecto fijado a Lean 4.35.0. La preparación explícita compila el pequeño ejemplo de Pauli y sus importaciones; los demás módulos se preparan según la tarea. Comprobar una prueba no instala dependencias. La prueba cubre sus definiciones e hipótesis, no la validez física del modelo ni su aceptación científica.

**Diagnóstico de DEM:** [emlint](../../.agents/skills/emlint-dem-audit/SKILL.md) analiza modelos de errores de detectores Stim en un entorno SDK preparado explícitamente. Los informes conservan contraejemplos, comprobaciones omitidas y resultados inconclusos o vacíos. Estas comprobaciones estructurales no demuestran la distancia del código, la corrección de la decodificación ni la validez científica.

Cada entorno se prepara explícitamente para cada tarea, y siguen aplicándose los límites de plataforma, cuenta, licencia y backends opcionales. Las comprobaciones de ingeniería de cada biblioteca están en el [registro completo de acceso a SDK](../integrations/FULL_SDK_ACCESS.md); estos entornos aún no han pasado una aceptación científica (la constatación, basada en comprobaciones independientes y en la trazabilidad completa de las fuentes, de que un resultado es científicamente fiable) en tareas de investigación reales y su estado científico sigue siendo `not_evaluated`.

Los SDK de empresas e instituciones integrados en v0.6.0 abarcan circuitos diferenciables, estimación de recursos tolerantes a fallos, fotónica, compilación de pulsos y redes cuánticas. Los tres lotes son [17 SDK de proveedores](../integrations/VENDOR_SDKS.md), [20 funciones de empresas e instituciones](../integrations/SDK_EXPANSION.md) y [15 interfaces de redes, control y nube](../integrations/SDK_GAPS.md), además de [QuEra Bloqade Analog](../integrations/BLOQADE_ANALOG.md). Cada adaptador expone solo sus acciones documentadas; los usuarios configuran cuentas, credenciales, permisos de servicio y las licencias aplicables.

<a id="algorithm-learning-and-method-comparison"></a>

### Aprendizaje de algoritmos y comparación de métodos

Parte de ejemplos de algoritmos ejecutables, cambia las entradas y comprueba los resultados numéricos; después traslada el método a tu propio problema. Las **66 guías de quantum-skills** de UnitaryLab están adaptadas como Skills nativas: **49 ofrecen ejemplos ejecutables** que cubren los **39 módulos** de la biblioteca de algoritmos original y métodos propios de las guías; el resto ayuda a clasificar algoritmos, elegir backends y migrar código.

| Dirección | Métodos y ejemplos ejecutables |
| --- | --- |
| Fundamentos y búsqueda | QFT, QPE, prueba de Hadamard, amplificación y estimación de amplitud, Grover, Shor, Simon, logaritmo discreto y paseos en grafos |
| Sistemas lineales y métodos matriciales | HHL, VQLS, resolución lineal con QSVT, resolución adiabática, LCU y QSP, con referencias de solucionadores de autovalores clásicos |
| Simulación hamiltoniana | Trotter–Suzuki, qDrift, QSP, LCU de Taylor y un ejemplo de Cartan con sustituciones declaradas |
| Computación variacional y aprendizaje automático | VQE, VQD, QAOA, VQC, QCBM, CVQNN, gradientes e información de Fisher cuántica |
| Preparación de estados y muchos cuerpos | Preparación de estados de Möttönen, MPS, isometrías y variacional; DMRG molecular, VQE de Fermi–Hubbard y evolución de Ising |
| Construcción de códigos y ecuaciones diferenciales | Construcción de códigos qLDPC y síndromes; ejemplos de Schrödingerización para ecuaciones del calor en 1D y 2D y advección periódica |

Los ejemplos usan backends abiertos como Qiskit, PennyLane, quimb, PySCF y NumPy/SciPy. Ejecútalos directamente o deja que el agente los llame mediante las herramientas de código existentes. Los parámetros predeterminados son casos didácticos; comprueba las entradas reales, los errores de referencia y la convergencia en cada tarea.

La adaptación conserva las fuentes y licencias originales y no depende del runtime propietario de UnitaryLab. Cubrir el flujo de trabajo no implica compatibilidad completa con la API de Python, los optimizadores o los backends originales; las diferencias de Cartan, CVQNN, DMRG y otros métodos figuran en la [tabla de cobertura por método](../integrations/UNITARYLAB_OPEN_COVERAGE.md) y en la [guía de ejemplos](../../examples/quantum-algorithms/README.md).

[Ejecutar un ejemplo de algoritmo](#run-an-algorithm-example-directly) · [Elegir entre métodos similares](../integrations/CAPABILITY_SELECTION.md)

<a id="circuits-and-quantum-information"></a>

### Circuitos e información cuántica

| Dirección | Tareas que puedes iniciar | Resultados que puedes inspeccionar |
| --- | --- | --- |
| Circuitos cuánticos | Analizar o convertir circuitos OpenQASM / QPY, comparar transpilaciones, comprobar equivalencias y simular circuitos | Estructura del circuito, salida transpilada, resultado de equivalencia, vector de estado o distribución de muestras |
| Compilación y simulación locales | Compilar o mapear circuitos con TKET, QSteed o MQT QMAP; simular localmente con Braket LocalSimulator, QCompute, Qibo y otros | Conjuntos de puertas y mapeo, vectores de estado o probabilidades, con la convención de orden de bits de cada SDK |
| Programas diferenciables e híbridos | Valores esperados y gradientes con PennyLane, DeepQuantum, TensorCircuit, MindQuantum o VQNet; medida, reinicio y retroalimentación clásica con Guppy / Selene | Gradientes de parámetros, probabilidades y resultados de programas |
| Recursos tolerantes a fallos | Estimaciones de recursos físicos con Microsoft QDK y recursos de puertas para un Bloq dado con Qualtran | Cúbits, tiempo de ejecución o número de puertas, con los supuestos de hardware y de descomposición |
| Interoperabilidad Qiskit / Cirq | Convertir circuitos unitarios admitidos mediante una ruta fija de OpenQASM 2 con qBraid | Circuito convertido que conserva la numeración de cúbits y los cúbits inactivos; comparación opcional de la unitaria completa |
| Optimización de circuitos y computación basada en medidas | Reescritura y extracción ZX con PyZX; conversión y simulación de patrones MBQC con Graphix | Circuitos y número de puertas antes y después, grafos de recursos y patrones de medida; comparación independiente opcional |
| Optimización y corte de circuitos | Optimizar secuencias de puertas con Compact; cortar circuitos y reconstruir valores esperados con QCut | Circuitos antes y después con comprobación de equivalencia independiente; coste del corte, muestras reales y referencia opcional sin cortar |
| Muestreo ruidoso Clifford+T | Estudiar la interferencia de puertas T y el ruido con Clifft, o muestrear circuitos admitidos en formato Stim | Recuentos de cadenas de bits finales y referencia opcional de matriz densidad; medidas a mitad de circuito y paridades sin procesar de detectores / observables |
| Estados y medidas | Auditar matrices densidad y medidas de entrelazamiento; simular medidas aleatorizadas locales en estados producto / GHZ conocidos | Medidas del estado con comprobaciones independientes; estimaciones de pureza de subsistemas con error de muestra finita |

<a id="ground-states-chemistry-and-optimization"></a>

### Estados fundamentales, química y optimización

| Dirección | Tareas que puedes iniciar | Resultados que puedes inspeccionar |
| --- | --- | --- |
| Resolución y validación de estados fundamentales | Ejecutar VQE sobre un Hamiltoniano de Pauli real de dos cúbits en un sector de partículas fijo y contrastarlo con una referencia exacta | Energía, traza de convergencia, comprobaciones independientes y, en el flujo completo, un informe de aceptación científica |
| Química cuántica y estados fundamentales de muchos cuerpos | Estudiar moléculas y espacios activos con SQD, o estados fundamentales de cadenas de espín XYZ con TeNPy | Energía y ocupación orbital de SQD; energía, magnetización, entropía de entrelazamiento y convergencia de DMRG; referencia exacta opcional |
| Aprendizaje de parámetros variacionales | Entrenar Flow-VQE sobre un Hamiltoniano de Pauli para aprender parámetros de circuito de baja energía | Aprendizaje por flujo comparado con búsqueda aleatoria con el mismo presupuesto de evaluaciones |
| Estados excitados y clasificación con núcleos | Buscar varios estados de baja energía con VQD de OpenQARP, o entrenar un QSVM con un núcleo angular de cqlib | Energías, residuos, ortogonalidad y espectro exacto opcional; clasificación sobre datos reservados, núcleo analítico y línea base clásica |
| Simetría y álgebra de control | Reducir cúbits en un sector de simetría elegido con Symmer; analizar generadores de Pauli con PauLie | Hamiltoniano reducido, clasificación y dimensión del álgebra de Lie; comparación opcional del espectro o del cierre |
| Optimización combinatoria | Construir y resolver problemas de optimización locales con QPanda, Ocean o Kaiwu; evaluar parámetros QAOA dados con Qcover | Solución, comprobación de restricciones, energías y correlaciones, con comparación clásica cuando la interfaz la ofrece |
| Operadores químicos y datos existentes | Mapear operadores fermiónicos con OpenFermion / pyChemiQ; consultar bajo demanda registros de punto único existentes de QCArchive mediante QCPortal | Términos de Pauli; molécula, energía, método y fuente, conservando unidades y campos ausentes |

<a id="error-mitigation-and-error-correction"></a>

### Mitigación y corrección de errores

| Dirección | Tareas que puedes iniciar | Resultados que puedes inspeccionar |
| --- | --- | --- |
| Mitigación de errores | Ejecutar ZNE, REM, PEC o CDR con Mitiq y comparar resultados sin mitigar y mitigados con el mismo presupuesto de muestreo | Referencia ideal, sesgo empírico, varianza y RMSE, además del coste de calibración, entrenamiento y muestreo |
| Corrección cuántica de errores | Ejecutar experimentos de memoria con códigos de superficie con Stim / PyMatching, construir parches rectangulares con Deltakit o decodificar con BP+LSD | Circuitos ruidosos reales, tasas de error lógico e intervalos con número de disparos fijo; comprobaciones de consistencia de síndromes para LSD |

<a id="hamiltonian-simulation-and-open-systems"></a>

### Simulación hamiltoniana y sistemas abiertos

| Dirección | Tareas que puedes iniciar | Resultados que puedes inspeccionar |
| --- | --- | --- |
| Simulación hamiltoniana | Construir circuitos de evolución o estados finales para un Hamiltoniano de Pauli real con Trotter–Suzuki o qDrift | Circuitos, métricas de recursos, vectores de estado y referencia matricial independiente opcional; pasos, orden, tiempo y semilla configurables |
| Dinámica de sistemas abiertos | Cadenas de Ising abiertas con TJM, barridos de excitación y gradientes de un cúbit con Dynamiqs, memoria del entorno con OQuPy | Trayectorias de observables, referencias independientes, gradientes, pasos de tiempo y cortes de memoria |

<a id="experiment-simulation-and-hardware"></a>

### Simulación de experimentos y hardware

| Dirección | Tareas que puedes iniciar | Resultados que puedes inspeccionar |
| --- | --- | --- |
| Experimentos superconductores y atómicos | Simular flujos de calibración, restricciones de puertas nativas y fugas en transmones; estudiar matrices de átomos y pulsos admitidos con Bloqade Analog / Pulser | Datos sintéticos, trayectorias dinámicas, poblaciones por átomo y probabilidades finales |
| Programas de pulsos y control | Construir, planificar y compilar programas sin conexión con QUA, LabOne Q, Qblox Scheduler, Qililab u OQC QAT | Programas, temporización, instrucciones de destino o formas de onda; estos adaptadores no operan dispositivos de laboratorio |
| Acceso a hardware cuántico | Descubrir backends y comprobar topología y credenciales; activar bajo demanda la consulta, el envío y la cancelación de trabajos en la nube | Dispositivos candidatos y condiciones de uso; resultados y estado de las interfaces de trabajos activadas |
| Interfaz de dispositivo local | Consultar un controlador C configurado mediante QDMI | Dispositivos, cúbits, puertas y acoplamientos que informa el controlador; el controlador de ejemplo oficial valida la interfaz y no es una QPU en línea |

<a id="photonics-and-quantum-networks"></a>

### Fotónica y redes cuánticas

| Dirección | Tareas que puedes iniciar | Resultados que puedes inspeccionar |
| --- | --- | --- |
| Circuitos fotónicos y aprendizaje | Calcular salidas de óptica lineal con Perceval y Lightworks; inferencia por lotes y gradientes de desfasadores con MerLin; modelos gaussianos opcionales con MrMustard | Probabilidades de Fock, gradientes o momentos ópticos, con orden de modos y cortes explícitos |
| Modelado y programas de redes | Simular pérdidas y decoherencia de un enlace con SimQN; generar programas de dos nodos con NetQASM | Estadísticas del enlace y programas compilados; la simulación con SquidASM requiere un entorno NetSquid con licencia propia |

<a id="reference-material-and-selection"></a>

### Material de referencia y selección

| Dirección | Tareas que puedes iniciar | Resultados que puedes inspeccionar |
| --- | --- | --- |
| Referencias de algoritmos y selección de herramientas | Buscar en las 66 guías de algoritmos de Quantum-Practices, comparar SDK cuánticos y reutilizar pasos de investigación | Material de referencia fijado, supuestos y recomendaciones de selección |
| Benchmarks públicos de dispositivos | Consultar 410 registros históricos fijos de Metriq por proveedor, dispositivo o tipo de benchmark | Parámetros originales, métricas, fechas, fuentes y licencias, conservando las etiquetas de simulador |

<a id="quantum-learning"></a>

### Quantum Learning

Materiales, material didáctico y aulas en un solo lugar: el alumnado trabaja de forma práctica y el profesorado organiza sus propios contenidos.

| Aprendizaje y docencia | Funciones disponibles |
| --- | --- |
| Preparar materiales | Página de inicio, biblioteca de cursos, adjuntos, importación de cursos e importación de PPTX |
| Construir cursos | Vista previa de cursos, editor de material didáctico y el entorno Pro |
| Aprender en clase | Diapositivas, cuestionarios, preguntas y respuestas interactivas y aprendizaje basado en proyectos |
| Seguir aprendiendo | Cursos locales, tareas, materiales y registros de aprendizaje en el servidor, con migración desde aulas anteriores |

El objetivo es cubrir desde los fundamentos de secundaria hasta la investigación de frontera, organizados en niveles inicial, intermedio y avanzado, con aprendizaje entre niveles. Los recursos públicos aún se están organizando y el plan de estudios completo todavía no se ha producido ni publicado. Se han verificado el ensamblaje de la aplicación, el arranque y la persistencia local; la creación de cursos, las preguntas y respuestas y la edición con IA real en línea aún esperan una aceptación completa.

Las tareas docentes de Pro usan las herramientas y registros propios de la aplicación original y todavía no están conectadas a las herramientas cuánticas del entorno de investigación. Los medios, la voz y la búsqueda opcionales necesitan sus propios servicios. La instalación, la copia de seguridad, la migración y la verificación se describen en la [guía de integración de Quantum Learning](../integrations/OPENMAIC.md).

<p align="center">
  <img src="../images/openquantum-learning-20260912.jpg" width="100%" alt="Quantum Learning: materiales de curso, aulas y edición de material didáctico" />
</p>

[Preparar Quantum Learning y abrir un aula](#set-up-quantum-learning).

### Desktop, mensajería e idiomas

**Desktop.** El escritorio de OpenQuantum ofrece ventana nativa, bandeja del sistema, terminal y notificaciones, y reutiliza los modelos, las Skills cuánticas, las herramientas de cálculo y los registros de ejecución del entorno de investigación. Usa el DSH Desktop original de terceros con un paquete de funciones de OpenQuantum entregado por separado, en Mac (Apple Silicon / Intel), Windows y desde el código fuente. [Instalar Desktop](#desktop-installer) · [Compilar Desktop desde el código fuente](#desktop-from-source).

**Mensajería.** Mediante CC Connect puedes iniciar tareas desde WeChat, Feishu, DingTalk, Slack, Telegram, Discord y otros canales, reutilizando las Skills, las Tools y los registros de ejecución del entorno de investigación. [Configurar canales de mensajería](#messaging-channels).

<p align="center">
  <img src="../images/openquantum-wechat-chat.jpg" width="380" alt="Demostración existente de una conversación con OpenQuantum mediante WeChat ClawBot" /><br />
  <sub>Una tarea y su respuesta en el canal de WeChat.</sub>
</p>

**Idiomas de la interfaz.** En **Configuración → General → Idioma** puedes elegir chino simplificado, inglés, japonés, coreano, español, francés, alemán, portugués, ruso o árabe. La elección se conserva, Quantum Learning la sigue y el árabe se lee de derecha a izquierda.

![Selección de idioma en la aplicación OpenQuantum Desktop en ejecución](../images/openquantum-languages-20260919.jpg)

El idioma de la interfaz no reescribe las conversaciones existentes, los materiales de los cursos, las Skills del usuario ni la salida de las herramientas. Algunos diálogos nativos del sistema usan inglés cuando el idioma no es chino ni inglés.

<a id="quick-start"></a>

## Inicio rápido

Elige un modo de acceso: instala el plugin en Codex, usa el cliente Desktop con su paquete de funciones o ejecuta el entorno de investigación desde el código fuente. Desktop y el entorno de investigación desde el código fuente están pensados para un uso local individual; elige el código fuente para desarrollar o para usar las funciones de `main`.

<a id="codex"></a>

### Plugin de Codex: instalación y uso

Al instalar una vez el plugin de OpenQuantum se registran juntos **Skills, servicios MCP locales, Tools científicas y la página de ajustes de OpenQuantum**. Sigues haciendo preguntas, gestionando proyectos y leyendo resultados en las conversaciones nativas de Codex; la página de ajustes configura las funciones de OpenQuantum.

**Deja que Codex lo instale por ti:** abre Codex, inicia una conversación nueva y pega la siguiente petición.

```text
Please install the OpenQuantum Codex plugin 0.8.4. First read the installation guide:
https://github.com/xi-zhao/OpenQuantum/blob/codex-v0.8.4/docs/integrations/CODEX_AGENT_INSTALL.md
Download the complete installer and SHA256SUMS from https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4,
verify the checksum, check Codex, Node.js 24+ and npm, and install with the bundled installer.
Keep existing plugins and user settings, and check the Skills, MCP tools and the global "OpenQuantum settings" entry.
Tell me exactly what to do if the app needs reloading. Finally, report what was actually verified and which scientific dependencies still need preparation.
```

El paquete de funciones de Desktop, el plugin de Codex y el instalador usan **OpenQuantum 0.8.4**. Este plugin incluye 168 Skills y 87 Tools científicas, añade 26 Skills de SDK nativos y unifica las pestañas Status, MCP, Skills y Service keys; las 16 nuevas Tools de servicio que requieren credenciales están desactivadas por defecto. La etiqueta de la versión es `codex-v0.8.4`; los adjuntos y el alcance de la verificación son los que indica la Release.

**[Descargar el instalador completo del plugin de Codex 0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.4/openquantum-0.8.4-codex-install.zip)** ([notas de la versión y SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4)).

El instalador contiene el ZIP del plugin, el script de instalación y el archivo de bloqueo de dependencias; no hace falta clonar el código fuente. Requiere Node.js 24+, npm y una versión de Codex que admita plugins y páginas de ajustes globales; un agente puede comprobarlo y resolverlo siguiendo la [guía de instalación](../integrations/CODEX_AGENT_INSTALL.md). La instalación local está verificada en macOS; comprueba la compatibilidad en otras plataformas y versiones del host.

**Después de la instalación:**

1. Recarga Codex cuando se te indique y abre una conversación nueva para que se carguen las nuevas Skills y herramientas.
2. Pregunta directamente en la conversación, por ejemplo: «Usa OpenQuantum para buscar métodos de corrección cuántica de errores y recomiéndame un primer experimento».
3. Abre **"…" → "OpenQuantum settings"** y gestiona las funciones en las pestañas **Status / MCP / Skills / Service keys**; los interruptores de las Tools están en **Status → Tools**. Los servicios integrados vienen configurados con el plugin; para añadir tu propio servidor MCP, introduce sus datos de conexión y guarda los tokens mediante el diálogo de credenciales específico.

El plugin instala el código de las funciones y los puntos de configuración; algunos cálculos siguen necesitando que prepares Python, SDK cuánticos o cuentas de terceros cuando haga falta. Consulta la [guía del plugin](../integrations/CODEX_PLUGIN.md).

<details>
<summary><strong>Instalación manual (opcional)</strong></summary>

Descarga y verifica el instalador completo, extráelo y ejecuta lo siguiente en su directorio (requiere Node.js 24+, npm y una CLI de Codex con soporte de plugins):

```sh
npm ci --ignore-scripts
npm run plugin:install
```

Si el instalador no encuentra la CLI de la aplicación Codex actual, define `OPENQUANTUM_CODEX_CLI` con su ruta. Si ya tienes un ZIP del plugin, usa `npm run plugin:install -- /full/path/plugin.zip`. La instalación, la gestión de fallos y las comprobaciones paso a paso están en la [guía de instalación para agentes](../integrations/CODEX_AGENT_INSTALL.md).

</details>

<a id="desktop-installer"></a>

### Instalador de Desktop

La versión de escritorio actual combina el [cliente original DSH Desktop 2.0.7](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7) con un paquete de funciones de OpenQuantum independiente. El cliente original conserva el nombre y la versión de su proyecto de origen; el paquete de funciones incluye Node / uv y aporta los accesos completos a los SDK, las Skills cuánticas, las Tools y la configuración. El instalador crea un lanzador con el icono de OpenQuantum (`OpenQuantum.app` en Mac, `OpenQuantum.lnk` en Windows).

Instala primero el DSH Desktop original y después elige el paquete de funciones para tu plataforma:

| Plataforma | Descarga de OpenQuantum 0.8.4 | Ejecutar tras extraer |
| --- | --- | --- |
| Mac Apple Silicon | [paquete darwin-arm64](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-darwin-arm64.tar.gz) | `install.command` |
| Mac Intel | [paquete darwin-x64](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-darwin-x64.tar.gz) | `install.command` |
| Windows x64 | [paquete win32-x64](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-win32-x64.tar.gz) | `install.cmd` |

Verifica la descarga con [SHA256SUMS de la Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) antes de extraerla. Las actualizaciones conservan los ajustes existentes; consulta la [guía de instalación y migración](../DESKTOP_INSTALLERS.md). El paquete de funciones y el plugin de Codex son ambos `0.8.4`, y Harness se mantiene en `0.1.5-rc.1`. Los entornos de cálculo, las cuentas y las licencias se siguen preparando para cada función.

### Instalar desde el código fuente

Prepara Git y Node.js 24; las herramientas cuánticas de Python también necesitan [uv / uvx](https://docs.astral.sh/uv/getting-started/installation/). Otras dependencias dependen de la función; por ejemplo, Julia 1.12.7 para RandomMeas.

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
```

Sin clave de modelo ya puedes ejecutar el [ejemplo local fijo](#no-model-key-needed-recompute-a-fixed-case). Para iniciar tareas mediante el agente, elige un modo de arranque del entorno de investigación y configura un modelo.

### Elegir el modo de arranque del entorno de investigación

Web y Desktop, iniciados desde la misma copia del código fuente, comparten los ajustes de modelos, las funciones cuánticas y los registros de ejecución en `.openquantum/dsh`. Cierra el acceso en ejecución antes de cambiar al otro.

**Entorno de investigación web**

```bash
npm run dev
```

Abre la dirección con el token de acceso que imprime el lanzador; tras autenticarte, el entorno de investigación está en <http://127.0.0.1:3000>.

<a id="desktop"></a>
<a id="desktop-from-source"></a>

<details>
<summary><strong>Compilar e iniciar Desktop desde el código fuente</strong></summary>

Tras instalar las dependencias del código fuente y preparar Corepack y las herramientas de compilación de C++ del sistema:

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop -- --source
```

`desktop:setup` compila el código fuente original fijado, descarga Electron y compila los módulos nativos sin modificar interfaces ni recursos de terceros. Usa el comando de inicio del repositorio para que se carguen los ajustes de modelos y de funciones cuánticas. Los requisitos de cada plataforma están en [despliegue](../DEPLOYMENT.md).

</details>

<a id="configure-a-model"></a>

### Configurar un modelo

Una instalación nueva de Desktop tiene la lista de modelos vacía. En **Configuración → Modelos**, añade un proveedor con un endpoint OpenAI-compatible Chat Completions, el nombre del modelo y la clave API, y mantén OpenQuantum como Agent Preset predeterminado. **El modelo debe admitir Tool Calling para llamar a las herramientas de computación cuántica.** Esto configura solo el servicio de modelos; las credenciales de la nube cuántica se configuran junto con sus backends.

<details>
<summary><strong>Configuración avanzada de modelos y diagnóstico por línea de comandos</strong></summary>

El código fuente incluye ejemplos de depuración opcionales `openquantum-public` / `openquantum-private` cuyas direcciones son marcadores `.invalid`. No aparecen precargados en la lista de modelos de un Desktop nuevo y solo necesitan direcciones y credenciales reales para el diagnóstico que se describe a continuación.

Las sustituciones de rutas guardadas en la interfaz se escriben en `$DSH_HOME/settings.yaml`, ignorado por Git; las claves permanecen en el entorno local o en el almacén de credenciales de Harness, y la configuración del proyecto solo registra referencias a credenciales. Para usar `.env`, ejecuta `cp .env.example .env` en macOS o `Copy-Item .env.example .env` en Windows PowerShell y complétalo según sus comentarios. `.env` no sustituye los nombres de modelo; configura otros nombres en **Configuración → Modelos**.

El siguiente comando comprueba la ruta pública definida en `.env` o en variables de entorno con los nombres de modelo fijos del script, `kimi-k2.7-code` y `glm5.2`, y prueba la generación de texto y Tool Calling. No lee las sustituciones de rutas guardadas en la interfaz; verifica otros modelos con la tarea del entorno de investigación que se describe más adelante.

```bash
npm run models:probe -- --provider openquantum-public
```

</details>

### Preparar los entornos de cálculo para cada tarea

Las herramientas de cálculo locales de Python usan dependencias fijadas que se preparan explícitamente. Después de `npm ci`, ejecuta desde la raíz del repositorio el comando de preparación de la función que necesites. La preparación puede descargar y compilar; las llamadas de cálculo ya no instalan dependencias automáticamente.

| Qué preparar | Comando o ubicación |
| --- | --- |
| El primer experimento con un estado de Bell | `node scripts/setup-paper-tools.mjs fatqat-workbench` |
| Interacción estática de un par de átomos de Rb | `npm run capability:pairinteraction:setup`; [gobernanza de modelos y versiones](../integrations/PAIRINTERACTION.md) |
| Simulación hamiltoniana Trotter / qDrift | `npm run capability:hamiltonian:setup` |
| Muestreo con Clifft y conversión de circuitos con qBraid | `npm run capability:interop:setup` |
| Cualquier otra función de Python | `node scripts/setup-paper-tools.mjs <capability-id>`, por ejemplo `qec-memory-experiment`; cada Skill indica su propio comando |
| Ejemplos de algoritmos | Empieza por el [entorno mínimo](#run-an-algorithm-example-directly) y añade los grupos de gradientes, PennyLane, tensores o química según necesites |

La preparación de entornos, la activación de conexiones y la configuración de modelos son pasos independientes. Incluso una conexión activada por defecto necesita que se preparen sus dependencias antes del primer uso; si falta un entorno o ha cambiado su archivo de bloqueo, la Tool devuelve el comando de preparación exacto. Julia, los controladores QDMI y los servicios MCP de origen siguen sus propias guías; consulta [entornos locales](../integrations/LOCAL_ENVIRONMENTS.md).

### Ejecutar una primera tarea

<a id="no-model-key-needed-recompute-a-fixed-case"></a>

#### Sin clave de modelo: recalcular un caso fijo

Con el [Hamiltoniano de Pauli de dos cúbits](../../.agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json) fijo del repositorio como entrada, la Tool nativa `solve_and_validate_ground_state` ejecuta VQE sin ruido en el sector de partículas indicado y comprueba el resultado con un cálculo independiente en forma cerrada. Después de `git clone` y `npm ci`, ejecuta esto en el repositorio; no se necesita clave de modelo ni credenciales de nube cuántica:

```bash
npm run demo:quantum-ground-state
```

<table>
  <tr>
    <td align="center"><strong>-1.85727503 Ha</strong><br /><sub>Energía VQE</sub></td>
    <td align="center"><strong>-1.85727503 Ha</strong><br /><sub>Referencia exacta independiente</sub></td>
    <td align="center"><strong>4.44 × 10⁻¹⁶ Ha</strong><br /><sub>Diferencia de energía</sub></td>
    <td align="center"><strong>15 superadas</strong><br /><sub>Comprobaciones de cálculo locales</sub></td>
  </tr>
</table>

Estos valores proceden de una **nueva ejecución local del 2026-09-12**; la [salida sin procesar y el registro de ejecución](../examples/quantum-ground-state-local-demo-2026-09-12.json) contienen los valores completos, el estado de las comprobaciones, la hora, el commit de origen, el resumen criptográfico de la entrada y la versión de Node.js.

<details>
<summary><strong>Qué comprobó esta ejecución y qué falta todavía</strong></summary>

En este registro se superaron 15 comprobaciones de cálculo locales y no se ejecutó 1 comprobación de procedencia de la sesión, por lo que no existe una conclusión completa de aceptación científica. La diferencia de energía muestra la concordancia con la referencia exacta en este caso numérico; el alcance científico se limita al Hamiltoniano y al sector de partículas dados.

La aceptación científica completa exige además ejecutar la tarea mediante Harness, guardar los archivos de resultados y la procedencia de la sesión, y producir un informe de aceptación que pueda volver a leerse. Los puntos de verificación tras configurar un modelo están en [desarrollo y verificación](#development-and-verification).

</details>

<a id="let-the-agent-run-a-task-prepare-and-sample-a-bell-state"></a>

#### Deja que el agente ejecute una tarea: preparar y muestrear un estado de Bell

Tras configurar un modelo y preparar FatQat con `node scripts/setup-paper-tools.mjs fatqat-workbench`, inicia una sesión nueva y envía:

> Usa FatQat para partir del estado de dos cúbits todo ceros, aplica H a q0 y después CX con q0 como control y q1 como objetivo. Devuelve las probabilidades exactas sin ruido y compáralas con 1024 muestras usando seed=7.

El agente puede llamar a la herramienta de circuitos de FatQat, y el entorno de investigación conserva la entrada de la herramienta y el resultado devuelto. Inspecciona las probabilidades exactas y los recuentos de muestras y continúa con:

> Mantén el circuito y la semilla, cambia el número de muestras a 8192 y compara cuánto se alejan de las probabilidades exactas las frecuencias de ambas ejecuciones.

Las probabilidades ideales son del 50% para `00` y para `11`; las frecuencias con muestras finitas fluctúan. Comparar dos ejecuciones muestra esa fluctuación; un único aumento del número de muestras no garantiza que todas las frecuencias se acerquen al valor ideal. Sin un modelo con Tool Calling, el agente no puede llamar a las Tools de cálculo. Los detalles de la interfaz y la verificación local están en la [guía de FatQat](../integrations/FATQAT.md).

<a id="run-an-algorithm-example-directly"></a>

#### Ejecutar directamente un ejemplo de algoritmo

No se necesita clave de modelo ni cuenta en una nube cuántica. Empieza con NumPy, SciPy y Qiskit:

```bash
npm run capability:algorithms:setup -- --minimal
```

En macOS / Linux, lista los métodos, lee el contrato de entrada y ejecuta el ejemplo HHL predeterminado:

```bash
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --list
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --describe hhl
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --algorithm hhl
```

En Windows PowerShell:

```powershell
& examples/quantum-algorithms/.venv/Scripts/python.exe examples/quantum-algorithms/run.py --algorithm hhl
```

Para QSP/QSVT y métodos similares, ejecuta `npm run capability:algorithms:setup -- --group pennylane`; los otros grupos son `gradients`, `tensor` y `chemistry`, y añadir un grupo conserva los demás. `npm run capability:algorithms:setup` sin argumentos lo prepara todo. El entorno completo incluye PySCF, para el que se recomienda WSL en Windows; la verificación numérica se realizó en CPU de macOS.

Pasa tus propios parámetros como archivo JSON con `--input` y guarda los resultados con `--output`, o bien, tras configurar un modelo, deja que el agente use `quantum-algorithms` o la Skill de un método concreto. Los parámetros, el orden de bits, las diferencias entre métodos y los grupos de dependencias están en la [guía de ejemplos de algoritmos](../../examples/quantum-algorithms/README.md).

<a id="upgrade-an-existing-source-installation"></a>

### Actualizar una instalación existente desde el código fuente

Actualiza el código fuente y las dependencias del proyecto siguiendo la [guía de actualización](../UPDATES.md) y vuelve a ejecutar una vez el comando de preparación de cada función que uses. Los puentes de Python verifican y sincronizan las dependencias fijadas en sus directorios de entorno existentes, así que no hay que borrar nada; en los ejemplos de algoritmos se pueden seguir añadiendo grupos.

Reinicia el entorno de investigación e inicia una sesión nueva. Los nombres y parámetros de las Skills y Tools existentes siguen siendo válidos; los 13 índices de categorías pueden seguir llamándose manualmente, mientras que las tareas automáticas eligen `quantum-algorithms` o un método concreto. Para recuperar el conjunto completo de herramientas de un servicio opcional, usa el perfil `full` predeterminado; consulta [selección de funciones y compatibilidad](../integrations/CAPABILITY_SELECTION.md).

### Accesos opcionales

<a id="set-up-quantum-learning"></a>

<details>
<summary><strong>Preparar Quantum Learning</strong></summary>

Tras instalar las dependencias del código fuente, ejecuta en la misma copia:

```bash
npm run learning:ui:setup
```

Después inicia Web o Desktop y abre **Quantum Learning** desde la barra lateral. El primer arranque inicia una base de datos local y un servicio de cursos, sin necesidad de un PostgreSQL global; las peticiones al modelo usan el modelo seleccionado actualmente en OpenQuantum.

La instalación y el arranque están verificados en macOS. El instalador depende de `/bin/sh` y todavía no está adaptado a Windows convencional; Linux aún no está verificado. Cada nuevo Git worktree necesita su propia instalación. La copia de seguridad, la migración y el estado de cada plataforma están en la [guía de integración](../integrations/OPENMAIC.md#使用).

</details>

<a id="messaging-channels"></a>

<details>
<summary><strong>Configurar WeChat, Feishu y otros canales de mensajería</strong></summary>

```bash
npm run cc-connect:setup
npm run cc-connect:feishu
npm run cc-connect:start
```

Configura la primera plataforma tal como describe el proyecto de origen; ejecuta `npm run cc-connect:web` en otra terminal para gestionar otras plataformas y credenciales. Los tokens se guardan en una configuración local ignorada por Git; consulta la [guía de mensajería](../integrations/CC_CONNECT.md).

</details>

Los problemas de despliegue y arranque se tratan en [despliegue](../DEPLOYMENT.md) y [solución de problemas](../TROUBLESHOOTING.md).

<a id="use-and-inspect-results"></a>

## Usar e inspeccionar los resultados

Una vez que una tarea se ejecuta, puedes elegir otros backends, cambiar el tamaño del problema y llevar los resultados a investigaciones posteriores.

<a id="choose-the-right-entry-point"></a>

### Elegir la herramienta adecuada

Usa los [ejemplos ejecutables](#algorithm-learning-and-method-comparison) para aprender o modificar un algoritmo, y las herramientas especializadas cuando necesites un contrato de entrada y salida definido. Las herramientas que se solapan para Trotter / qDrift, VQD, Qiskit y solucionadores de autovalores tienen una [guía de selección común](../integrations/CAPABILITY_SELECTION.md); se conservan los nombres originales, y las implementaciones con supuestos físicos o métodos numéricos distintos siguen separadas.

Qiskit Gym, Quantum Hardware y FlagQuantum están desactivados por defecto. Cuando los necesites, configura un perfil de herramientas más reducido para entrenamiento, consulta de dispositivos, compilación o simulación; si no eliges ninguno, se aplica el perfil `full`, compatible con versiones anteriores. Las Tools que se pueden llamar en una sesión dependen de las conexiones activadas, del registro efectivo y del perfil seleccionado.

<a id="local-computing-and-quantum-clouds"></a>

### Cálculo local y nubes cuánticas

Los cálculos numéricos locales no necesitan cuenta en una nube cuántica. Para usar otras herramientas, configura la conexión en **Configuración → Componentes cuánticos → Conexiones MCP Server**, reinicia el entorno de investigación e indica el backend en la tarea. Los interruptores predeterminados figuran en el [catálogo de servicios MCP](../../README.md#mcp-服务目录).

Para hardware real, prepara las credenciales, los permisos y la cuota del servicio de destino. **El descubrimiento de dispositivos, el envío de trabajos reales y la simulación local tienen cada uno su propio alcance.** Que exista una configuración no significa que el servicio esté en línea; consulta el registro de ejecución real para saber si un trabajo tuvo éxito.

| Backend | Funciones actuales | Credenciales o condiciones |
| --- | --- | --- |
| Cálculo local | Simulación de circuitos y de ruido, referencias de estados fundamentales, auditorías de estados, muestreo de corrección de errores, optimización y simulación de experimentos, cada uno con su propio rango de entradas | Sin credenciales de nube; prepara las dependencias fijadas antes de calcular |
| IBM Quantum | Runtime, AI Transpiler, consultas de hardware; envío y cancelación opcionales de trabajos reales | `QISKIT_IBM_TOKEN`; las conexiones MCP Server de trabajos se activan explícitamente |
| IonQ | Consultas de hardware; envío, cancelación y estimación de costes opcionales de trabajos reales | `IONQ_API_KEY`; las conexiones MCP Server de trabajos se activan explícitamente |
| Nube de Origin Quantum | Descubrimiento de backends de solo lectura (FieldQKit); consultas de la QPU Wukong mediante el MCP Server de QPanda3 Runtime, con trabajos opcionales de muestreo, valores esperados y por lotes | `ORIGIN_API_TOKEN` para el descubrimiento; `QPANDA3_API_KEY` para los trabajos de hardware opcionales |
| Nubes Quafu, Tianyan, Guodun, Tencent y LogicalQubit | Comprobación de credenciales, descubrimiento de backends, filtrado de cúbits, resúmenes de topología y calibración | El token API de cada servicio; solo lectura |
| FieldQuantum | Descubrimiento de backends de simulador en la nube | `FIELDQUANTUM_API_TOKEN`; solo lectura |

Los trabajos en hardware y los servicios de pago se activan cuando se necesitan. El descubrimiento de solo lectura te permite conocer dispositivos, topología y calibración antes de decidir si ejecutas trabajos reales. «Solo lectura» significa que no se modifica el estado de la nube remota ni de la QPU; los puentes locales de Python mantienen su contrato `workspace-write`, porque las cachés de los SDK y la escritura de archivos de resultados pueden escribir en el espacio de trabajo local.

### Parámetros de cálculo

Dentro de los modelos y entradas que admite cada herramienta, eliges el número de cúbits, la profundidad del circuito, los términos del Hamiltoniano, el número de muestras y los presupuestos de iteraciones. Los parámetros y tamaños disponibles siguen la interfaz de cada herramienta y dependen del algoritmo, del backend y de los recursos de cálculo; un caso de referencia acotado no define el alcance de todas las herramientas.

El cálculo principal y la comparación exacta están separados: puedes optimizar circuitos, generar patrones MBQC, reducir simetrías, analizar álgebras de Lie o ejecutar algoritmos tensoriales directamente, y elegir con `referenceMode` referencias independientes automáticas, forzadas u omitidas. Los parámetros, los valores devueltos y los ajustes de recursos están en la [guía de cálculo local](../integrations/SCALABLE_BRIDGES.md). Las entradas, versiones y resultados de la verificación local se conservan en los registros de cada integración para su reproducción.

Hay más tareas listas para copiar sobre circuitos, estados fundamentales, ruido, dinámica y consultas de benchmarks en el [README en chino](../../README.md#更多可复制的计算任务).

<a id="execution-records-and-scientific-acceptance"></a>

### Métodos y resultados que puedes seguir usando

El entorno de investigación guarda la petición, las llamadas a herramientas y los resultados devueltos de cada tarea, de modo que puedes revisar el proceso y seguir preguntando. Ajusta parámetros, elige otro backend conectado o convierte pasos de investigación habituales en una Skill para tareas futuras.

En las funciones admitidas, los resultados vienen acompañados de referencias exactas, comprobaciones independientes o información de error estadístico. La resolución de estados fundamentales y las auditorías de información cuántica ofrecen además un flujo completo de aceptación científica que vincula entradas, archivos de resultados y procedencia de la sesión para su revisión.

<details>
<summary><strong>Registros de ejecución y aceptación científica en detalle</strong></summary>

El entorno de investigación registra las peticiones de las tareas, la carga de Skills, las llamadas a herramientas, el estado de los permisos y los resultados devueltos. «Activado» en los ajustes es solo una política de configuración; si una herramienta se puede llamar y un servicio es accesible lo muestran las evidencias de ejecución.

La finalización de la ejecución y la aceptación científica se muestran como estados distintos. Las funciones con un flujo de aceptación completo vinculan entradas, archivos de resultados, comprobaciones independientes y registros de sesión en un informe de aceptación que enumera los elementos superados, fallidos y no comprobados; las demás herramientas informan de resultados numéricos y del estado de sus comprobaciones dentro de su propio alcance.

![De los resultados, la generación y el almacenamiento de evidencias y las comprobaciones independientes a una aceptación científica que combina reglas y procedencia](../images/openquantum-evidence-flow.png)

El diagrama muestra cómo se forman las evidencias en las funciones con aceptación completa; [consulta la fuente editable](../architecture/openquantum-evidence-flow.html). La resolución acotada de estados fundamentales y las auditorías de información cuántica ofrecen el flujo completo; QUBO, la equivalencia de circuitos y los experimentos de memoria de corrección de errores informan de resultados y comprobaciones según sus propias reglas. Las evidencias están en las [declaraciones de funciones](../../.agents/capability-packages.yml), la [auditoría de arquitectura](../architecture/ARCHITECTURE_AUDIT.md) y el [benchmark fijo de funciones cuánticas](../../benchmarks/quantum-capabilities/README.md).

</details>

### Preguntas frecuentes

- ¿Necesito una cuenta en un ordenador cuántico o una clave de modelo? Consulta el [ejemplo local](#no-model-key-needed-recompute-a-fixed-case), la [configuración de modelos](#configure-a-model) y las [nubes cuánticas](#local-computing-and-quantum-clouds).
- [¿Tengo que aprender primero todos los SDK?](#give-ai-access-to-specialist-research-capabilities)
- [¿Una respuesta solo de texto significa que se ejecutó el cálculo?](#let-the-agent-run-a-task-prepare-and-sample-a-bell-state)
- [Tras actualizar me pide preparar un entorno. ¿Qué hago?](#upgrade-an-existing-source-installation)
- [¿Ejemplos de algoritmos o herramientas de cálculo especializadas?](#choose-the-right-entry-point)
- [¿Quantum Learning ya tiene cursos completos?](#quantum-learning)

<a id="extend-the-platform"></a>

## Ampliar la plataforma

**Convierte tu software cuántico en una función que los agentes puedan usar y lleva aplicaciones completas a una plataforma abierta.** Las vías de extensión de OpenQuantum preparadas para agentes son: describir métodos de trabajo en una Skill; conectar programas de cálculo como Tools nativas o mediante un MCP Server; y, cuando se necesiten comprobaciones científicas independientes, añadir un Validator y su flujo de evidencias. Las aplicaciones completas se integran respetando sus propios límites de negocio y de datos, en lugar de dividirse en Tools sueltas.

Las funciones de dominio de OpenQuantum se ejecutan sobre DeepSeek Harness, que se encarga de la ejecución general de agentes, la planificación de herramientas, las conexiones con modelos y los registros de ejecución. No introduce un segundo runtime de agentes. Parte de la tarea que los usuarios necesitan resolver y después elige la extensión:

| Qué añadir | Dónde corresponde |
| --- | --- |
| Conocimiento de dominio, pasos, elección de herramientas e interpretación de resultados | Una Skill, que puede reutilizar Tools generales o cuánticas existentes |
| Un cálculo, una consulta o una operación estables | Una Tool, registrada por un Tool Provider nativo o por el Harness MCP Client |
| Una aplicación cuántica o un producto docente con su propia interfaz y flujo de trabajo | Integrar respetando el límite de la aplicación, que conserva sus responsabilidades de negocio, datos, permisos y backend; Quantum Learning es el ejemplo existente |
| Comprobación y aceptación científicas independientes | Un Validator; para la aceptación final, añadir un Acceptance Profile, la generación y el almacenamiento de evidencias y el Acceptance Builder central |

Las Skills, los puentes y las Tools nativas existentes sirven de referencia. Lee primero la [entrada a la documentación y la arquitectura](../README.md) y después, según necesites, la [guía de contribución](../../CONTRIBUTING.md), el [modelo de extensión](../architecture/EXTENSION_MODEL.md) y el [mapa de módulos](../architecture/MODULES.md).

<a id="quantum-applications-for-practical-problems"></a>

### Aplicaciones cuánticas para problemas prácticos

OpenQuantum no solo integra SDK, algoritmos y servicios de cálculo, sino también aplicaciones completas para usuarios y problemas definidos. Una aplicación puede conservar su propia interfaz, flujo de trabajo, gestión de datos y presentación de resultados, y conectarse con agentes mediante interfaces de ejecución explícitas cuando la colaboración resulte útil.

En el futuro, las aplicaciones podrían abarcar la optimización de la planificación o los cálculos moleculares y de materiales, y permitir que los usuarios planteen un problema real, comprueben las condiciones de entrada y lean resultados con su alcance, en lugar de montar un flujo de trabajo a partir de algoritmos sueltos. Son direcciones, no una lista de aplicaciones entregadas. [Quantum Learning](#quantum-learning) es la integración de aplicación completa que existe hoy; las demás deben resolver caso por caso sus permisos de datos, backends, costes y alcance de verificación. Si una aplicación usa una QPU real o supera a los métodos clásicos lo deciden sus propios registros de ejecución y comparaciones.

<details>
<summary><strong>Arquitectura y responsabilidades</strong></summary>

![Arquitectura de OpenQuantum: los accesos de investigación llegan a Harness; el agente lee Skills, usa herramientas mediante Tool Providers nativos o el Harness MCP Client, y conecta los servicios de modelos y el registro de ejecución](../images/openquantum-platform-overview.png)

El diagrama muestra las relaciones de llamada principales del entorno de investigación; [consulta la fuente editable](../architecture/openquantum-platform-overview.html).

- Una **Skill** aporta conocimiento e instrucciones de flujo de trabajo; no ejecuta código ni guarda credenciales.
- Un **Tool Provider** registra herramientas ejecutables, de forma nativa en el mismo proceso o mediante el Harness MCP Client para un MCP Server.
- Un **Scientific Validator** produce observaciones; un Acceptance Profile define las reglas, y solo el Acceptance Builder central deriva la aceptación final a partir de las observaciones y la procedencia. En los documentos de desarrollo, `L3` designa un flujo de aceptación completo y reproducible; no significa que cada llamada haya sido aceptada.
- Un **Agent Preset** combina los Skill Providers, Tool Providers y políticas de agente necesarios.

Da preferencia a los Tool Providers nativos para acciones en el mismo proceso y el mismo lenguaje que no requieran aislamiento; usa un MCP Server para despliegues en otro lenguaje, en un proceso separado o remotos. Harness ensambla las extensiones mediante Cordis Plugins, y la UI, las conexiones con modelos, el cálculo cuántico y el juicio científico mantienen responsabilidades separadas.

</details>

El catálogo completo de Skills, servicios MCP y Tools nativas se mantiene en el [README en chino](../../README.md#能力接口目录): el código fuente actual incluye **186 Skills integradas** (173 seleccionables automáticamente y 13 índices de categorías manuales), **91 conexiones de servicios MCP** (66 activadas por defecto y 25 opcionales) y **5 Tools cuánticas nativas**.

<a id="development-and-verification"></a>

### Desarrollo y verificación

<details>
<summary><strong>Comprobaciones de configuración, regresiones numéricas y pruebas de extremo a extremo</strong></summary>

```bash
# Check the Harness composition
npm run harness:config

# Run the complete offline quality check
npm run check

# macOS/Linux: local numerical regressions and Harness wiring with pinned dependencies
npm run capability:mitiq:live
npm run capability:unitary:live
npm run capability:hamiltonian:live
npm run capability:algorithms:live

# Real agent end-to-end test after configuring a model
npm run e2e:quantum-harness -- --provider openquantum-public
```

Elige las comprobaciones relevantes para tu cambio; la lista completa está en el [README en chino](../../README.md#开发与验证). Las pruebas y las evidencias locales son distintas de una versión publicada o de una aceptación científica. Los cambios de la versión están en las [notas de la versión v0.8.4](../releases/v0.8.4.md).

</details>

La [Skill oficial `pyqpanda3` de OriginQ](https://github.com/OriginQ/pyqpanda3-skill) es una Skill de origen opcional: no se cuenta entre las 186 Skills integradas y no se instala automáticamente. `npm run skill:qpanda:setup` instala la versión revisada; no activa `qpanda_runtime` ni concede permisos para trabajos en la nube.

<a id="roadmap-and-rsi"></a>

## Hoja de ruta y RSI

**De usar funciones existentes a crear juntos otras nuevas.** Seguiremos construyendo una plataforma abierta de agentes y aplicaciones cuánticas en la que métodos especializados, recursos de cálculo, aplicaciones completas, instrumentos de laboratorio y recursos de aprendizaje tengan cada uno su propio acceso y colaboren dentro de su alcance. Son direcciones a largo plazo, no una lista de entregas; las funciones llegan mediante integraciones y verificaciones individuales.

### Fundamentos de la plataforma

| Línea a largo plazo | Lo que seguiremos construyendo |
| --- | --- |
| **0 · Un agente cuántico más útil** | Mejorar la comprensión de las tareas, la selección de métodos, las llamadas a herramientas, la interpretación de resultados y la recuperación ante fallos, desde una petición hasta un cálculo real. Medir el progreso por la calidad, el tiempo y el coste de completar tareas reales. |
| **1 · Un ecosistema de software cuántico preparado para agentes** | Seguir conectando software especializado y mejorando las interfaces de ejecución, las Skills de dominio y la preparación de dependencias, para que las herramientas puedan llamarse y los métodos reutilizarse, conservando las condiciones de aplicabilidad y los registros de verificación. |
| **2 · Flujos de trabajo cuánticos, HPC e IA** | Conectar CPU locales, GPU remotas, HPC, simuladores cuánticos y QPU, y explorar cálculos cuántico-clásicos organizados por agentes. Elegir recursos según tamaño, precisión, tiempo y presupuesto, verificando paso a paso los backends, la orquestación y la ejecución coordinada. |
| **3 · Interfaces para instrumentos de laboratorio inteligentes** | Preparar interfaces de dispositivos estandarizadas, conectar paso a paso instrumentos programables y explorar el descubrimiento de dispositivos, el control experimental, el análisis de medidas y la retroalimentación, vinculando el cálculo con experimentos reales. |

### Aplicaciones y docencia

| Línea a largo plazo | Lo que seguiremos construyendo |
| --- | --- |
| **4 · Más cursos de alta calidad** | Construir un mapa de conocimiento desde los fundamentos hasta la frontera, con cursos de nivel inicial, intermedio y avanzado, aprendizaje entre niveles según la formación y los intereses de cada persona, y explicación, experimentos prácticos y evaluación conectados. |
| **5 · Aplicaciones cuánticas para problemas prácticos** | Integrar o construir en colaboración aplicaciones completas en torno a problemas definidos, con entrada del problema, flujo de cálculo y presentación de resultados, para que los usuarios no tengan que ensamblar las herramientas subyacentes. Documentar los backends, costes, alcance y resultados de verificación de cada aplicación. |

### Personalización y mejora

| Línea a largo plazo | Lo que seguiremos construyendo |
| --- | --- |
| **6 · Apoyo proactivo y personalizado** | Comprender la formación, los intereses y los objetivos de cada persona a partir de su aprendizaje e investigación, sugerir qué aprender o qué método usar a continuación y completar los requisitos previos que falten, para que cursos y herramientas se adapten a la persona. Los usuarios controlan qué registros se usan, dónde se guardan y cómo desactivar esta función. |
| **7 · Capacidades de investigación que siguen mejorando** | Explorar el camino que va de la experiencia en tareas a métodos y herramientas mejores, y de ahí a la mejora del propio proceso de investigación. Poner a prueba las mejoras con comparaciones en tareas nuevas, comprobaciones independientes, costes completos y versiones que se puedan revertir, como en la dirección RSI que se describe a continuación. |

Las interfaces de instrumentos se inspirarán en exploraciones como el [Model Hardware Standard (MHS)](https://www.anthropic.com/news/model-hardware-standard-research-preview) de Anthropic, empezando por dispositivos simulados y experimentos colaborativos; el control en tiempo real y las restricciones de los dispositivos siguen correspondiendo a los controladores y sistemas de control correspondientes.

<a id="rsi"></a>
<a id="research-that-improves-how-research-is-done"></a>

### Investigación que mejora la forma de investigar

**Estado actual: la plataforma dispone de métodos, ejecución y parte de la infraestructura de comprobación científica; el ciclo RSI no está implementado.** Las propuestas de mejora, la evaluación independiente, la aceptación de versiones y los beneficios entre rondas aún deben construirse y verificarse; los [límites de arquitectura y de evidencias](../README.md) siguen siendo la base de lo que existe hoy.

**La investigación debería dejar no solo respuestas, sino también métodos y herramientas que mejoren la siguiente investigación.** Queremos explorar la automejora recursiva (RSI) para la ciencia cuántica: el sistema detecta sus propios límites, propone mejoras candidatas y las usa en tareas posteriores tras ponerlas a prueba; después, el sistema mejorado produce y verifica con más eficacia la siguiente ronda de mejoras.

| Nivel | Cambio que queremos acumular |
| --- | --- |
| Entre tareas | Convertir la experiencia autorizada de las tareas en métodos, casos y límites de fallo reutilizables, no solo en historiales de conversación. |
| Mejora de funciones | Proponer cambios en la selección de métodos, la implementación de herramientas o el flujo de trabajo, y comprobar en tareas nuevas si mejoran la calidad, la fiabilidad o el coste. |
| Automejora recursiva | Mejorar los métodos que producen mejoras, como el diseño de experimentos, la búsqueda de candidatos y la verificación independiente, y comprobar si la siguiente ronda resulta más eficiente. |

El ciclo previsto es **tarea real → mejora candidata → comprobaciones independientes y comparaciones en tareas nuevas → actualización de versión autorizada → siguiente ronda de investigación.**

Por ejemplo, una tarea de circuitos podría producir no solo un circuito optimizado, sino también una forma mejor de elegir estrategias de optimización. Las estrategias candidatas necesitan comprobaciones de equivalencia independientes y una comparación con la versión anterior en circuitos no usados durante el desarrollo; mejorar los experimentos que encuentran esas estrategias es lo que llega al núcleo recursivo. Lo que importa es si las tareas posteriores se benefician realmente, no cuántas Skills se añadieron, cuánto código cambió ni si se sustituyó el modelo por otro más potente.

Una mejora debe compararse con una versión que no la haya heredado, informando del modelo base, la intervención humana y el coste total de mejora y uso en condiciones comparables, y comprobando que no haya regresiones. Un sistema candidato no debe relajar sus propias reglas de aceptación, borrar evidencias de fallos ni ampliar sus permisos; la evaluación independiente, la autorización del usuario, los límites de los datos y la posibilidad de revertir son condiciones para aceptar un cambio. Las contribuciones de la comunidad y la orientación humana forman parte del proceso y no deben atribuirse en su totalidad al progreso autónomo de la IA.

OpenQuantum aspira a ofrecer un entorno de trabajo cuántico para esta exploración: herramientas ejecutables, métodos reutilizables, resultados comprobables e interfaces abiertas para otros agentes de investigación, sin construir un nuevo runtime de agentes general ni entrenar un nuevo modelo fundacional. La colaboración con CyberEinstein, PRAgent y RunThePaper es una posibilidad para más adelante, no un ciclo automático existente entre proyectos. Si la IA y la computación cuántica se refuerzan mutuamente debe comprobarse en tareas concretas, contando los costes de preparación, medida, corrección de errores y transferencia de datos; no suponemos que la computación cuántica acelere el entrenamiento de modelos fundacionales ni que permita una automejora ilimitada.

**Lo que buscamos en última instancia: que una investigación produzca un resultado nuevo y deje capacidades que ayuden a que la siguiente tenga éxito.**

<a id="documentation-and-support"></a>

## Documentación y soporte

**Te invitamos a ayudar a construir una IA fiable para la investigación cuántica.** Comunica problemas, aporta código, conecta herramientas, comparte métodos y casos de reproducción, y ayuda a que la experiencia de la comunidad llegue a más investigadores. Un caso reproducible, un resultado negativo comprobado, una corrección que evita repetir la preparación o un experimento que permite al alumnado trabajar de forma práctica pueden ser el comienzo del siguiente trabajo.

| Qué quieres hacer | Empieza aquí |
| --- | --- |
| Usar la plataforma y entender sus funciones | [Índice de la documentación](../README.md), [despliegue](../DEPLOYMENT.md), [solución de problemas](../TROUBLESHOOTING.md) |
| Aportar Skills, herramientas y comprobaciones científicas | [Ampliar la plataforma](#extend-the-platform), [guía de contribución](../../CONTRIBUTING.md) |
| Integrar aplicaciones, crear cursos y experimentos | [Aplicaciones prácticas](#quantum-applications-for-practical-problems), [Quantum Learning](#quantum-learning) |
| Comunicar incidencias o conocer la historia del proyecto | [GitHub Issues](https://github.com/xi-zhao/OpenQuantum/issues), [historia del proyecto (en chino)](../communications/openquantum-wechat-launch.md) |

Al contribuir, indica las fuentes, los autores, las licencias, las condiciones y el alcance de la verificación, y comparte solo material autorizado. Las sesiones privadas y los datos no publicados no son públicos por defecto, y las credenciales nunca deben formar parte de una contribución. Comunica los problemas de seguridad de forma privada según la [política de seguridad](../../SECURITY.md).

La documentación técnica detallada está principalmente en chino, y este README también está disponible en una edición inglesa detallada; agradecemos las correcciones a esta traducción.

**[Empezar una exploración cuántica](#quick-start)** · [Aportar tus métodos y aplicaciones](#extend-the-platform)

**OpenQuantum · La computación cuántica, al alcance de tu mano.**

<a id="license-and-acknowledgments"></a>

## Licencia y agradecimientos

Las funciones cuánticas de OpenQuantum se basan en la ciencia abierta y el software de código abierto. Mantenemos Skills de dominio, puentes MCP, Tools nativas y las comprobaciones científicas aplicables; las bibliotecas de algoritmos subyacentes, los servicios externos y las bases de las aplicaciones conservan sus propios autores, nombres de proyecto y licencias.

| Proyecto usado o adaptado | Papel en OpenQuantum |
| --- | --- |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | Runtime de agentes y Web UI nativa del entorno de investigación: sesiones, llamadas a modelos, planificación de herramientas y registros de ejecución |
| [DSH Desktop](https://github.com/anywhere-labs/dsh-desktop) | Base del cliente de escritorio; OpenQuantum adapta la marca y la configuración de arranque y reutiliza el entorno de investigación |
| [CC Connect](../integrations/CC_CONNECT.md) | Puente de mensajería que lleva al entorno de investigación las peticiones de WeChat, Feishu y otros canales |
| [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) | Base docente de Quantum Learning, que conserva su interfaz completa, su servidor y sus flujos docentes, con el nombre, el tema y la conexión de modelos de OpenQuantum |

Los proyectos de cálculo, de dispositivos y de referencia en los que se basa cada función, y cómo se adapta cada uno, figuran en el [README en chino](../../README.md#开源生态与致谢).

El código propio de OpenQuantum está bajo la [licencia MIT](../../LICENSE), salvo los directorios con licencia propia. El [directorio de la función de mitigación de errores Mitiq](../../.agents/skills/mitiq-error-mitigation/) es GPL-3.0-only y la [instantánea de datos públicos de Metriq](../../src/metriq-data/upstream/) es CC-BY-4.0, cada uno con su propio LICENSE y NOTICE. DeepSeek Harness, DSH Desktop, OpenMAIC, FatQat, Qiskit MCP Servers, FieldQKit, Quantum Hardware MCP y otros componentes de terceros conservan sus propias licencias; consulta [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) antes de redistribuir o activar una integración opcional. Las fuentes de las capturas y los diagramas están en las [notas sobre las imágenes](../images/README.md).

<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>OpenQuantum — Construindo juntos uma IA confiável para a pesquisa quântica.</strong><br /><sub>A experiência da pesquisa quântica reunida no OpenQuantum</sub></p>

**Nota sobre o Desktop 0.8.5:** O aplicativo independente OpenQuantum para macOS com Apple Silicon retoma a interface simples do DSH Desktop 2.0.0 / Harness 0.1.0-rc.6. Por enquanto, a interface oferece chinês e inglês; as traduções e os README existentes são preservados. As informações abaixo sobre a versão 0.8.4 descrevem o lançamento anterior. Consulte o [guia de instalação](../DESKTOP_INSTALLERS.md) para ver o procedimento atual e as limitações da assinatura. A versão publicada do plugin do Codex continua sendo a 0.8.4.

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

<p align="center">
  <a href="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml"><img src="https://github.com/xi-zhao/openQuantum/actions/workflows/ci.yml/badge.svg" alt="Estado da CI" /></a>
  <a href="../../THIRD_PARTY_NOTICES.md"><img src="https://img.shields.io/badge/licenses-MIT%20%2B%20component%20licenses-111111.svg" alt="Licença MIT e licenças dos componentes" /></a>
  <img src="https://img.shields.io/badge/Node.js-24%2B-3c873a.svg" alt="Node.js 24 ou superior" />
</p>

O OpenQuantum é uma plataforma de IA para pesquisa quântica, de código aberto e aberta à colaboração. Conecta software, algoritmos e pesquisas publicadas pela comunidade de código aberto para que a IA analise sua pergunta de pesquisa, escolha métodos, execute cálculos e confira resultados. O conhecimento compartilhado torna-se uma capacidade de pesquisa que você realmente pode usar.

Parta de uma pergunta de pesquisa, de um artigo ou de um programa existente e traga a IA para a investigação. Programas, parâmetros e verificações ficam registrados, de modo que uma investigação se torna o ponto de partida da seguinte.

Escolha a porta de entrada que melhor lhe convém; ambas compartilham os mesmos recursos de domínio. O **[plugin Codex](../integrations/CODEX_PLUGIN.md)** leva Skills quânticas e Tools científicas às conversas nativas do Codex, com uma página de configurações para ativar recursos, conexões MCP e tokens. O **Desktop** inclui o ambiente de trabalho de pesquisa e a aplicação independente Quantum Learning, com serviços de modelo que você mesmo configura.

**[Instalar o plugin Codex](#codex)** · [Instalar Desktop](#desktop-installer) · [Ver cálculos e resultados](#use-and-inspect-results) · [Visitar o site](https://xi-zhao.github.io/OpenQuantum/)

**Comece pelos casos medidos:** um [comutador de Pauli no PennyLane](#pennylane-rust-case) fica **5,09×** mais rápido como chamada completa, e um [cálculo da função de Wigner no QuTiP](#qutip-rust-case) fica **5,69×** mais rápido. Ambos preservam comparações de desempenho, verificações de resultados e registros de reprodução.

**Versão atual 0.8.4:** [download e notas de versão do Desktop](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) · [download e notas de versão do plugin Codex](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4). Ambos usam a mesma versão do produto.

- **Recursos mais fáceis de encontrar:** Tools, MCP e Skills estão agrupados em oito categorias de uso, com busca e filtros de estado.
- **Uma única entrada de marca:** `OpenQuantum.app` no Mac e `OpenQuantum.lnk` no Windows usam o ícone OpenQuantum, mantendo a interface original do DSH Desktop, o Quantum Learning e a entrada de atualizações.

<p align="center">
  <a href="#why-openquantum">Por que OpenQuantum</a> ·
  <a href="#optimization-cases">Otimizações medidas</a> ·
  <a href="#what-you-can-do">Recursos</a> ·
  <a href="#codex">Plugin Codex</a> ·
  <a href="#quick-start">Início rápido</a> ·
  <a href="#use-and-inspect-results">Resultados</a> ·
  <a href="#extend-the-platform">Extensão</a> ·
  <a href="#roadmap-and-rsi">Roteiro e RSI</a> ·
  <a href="#documentation-and-support">Contribuir</a> ·
  <a href="#license-and-acknowledgments">Código aberto</a>
</p>

<p align="center">
  <img src="../images/openquantum-desktop-20261013.jpg" width="100%" alt="Ambiente de trabalho OpenQuantum no DSH Desktop original: marca, nova sessão, Quantum Learning e convite para adicionar seu próprio modelo" /><br />
  <sub>A interface original do Desktop, já conhecida. Adicione seu próprio serviço de modelo nas configurações para iniciar uma nova sessão.</sub>
</p>

<details>
<summary><strong>Ver as configurações categorizadas de Tools, MCP e Skills</strong></summary>

Expanda o grupo de que precisa e restrinja a lista com a busca ou o filtro de estado ativado. Tools lista as ações que podem ser chamadas, MCP gerencia as conexões de serviço e Skills seleciona métodos e guias de tarefas.

![Conexões MCP agrupadas por uso, com busca e filtros de estado, no Desktop](../images/openquantum-settings-categories-20261013.jpg)

A captura de tela foi feita em 2026-10-13, durante a verificação das categorias no cliente original; veja as [notas das imagens](../images/README.md). Uma configuração ativada não significa que o serviço esteja online.

</details>

<a id="why-openquantum"></a>

## Por que OpenQuantum

### Ampla cobertura dá espaço para as ideias de pesquisa se desenvolverem

De algoritmos quânticos e simulação de circuitos à química quântica, cálculos de muitos corpos e correção de erros, o OpenQuantum continua se expandindo para áreas especializadas e conectando ferramentas a métodos. Pesquisadores gastam menos tempo preparando ferramentas e mais tempo explorando perguntas. Projetos da comunidade como Qiskit, PennyLane, QuTiP, PyZX, TeNPy e Stim / PyMatching fornecem o conhecimento especializado por trás dessas áreas.

### Cálculos mais rápidos permitem testar mais ideias

Seguimos otimizando etapas computacionais-chave para reduzir a espera e abrir espaço para mais comparações. Em casos de otimização direcionada, as chamadas completas de um [comutador de Pauli no PennyLane](#pennylane-rust-case) e de uma [função de Wigner no QuTiP](#qutip-rust-case) ficaram **5,09×** e **5,69×** mais rápidas. Ambos os resultados foram conferidos com a biblioteca original e com cálculos de referência independentes.

### Colaboração aberta mantém as capacidades de pesquisa em crescimento

Continuamos incorporando projetos de código aberto valiosos e métodos publicados, e os aprimoramos por meio de adaptação, otimização e uso real. O OpenQuantum constrói fluxos de trabalho de agentes, interfaces de cálculo e registros de verificação em torno desse trabalho, de modo que novas ferramentas, métodos e experiências façam a plataforma crescer. Todos são bem-vindos a [participar](#documentation-and-support) para transformar o conhecimento da comunidade em uma IA para pesquisa quântica que pesquisadores possam usar, verificar e em que possam confiar.

### Parta do seu trabalho

| Seu trabalho | A parte difícil | O que o OpenQuantum acrescenta |
| --- | --- | --- |
| **Pesquisa e desenvolvimento de algoritmos** | Testar uma nova ideia muitas vezes significa reimplementar métodos, procurar linhas de base e verificar resultados repetidamente. | Parta de exemplos de algoritmos e SDKs especializados, altere entradas, monte comparações, use as verificações independentes suportadas e guarde programas e resultados reutilizáveis. Veja os [resultados](#use-and-inspect-results). |
| **Desenvolvimento de aplicações e agentes** | Você quer computação quântica dentro de uma aplicação existente, mas faltam métodos especializados e um caminho de chamada utilizável. | Conecte Skills, Tools e SDKs nativos existentes para que sua aplicação use software especializado mantendo sua própria interface e fluxo de trabalho. Veja [estender a plataforma](#extend-the-platform). |
| **P&D industrial e avaliação tecnológica** | Você tem uma direção de aplicação e precisa de evidências para escolher métodos, estimar recursos e planejar um roteiro. | Execute primeiras comparações em tarefas suportadas e examine as condições dos métodos, as hipóteses de recursos e as fontes dos resultados. Veja [material de referência e seleção](#reference-material-and-selection). |
| **Ensino e elaboração de cursos** | Transformar conceitos abstratos em cursos práticos é difícil quando materiais, experimentos e slides estão dispersos. | Projete experimentos a partir de exemplos abertos e organize materiais e conteúdos didáticos com o Quantum Learning. Veja o [Quantum Learning](#quantum-learning) para recursos e andamento dos cursos. |
| **Aprender fazendo** | Você entende os conceitos, mas ainda não sabe como executar um algoritmo, alterar entradas e interpretar resultados. | Execute exemplos, altere parâmetros e use guias e resultados de referência disponíveis para entender por que um método se aplica e onde ele deixa de valer. Veja os [exemplos de algoritmos](#algorithm-learning-and-method-comparison). |
| **Software de pesquisa e ecossistemas** | Você tem um método publicado, código de pesquisa ou um SDK e precisa de fluxos de trabalho, interfaces e exemplos para que outros o usem. | Escreva o método como uma Skill, conecte ações executáveis como Tools ou integre uma aplicação completa, preservando fontes e créditos. Veja [estender a plataforma](#extend-the-platform). |

### Código aberto: o controle fica em suas mãos

Você pode ler o código da plataforma e das integrações, ver de onde vem cada método e modificar, implantar e manter sua própria combinação de acordo com as licenças aplicáveis. Serviços de modelo e backends de cálculo são escolhidos separadamente, e você decide se compartilha dados de pesquisa. Autores, licenças e créditos de contribuição permanecem visíveis, para que o trabalho existente siga adiante com o projeto.

### Abrangente: mais métodos para uma mesma pergunta

O OpenQuantum reúne software e métodos de pesquisa para algoritmos, compilação, simulação, informação quântica, química e física de muitos corpos, otimização, correção de erros, dinâmica, controle e redes. De guias e exemplos abertos a SDKs nativos e Tools de cálculo, você pode escolher o que uma tarefa exige ou combinar ferramentas em novas comparações. Entradas, preparação e escopo suportado estão listados no [catálogo de recursos](#what-you-can-do).

Por exemplo, otimize um circuito com PyZX, verifique a equivalência com QCEC e estude seu comportamento ruidoso com um simulador de ruído para perguntar se um circuito mais simples também tem melhor desempenho. Combinar ferramentas ainda exige alinhar modelos, unidades, ordem de bits e orçamentos; veja o escopo atual no [guia de cálculo](../integrations/SCALABLE_BRIDGES.md).

<a id="give-ai-access-to-specialist-research-capabilities"></a>

### Dê à IA acesso a capacidades de pesquisa especializadas

Agentes podem ler material, escrever programas e chamar ferramentas. Com o OpenQuantum instalado, você prepara as dependências e as configurações de serviço de que uma tarefa suportada precisa, e a IA pode usar métodos quânticos e capacidades de cálculo. Skills descrevem métodos e etapas, Tools executam ações específicas, e SDKs nativos também podem ser usados pelas ferramentas de código do host.

Programas, resultados e verificações aplicáveis ficam registrados, de modo que o trabalho seguinte tenha uma base. Resultados negativos bem fundamentados também valem a pena guardar: mostram quando um método se aplica e quando é melhor seguir outro caminho. Falhas de programa e resultados científicos são desfechos distintos; os registros apoiam a [revisão e a reutilização](#execution-records-and-scientific-acceptance), enquanto o julgamento científico continua com o usuário.

**Transformar bibliotecas de código aberto e métodos publicados em recursos utilizáveis por agentes é o trabalho contínuo por trás da plataforma.** Organizamos métodos, escrevemos fluxos de trabalho, conectamos software e preservamos fontes e condições de uso. Você pode trazer seus próprios métodos, programas ou aplicações completas, para que um único desenvolvimento se torne ponto de partida para muitas pessoas.

Esse trabalho acumulado também prepara o terreno para [aprimorar a próxima rodada de capacidades de pesquisa](#research-that-improves-how-research-is-done), descrita no roteiro de longo prazo.

**[Executar uma primeira tarefa](#quick-start)** · [Trazer seus métodos](#extend-the-platform)

<a id="optimization-cases"></a>
<a id="pennylane-rust-case"></a>

## Caso medido: um cálculo do PennyLane 5,09× mais rápido

**Defina uma tarefa de pesquisa e receba um resultado executável que você pode verificar.** Demos ao OpenQuantum uma tarefa: aplicar uma otimização direcionada a um cálculo de pesquisa do PennyLane, medir o ganho real de velocidade e verificar os resultados. Em 2026-10-20, o experimento foi concluído no Codex com o OpenQuantum 0.8.4, gerando um programa otimizado, uma comparação de desempenho, verificações de correção e registros de reprodução.

| Cálculo | Chamada completa |
| --- | ---: |
| PennyLane nativo | 30,62 ms |
| Após a otimização do OpenQuantum | **6,02 ms** |

**Uma aceleração de 5,09× na chamada completa.** A tarefa medida é um cálculo de comutador de Pauli em um modelo local de 32 qubits. Os tempos são medianas de nove rodadas aquecidas em um Apple M4 com PennyLane 0.45.1. Incluem a conversão de entradas e saídas e excluem a preparação do ambiente e a compilação.

**Os resultados também foram verificados.** As saídas das nove entradas de benchmark coincidem exatamente, termo a termo, com as saídas de referência do PennyLane. Matrizes exaustivas independentes verificaram **4.368 pares de strings de Pauli** e 40 somas aleatórias de operadores com coeficientes complexos, com erro absoluto máximo de matriz de **1,42 · 10⁻¹⁴**. Cálculos e tempos foram revisados de forma independente, e todas as **405 amostras brutas de tempo** e as entradas e saídas completas foram preservadas.

O valor de 5,09× é o ganho medido para este cálculo. O relatório do caso apresenta todos os resultados, métodos e o escopo suportado.

[Caso completo e passos de reprodução](../../experiments/pennylane-rust-commutator/README.md) · [Tempos brutos](../../experiments/pennylane-rust-commutator/results/raw-timings.csv) · [Verificações de resultados](../../experiments/pennylane-rust-commutator/results/validation.json) · [Revisão independente](../../experiments/pennylane-rust-commutator/results/review.md)

<a id="qutip-rust-case"></a>

## Caso medido: um cálculo do QuTiP 5,69× mais rápido

**Transforme um método especializado em um cálculo mais rápido e verificável.** No Codex, com o OpenQuantum 0.8.4, aplicamos uma otimização direcionada ao cálculo da função de Wigner do QuTiP e produzimos um programa executável, a saída completa no espaço de fase, uma comparação de desempenho e verificações independentes.

| Cálculo | Chamada completa |
| --- | ---: |
| Método padrão do QuTiP | 171,77 ms |
| Após a otimização do OpenQuantum | **30,18 ms** |

**Uma aceleração de 5,69× na chamada completa.** A tarefa calcula a função de Wigner de uma matriz densidade em um **espaço de Fock de modo único com dimensão 64, numa grade de espaço de fase de 201×201**. Os tempos são medianas de nove rodadas aquecidas intercaladas em um Apple M4 com QuTiP 5.3.1 e configuração de thread única. Incluem leitura das entradas, conversão, validação e a saída completa em dupla precisão; a preparação do ambiente, a compilação e as verificações de resultados ficam fora da região cronometrada.

**Todas as 272 verificações de resultados passaram.** Em quatro tamanhos, a diferença absoluta máxima em relação à saída padrão do QuTiP é **6,52 · 10⁻¹⁶**, e em relação a somas independentes de polinômios de Laguerre e fórmulas analíticas, **6,33 · 10⁻¹⁵**. As verificações cobrem matrizes densidade complexas aleatórias, estados de vácuo e de Fock, superposições com coerências complexas e entradas rejeitadas. Todas as **144 amostras brutas de tempo** e as entradas e saídas completas foram preservadas e revisadas de forma independente.

[Caso completo e passos de reprodução](../../experiments/qutip-rust-wigner/README.md) · [Tempos brutos](../../experiments/qutip-rust-wigner/results/raw-timings.csv) · [Verificações de resultados](../../experiments/qutip-rust-wigner/results/validation.json) · [Revisão independente](../../experiments/qutip-rust-wigner/results/review.md)

<a id="what-you-can-do"></a>

## O que você pode fazer

Escolha uma área e diga ao ambiente de trabalho qual é sua pergunta, quais são suas entradas e quais resultados você quer verificar. O agente OpenQuantum segue o método da Skill correspondente e chama a Tool adequada para calcular; o Quantum Learning oferece uma interface de ensino separada.

[Algoritmos](#algorithm-learning-and-method-comparison) · [Circuitos e informação quântica](#circuits-and-quantum-information) · [Estados fundamentais, química e otimização](#ground-states-chemistry-and-optimization) · [Mitigação e correção de erros](#error-mitigation-and-error-correction) · [Simulação hamiltoniana e sistemas abertos](#hamiltonian-simulation-and-open-systems) · [Experimentos e hardware](#experiment-simulation-and-hardware) · [Fotônica e redes](#photonics-and-quantum-networks) · [Material de referência](#reference-material-and-selection) · [Quantum Learning](#quantum-learning)

Cálculos locais podem começar sem conta em nuvem quântica. Hardware real e serviços pagos são configurados conforme a necessidade; a faixa de entradas, a preparação e o estado de verificação de cada método ficam no catálogo detalhado.

O código-fonte atual oferece caminhos completos de API nativa para **114 ambientes SDK ou de código-fonte**, 26 deles vindos da mais recente [expansão do ecossistema](../integrations/SDK_ECOSYSTEM_2026-10-14.md), entregue com a 0.8.4. Os agentes podem escrever programas próprios, combinar APIs públicas e salvar resultados completos, indo além dos casos predefinidos das Tools de conveniência.

**Matemática e física formalizadas:** [Lean 4, mathlib e physlib](../../.agents/skills/lean-physics/SKILL.md) verificam provas e seus axiomas em um projeto fixado no Lean 4.35.0. A preparação explícita compila o pequeno exemplo de Pauli e suas importações; outros módulos são preparados conforme a tarefa. A verificação não instala dependências. Uma prova cobre as definições e hipóteses declaradas, não a validade física do modelo nem sua aceitação científica.

**Diagnóstico de DEM:** [emlint](../../.agents/skills/emlint-dem-audit/SKILL.md) analisa modelos de erros de detectores Stim em um ambiente SDK preparado explicitamente. Os relatórios preservam contraexemplos, verificações ignoradas e resultados inconclusivos ou vazios. Essas verificações estruturais não comprovam a distância do código, a correção da decodificação ou a validade científica.

Cada ambiente é preparado explicitamente por tarefa, e continuam valendo os limites de plataforma, conta, licença e backend opcional. As verificações de engenharia por biblioteca estão no [registro completo de acesso aos SDKs](../integrations/FULL_SDK_ACCESS.md); esses ambientes ainda não passaram por aceitação científica (a constatação, com base em verificações independentes e rastreabilidade completa das fontes, de que um resultado é cientificamente confiável) em tarefas reais de pesquisa, e seu estado científico permanece `not_evaluated`.

Os SDKs de empresas e instituições integrados na v0.6.0 abrangem circuitos diferenciáveis, estimativa de recursos para computação tolerante a falhas, fotônica, compilação de pulsos e redes quânticas. Os três lotes são [17 SDKs de fornecedores](../integrations/VENDOR_SDKS.md), [20 recursos de empresas e instituições](../integrations/SDK_EXPANSION.md) e [15 interfaces de redes, controle e nuvem](../integrations/SDK_GAPS.md), além do [QuEra Bloqade Analog](../integrations/BLOQADE_ANALOG.md). Cada adaptador expõe apenas suas ações documentadas; os usuários configuram contas, credenciais, permissões de serviço e licenças aplicáveis.

<a id="algorithm-learning-and-method-comparison"></a>

### Aprendizado de algoritmos e comparação de métodos

Parta de exemplos de algoritmos executáveis, altere entradas e verifique resultados numéricos; depois leve o método para o seu próprio problema. Os **66 guias quantum-skills** da UnitaryLab foram adaptados como Skills nativas: **49 oferecem exemplos executáveis** que cobrem todos os **39 módulos** da biblioteca de algoritmos original, além de métodos exclusivos dos guias; os demais apoiam a classificação de algoritmos, a escolha de backend e a migração.

| Direção | Métodos e exemplos executáveis |
| --- | --- |
| Fundamentos e busca | QFT, QPE, teste de Hadamard, amplificação e estimação de amplitude, Grover, Shor, Simon, logaritmo discreto e passeios em grafos |
| Sistemas lineares e métodos matriciais | HHL, VQLS, resolução linear com QSVT, resolução adiabática, LCU e QSP, com referências de solucionadores clássicos de autovalores |
| Simulação hamiltoniana | Trotter–Suzuki, qDrift, QSP, LCU de Taylor e um exemplo de Cartan com substituições declaradas |
| Computação variacional e aprendizado de máquina | VQE, VQD, QAOA, VQC, QCBM, CVQNN, gradientes e informação de Fisher quântica |
| Preparação de estados e muitos corpos | Preparação de estados de Möttönen, MPS, por isometria e variacional; DMRG molecular, VQE de Fermi–Hubbard e evolução de Ising |
| Construção de códigos e equações diferenciais | Construção de códigos qLDPC e síndromes; exemplos de Schrödingerização para equações do calor em 1D e 2D e advecção periódica |

Os exemplos usam backends abertos como Qiskit, PennyLane, quimb, PySCF e NumPy/SciPy. Execute-os diretamente ou deixe o agente chamá-los pelas ferramentas de código existentes. Os parâmetros padrão são casos didáticos; verifique entradas reais, erros de referência e convergência em cada tarefa.

A adaptação preserva as fontes e licenças originais e não depende do runtime proprietário da UnitaryLab. Cobertura de fluxo de trabalho não significa compatibilidade total com a API Python, os otimizadores ou os backends originais; as diferenças para Cartan, CVQNN, DMRG e outros estão na [tabela de cobertura por método](../integrations/UNITARYLAB_OPEN_COVERAGE.md) e no [guia de exemplos](../../examples/quantum-algorithms/README.md).

[Executar um exemplo de algoritmo](#run-an-algorithm-example-directly) · [Escolher entre métodos semelhantes](../integrations/CAPABILITY_SELECTION.md)

<a id="circuits-and-quantum-information"></a>

### Circuitos e informação quântica

| Direção | Tarefas que você pode iniciar | Resultados que você pode examinar |
| --- | --- | --- |
| Circuitos quânticos | Analisar ou converter circuitos OpenQASM / QPY, comparar transpilações, verificar equivalência, simular circuitos | Estrutura do circuito, saída transpilada, resultado de equivalência, vetor de estado ou distribuição de amostras |
| Compilação e simulação locais | Compilar ou mapear circuitos com TKET, QSteed ou MQT QMAP; simular localmente com Braket LocalSimulator, QCompute, Qibo e outros | Conjuntos de portas e mapeamento, vetores de estado ou probabilidades, com a convenção de ordem de bits de cada SDK |
| Programas diferenciáveis e híbridos | Valores esperados e gradientes com PennyLane, DeepQuantum, TensorCircuit, MindQuantum ou VQNet; medição, reset e realimentação clássica com Guppy / Selene | Gradientes de parâmetros, probabilidades e resultados de programas |
| Recursos para tolerância a falhas | Estimativas de recursos físicos com Microsoft QDK, recursos de portas para um Bloq dado com Qualtran | Qubits, tempo de execução ou contagem de portas, com hipóteses de hardware e de decomposição |
| Interoperabilidade Qiskit / Cirq | Converter circuitos unitários suportados por um caminho fixo OpenQASM 2 com qBraid | Circuito convertido, preservando a numeração dos qubits e qubits ociosos; comparação opcional da unitária completa |
| Otimização de circuitos e computação baseada em medições | Reescrita e extração ZX com PyZX; conversão e simulação de padrões MBQC com Graphix | Circuitos e contagens de portas antes e depois, grafos de recursos e padrões de medição; comparação independente opcional |
| Otimização e corte de circuitos | Otimizar sequências de portas com Compact; cortar circuitos e reconstruir valores esperados com QCut | Circuitos antes e depois com verificação independente de equivalência; custo do corte, amostras efetivas e referência opcional sem corte |
| Amostragem ruidosa Clifford+T | Estudar interferência e ruído de portas T com Clifft, ou amostrar circuitos suportados no formato Stim | Contagens finais de cadeias de bits e referência opcional por matriz densidade; medições no meio do circuito e paridades brutas de detectores / observáveis |
| Estados e medições | Auditar matrizes densidade e medidas de emaranhamento; simular medições aleatorizadas locais em estados produto / GHZ conhecidos | Medidas de estado com verificações independentes; estimativas de pureza de subsistemas com erro de amostra finita |

<a id="ground-states-chemistry-and-optimization"></a>

### Estados fundamentais, química e otimização

| Direção | Tarefas que você pode iniciar | Resultados que você pode examinar |
| --- | --- | --- |
| Resolução e validação de estados fundamentais | Executar VQE num Hamiltoniano de Pauli real de dois qubits, num setor de partículas fixo, e conferi-lo com uma referência exata | Energia, trajetória de convergência, verificações independentes e, no fluxo completo, um relatório de aceitação científica |
| Química quântica e estados fundamentais de muitos corpos | Estudar moléculas e espaços ativos com SQD, ou estados fundamentais de cadeias de spin XYZ com TeNPy | Energia e ocupação orbital do SQD; energia, magnetização, entropia de emaranhamento e convergência do DMRG; referência exata opcional |
| Aprendizado de parâmetros variacionais | Treinar Flow-VQE num Hamiltoniano de Pauli para aprender parâmetros de circuito de baixa energia | Aprendizado por fluxo comparado com busca aleatória sob o mesmo orçamento de avaliações |
| Estados excitados e classificação por kernel | Buscar vários estados de baixa energia com OpenQARP VQD, ou treinar um QSVM com kernel angular do cqlib | Energias, resíduos, ortogonalidade e espectro exato opcional; classificação em dados reservados, kernel analítico e linha de base clássica |
| Simetria e álgebra de controle | Reduzir qubits num setor de simetria escolhido com Symmer; analisar geradores de Pauli com PauLie | Hamiltoniano reduzido, classificação e dimensão da álgebra de Lie; comparação opcional de espectro ou fechamento |
| Otimização combinatória | Construir e resolver problemas de otimização locais com QPanda, Ocean ou Kaiwu; avaliar parâmetros QAOA dados com Qcover | Solução, verificação de restrições, energias e correlações, com comparação clássica quando a interface a oferece |
| Operadores químicos e dados existentes | Mapear operadores fermiônicos com OpenFermion / pyChemiQ; consultar, sob demanda, registros de ponto único existentes no QCArchive por meio do QCPortal | Termos de Pauli; molécula, energia, método e fonte, preservando unidades e campos ausentes |

<a id="error-mitigation-and-error-correction"></a>

### Mitigação e correção de erros

| Direção | Tarefas que você pode iniciar | Resultados que você pode examinar |
| --- | --- | --- |
| Mitigação de erros | Executar ZNE, REM, PEC ou CDR com Mitiq e comparar resultados brutos e mitigados com o mesmo orçamento de amostragem | Referência ideal, viés empírico, variância e RMSE, além do custo de calibração, treinamento e amostragem |
| Correção quântica de erros | Executar experimentos de memória com código de superfície em Stim / PyMatching, construir patches retangulares com Deltakit ou decodificar com BP+LSD | Circuitos ruidosos efetivos, taxas de erro lógico e intervalos com número fixo de shots; verificações de consistência de síndrome para LSD |

<a id="hamiltonian-simulation-and-open-systems"></a>

### Simulação hamiltoniana e sistemas abertos

| Direção | Tarefas que você pode iniciar | Resultados que você pode examinar |
| --- | --- | --- |
| Simulação hamiltoniana | Construir circuitos de evolução ou estados finais para um Hamiltoniano de Pauli real com Trotter–Suzuki ou qDrift | Circuitos, métricas de recursos, vetores de estado e referência matricial independente opcional; passos, ordem, tempo e semente são configuráveis |
| Dinâmica de sistemas abertos | Cadeias de Ising abertas com TJM, varreduras de acionamento e gradientes de um qubit com Dynamiqs, memória ambiental com OQuPy | Trajetórias de observáveis, referências independentes, gradientes, passos de tempo e cortes de memória |

<a id="experiment-simulation-and-hardware"></a>

### Simulação de experimentos e hardware

| Direção | Tarefas que você pode iniciar | Resultados que você pode examinar |
| --- | --- | --- |
| Experimentos supercondutores e atômicos | Simular fluxos de calibração, restrições de portas nativas e vazamento em transmons; estudar arranjos atômicos e pulsos suportados com Bloqade Analog / Pulser | Dados sintéticos, trajetórias dinâmicas, populações por átomo e probabilidades finais |
| Programas de pulso e controle | Construir, agendar e compilar programas offline com QUA, LabOne Q, Qblox Scheduler, Qililab ou OQC QAT | Programas, temporização, instruções de destino ou formas de onda; esses adaptadores não operam dispositivos de laboratório |
| Acesso a hardware quântico | Descobrir backends e verificar topologia e credenciais; ativar sob demanda a consulta, o envio e o cancelamento de jobs na nuvem | Dispositivos candidatos e condições de uso; resultados e estado das interfaces de jobs ativadas |
| Interface local de dispositivos | Consultar um driver C configurado por meio do QDMI | Dispositivos, qubits, portas e acoplamentos informados pelo driver; o driver de exemplo oficial valida a interface e não é uma QPU online |

<a id="photonics-and-quantum-networks"></a>

### Fotônica e redes quânticas

| Direção | Tarefas que você pode iniciar | Resultados que você pode examinar |
| --- | --- | --- |
| Circuitos fotônicos e aprendizado | Calcular saídas de óptica linear com Perceval e Lightworks; inferência em lote e gradientes de deslocamento de fase com MerLin; modelos gaussianos opcionais com MrMustard | Probabilidades de Fock, gradientes ou momentos ópticos, com ordem de modos e cortes explícitos |
| Modelagem de redes e programas | Simular perdas e decoerência de um único enlace com SimQN; gerar programas de dois nós com NetQASM | Estatísticas do enlace e programas compilados; a simulação no SquidASM requer um ambiente NetSquid licenciado à parte |

<a id="reference-material-and-selection"></a>

### Material de referência e seleção

| Direção | Tarefas que você pode iniciar | Resultados que você pode examinar |
| --- | --- | --- |
| Referências de algoritmos e escolha de ferramentas | Pesquisar os 66 guias de algoritmos Quantum-Practices, comparar SDKs quânticos e reutilizar etapas de pesquisa | Material de referência fixado, hipóteses e recomendações de seleção |
| Benchmarks públicos de dispositivos | Consultar 410 registros históricos fixos do Metriq por fornecedor, dispositivo ou tipo de benchmark | Parâmetros originais, métricas, datas, fontes e licenças, mantendo os rótulos de simulador |

### Quantum Learning

Materiais, conteúdos didáticos e salas de aula num só lugar: estudantes trabalham na prática e professores organizam seus próprios conteúdos de ensino.

| Aprendizagem e ensino | Recursos disponíveis |
| --- | --- |
| Preparar materiais | Página inicial, biblioteca de cursos, anexos, importação de cursos e importação de PPTX |
| Montar cursos | Pré-visualização de cursos, editor de conteúdos didáticos e o ambiente Pro |
| Aprender em aula | Slides, questionários, perguntas e respostas interativas e aprendizagem baseada em projetos |
| Continuar aprendendo | Cursos, tarefas, materiais e registros de aprendizagem locais no servidor, com migração de salas de aula anteriores |

O objetivo é cobrir desde os fundamentos do ensino médio até a pesquisa de fronteira, organizados em níveis iniciante, intermediário e avançado, com aprendizagem entre níveis. Os recursos públicos ainda estão sendo organizados, e o currículo completo ainda não foi produzido nem publicado. A montagem da aplicação, a inicialização e a persistência local foram verificadas; a criação de cursos, as perguntas e respostas e a edição com IA online real ainda aguardam aceitação completa.

As tarefas de ensino do modo Pro usam as ferramentas e os registros próprios da aplicação original e ainda não estão conectadas às ferramentas quânticas do ambiente de trabalho. Mídia, voz e busca opcionais precisam de serviços próprios. Instalação, backup, migração e verificação estão descritos no [guia de integração do Quantum Learning](../integrations/OPENMAIC.md).

<p align="center">
  <img src="../images/openquantum-learning-20260912.jpg" width="100%" alt="Quantum Learning: materiais de curso, salas de aula e edição de conteúdos didáticos" />
</p>

[Configurar o Quantum Learning e abrir uma sala de aula](#set-up-quantum-learning).

### Desktop, mensagens e idiomas

**Desktop.** O desktop do OpenQuantum oferece janela nativa, bandeja do sistema, terminal e notificações, e reutiliza os modelos, as Skills quânticas, as ferramentas de cálculo e os registros de execução do ambiente de trabalho. Usa o DSH Desktop original, de terceiros, com um pacote de recursos OpenQuantum entregue separadamente, no Mac (Apple Silicon / Intel), no Windows e a partir do código-fonte. [Instalar Desktop](#desktop-installer) · [Compilar o Desktop a partir do código-fonte](#desktop-from-source).

**Mensagens.** Com o CC Connect, você pode iniciar tarefas pelo WeChat, Feishu, DingTalk, Slack, Telegram, Discord e outros canais, reutilizando as Skills, Tools e registros de execução do ambiente de trabalho. [Configurar canais de mensagens](#messaging-channels).

<p align="center">
  <img src="../images/openquantum-wechat-chat.jpg" width="380" alt="Demonstração existente de conversa com o OpenQuantum pelo WeChat ClawBot" /><br />
  <sub>Uma tarefa e a resposta no canal do WeChat.</sub>
</p>

**Idiomas da interface.** Em **Configurações → Geral → Idioma**, escolha chinês simplificado, inglês, japonês, coreano, espanhol, francês, alemão, português, russo ou árabe. A escolha é salva, o Quantum Learning a acompanha, e o árabe usa leitura da direita para a esquerda.

![Seleção de idioma no aplicativo OpenQuantum Desktop em execução](../images/openquantum-languages-20260919.jpg)

O idioma da interface não reescreve conversas existentes, materiais de curso, Skills do usuário nem saídas de ferramentas. Alguns diálogos nativos do sistema recorrem ao inglês fora do chinês e do inglês.

<a id="quick-start"></a>

## Início rápido

Escolha uma porta de entrada: instalar o plugin no Codex, usar o cliente Desktop com seu pacote de recursos ou executar o ambiente de trabalho a partir do código-fonte. O Desktop e o ambiente de trabalho a partir do código-fonte destinam-se a uso local por um único usuário; escolha o código-fonte para desenvolver ou para usar recursos de `main`.

<a id="codex"></a>

### Plugin Codex: instalar e usar

Instalar o plugin OpenQuantum uma única vez registra, em conjunto, **Skills, serviços MCP locais, Tools científicas e a página de configurações do OpenQuantum**. Você continua fazendo perguntas, gerenciando projetos e lendo resultados nas conversas nativas do Codex; a página de configurações ajusta os recursos do OpenQuantum.

**Deixe o Codex instalá-lo para você:** abra o Codex, inicie uma nova conversa e cole o pedido abaixo.

```text
Please install the OpenQuantum Codex plugin 0.8.4. First read the installation guide:
https://github.com/xi-zhao/OpenQuantum/blob/codex-v0.8.4/docs/integrations/CODEX_AGENT_INSTALL.md
Download the complete installer and SHA256SUMS from https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4,
verify the checksum, check Codex, Node.js 24+ and npm, and install with the bundled installer.
Keep existing plugins and user settings, and check the Skills, MCP tools and the global "OpenQuantum settings" entry.
Tell me exactly what to do if the app needs reloading. Finally, report what was actually verified and which scientific dependencies still need preparation.
```

O pacote de recursos do Desktop, o plugin Codex e o instalador usam todos o **OpenQuantum 0.8.4**. Este plugin inclui 168 Skills e 87 Tools científicas, acrescenta 26 Skills de SDK nativos e unifica as abas Status, MCP, Skills e Service keys; as 16 novas Tools de serviço que dependem de credenciais ficam desativadas por padrão. A tag da versão é `codex-v0.8.4`; anexos e escopo de verificação são os informados na Release.

**[Baixar o instalador completo do plugin Codex 0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.4/openquantum-0.8.4-codex-install.zip)** ([notas de versão e SHA256SUMS](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4)).

O instalador contém o ZIP do plugin, o script de instalação e o lockfile de dependências; não é preciso clonar o código-fonte. Requer Node.js 24+, npm e uma versão do Codex com suporte a plugins e páginas de configurações globais; um agente pode verificar e resolver esses pontos com o [guia de instalação](../integrations/CODEX_AGENT_INSTALL.md). A instalação local foi verificada no macOS; confira a compatibilidade em outras plataformas e versões do host.

**Após a instalação:**

1. Recarregue o Codex quando solicitado e abra uma nova conversa para que as novas Skills e ferramentas sejam carregadas.
2. Pergunte diretamente na conversa, por exemplo: "Use o OpenQuantum para encontrar métodos de correção quântica de erros e recomendar um primeiro experimento."
3. Abra **"…" → "OpenQuantum settings"** e gerencie os recursos nas abas **Status / MCP / Skills / Service keys**; os interruptores das Tools ficam em **Status → Tools**. Os serviços integrados já vêm configurados com o plugin; para adicionar seu próprio servidor MCP, informe os dados de conexão e salve os tokens pelo diálogo de credenciais dedicado.

O plugin instala o código dos recursos e os pontos de configuração; alguns cálculos ainda exigem Python, SDKs quânticos ou contas de terceiros preparados conforme a necessidade. Veja o [guia do plugin](../integrations/CODEX_PLUGIN.md).

<details>
<summary><strong>Instalação manual (opcional)</strong></summary>

Baixe e verifique o instalador completo, extraia-o e execute o seguinte no diretório extraído (requer Node.js 24+, npm e uma CLI do Codex com suporte a plugins):

```sh
npm ci --ignore-scripts
npm run plugin:install
```

Se o instalador não encontrar a CLI do aplicativo Codex atual, defina `OPENQUANTUM_CODEX_CLI` com o caminho dela. Com um ZIP de plugin existente, use `npm run plugin:install -- /full/path/plugin.zip`. Instalação, tratamento de falhas e verificações passo a passo estão no [guia de instalação por agente](../integrations/CODEX_AGENT_INSTALL.md).

</details>

<a id="desktop-installer"></a>

### Instalador do Desktop

A versão atual do desktop combina o [cliente original DSH Desktop 2.0.7](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7) com um pacote de recursos OpenQuantum separado. O cliente original mantém o nome e a versão do projeto de origem; o pacote de recursos inclui Node / uv e fornece o acesso completo aos SDKs, as Skills quânticas, as Tools e a configuração. O instalador cria um atalho com o ícone OpenQuantum (`OpenQuantum.app` no Mac, `OpenQuantum.lnk` no Windows).

Instale primeiro o DSH Desktop original e depois escolha o pacote de recursos para sua plataforma:

| Plataforma | Download do OpenQuantum 0.8.4 | Executar após extrair |
| --- | --- | --- |
| Mac Apple Silicon | [pacote darwin-arm64](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-darwin-arm64.tar.gz) | `install.command` |
| Mac Intel | [pacote darwin-x64](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-darwin-x64.tar.gz) | `install.command` |
| Windows x64 | [pacote win32-x64](https://github.com/xi-zhao/OpenQuantum/releases/download/v0.8.4/OpenQuantum-0.8.4-DSH-win32-x64.tar.gz) | `install.cmd` |

Confira o download com o [SHA256SUMS da Release](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) antes de extrair. As atualizações preservam as configurações existentes; veja o [guia de instalação e migração](../DESKTOP_INSTALLERS.md). O pacote de recursos e o plugin Codex estão ambos na `0.8.4`, e o Harness permanece em `0.1.5-rc.1`. Ambientes de cálculo, contas e licenças continuam sendo preparados por recurso.

### Instalar a partir do código-fonte

Prepare Git e Node.js 24; as ferramentas quânticas em Python também precisam de [uv / uvx](https://docs.astral.sh/uv/getting-started/installation/). Outras dependências variam conforme o recurso, por exemplo Julia 1.12.7 para RandomMeas.

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
```

Sem chave de modelo, você já pode executar o [exemplo local fixo](#no-model-key-needed-recompute-a-fixed-case). Para iniciar tarefas pelo agente, escolha uma forma de iniciar o ambiente de trabalho e configure um modelo.

### Escolher como iniciar o ambiente de trabalho

Web e Desktop iniciados a partir da mesma cópia do código-fonte compartilham as mesmas configurações de modelo, recursos quânticos e registros de execução em `.openquantum/dsh`. Encerre a entrada em execução antes de trocar.

**Ambiente de trabalho Web**

```bash
npm run dev
```

Abra o endereço com o token de login exibido pelo inicializador; após a autenticação, o ambiente de trabalho fica em <http://127.0.0.1:3000>.

<a id="desktop"></a>
<a id="desktop-from-source"></a>

<details>
<summary><strong>Compilar e iniciar o Desktop a partir do código-fonte</strong></summary>

Depois de instalar as dependências do código-fonte e preparar o Corepack e as ferramentas de compilação C++ do sistema:

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop -- --source
```

`desktop:setup` compila o código-fonte original fixado, baixa o Electron e compila os módulos nativos sem modificar interfaces ou recursos de terceiros. Use o comando de inicialização do repositório para que as configurações de modelo e de recursos quânticos sejam carregadas. Os requisitos de plataforma estão em [implantação](../DEPLOYMENT.md).

</details>

<a id="configure-a-model"></a>

### Configurar um modelo

Uma instalação nova do Desktop tem a lista de modelos vazia. Em **Configurações → Modelos**, adicione um provedor com um endpoint OpenAI-compatible Chat Completions, o nome do modelo e a chave de API, e mantenha o OpenQuantum como Agent Preset padrão. **O modelo precisa suportar Tool Calling para chamar as ferramentas de computação quântica.** Isso configura apenas o serviço de modelo; as credenciais de nuvem quântica são configuradas com seus respectivos backends.

<details>
<summary><strong>Configuração avançada de modelos e diagnóstico pela linha de comando</strong></summary>

O código-fonte inclui exemplos opcionais de depuração `openquantum-public` / `openquantum-private` cujos endereços são marcadores `.invalid`. Eles não vêm preenchidos na lista de modelos de um Desktop novo e só precisam de endereços e credenciais reais para os diagnósticos abaixo.

As substituições de rota salvas na interface são gravadas em `$DSH_HOME/settings.yaml`, ignorado pelo Git; as chaves ficam no ambiente local ou no armazenamento de credenciais do Harness, e a configuração do projeto registra apenas referências às credenciais. Para usar `.env`, execute `cp .env.example .env` no macOS ou `Copy-Item .env.example .env` no Windows PowerShell e preencha-o conforme os comentários. O `.env` não substitui nomes de modelos; configure outros nomes de modelo em **Configurações → Modelos**.

O comando abaixo verifica a rota pública a partir do `.env` ou de variáveis de ambiente, com os nomes de modelo fixos do script, `kimi-k2.7-code` e `glm5.2`, testando geração de texto e Tool Calling. Ele não lê as substituições de rota salvas na interface; verifique outros modelos com a tarefa do ambiente de trabalho descrita abaixo.

```bash
npm run models:probe -- --provider openquantum-public
```

</details>

### Preparar os ambientes de cálculo por tarefa

As ferramentas de cálculo locais em Python usam dependências fixadas e preparadas explicitamente. Após `npm ci`, execute na raiz do repositório o comando de preparação do recurso de que precisa. A preparação pode baixar e compilar; as chamadas de cálculo não instalam mais dependências automaticamente.

| O que preparar | Comando ou local |
| --- | --- |
| O primeiro experimento com estado de Bell | `node scripts/setup-paper-tools.mjs fatqat-workbench` |
| Interação estática de um par de átomos de Rb | `npm run capability:pairinteraction:setup`; [governança de modelos e versões](../integrations/PAIRINTERACTION.md) |
| Simulação hamiltoniana Trotter / qDrift | `npm run capability:hamiltonian:setup` |
| Amostragem Clifft e conversão de circuitos com qBraid | `npm run capability:interop:setup` |
| Qualquer outro recurso em Python | `node scripts/setup-paper-tools.mjs <capability-id>`, por exemplo `qec-memory-experiment`; cada Skill indica o próprio comando |
| Exemplos de algoritmos | Comece pelo [ambiente mínimo](#run-an-algorithm-example-directly) e acrescente os grupos de gradientes, PennyLane, tensores ou química conforme necessário |

Preparação de ambiente, ativação de conexões e configuração de modelo são etapas independentes. Mesmo uma conexão ativada por padrão precisa ter suas dependências preparadas antes do primeiro uso; se um ambiente estiver faltando ou seu lockfile tiver mudado, a Tool retorna o comando exato de preparação. Julia, drivers QDMI e serviços MCP de origem seguem seus próprios guias; veja [ambientes locais](../integrations/LOCAL_ENVIRONMENTS.md).

### Executar uma primeira tarefa

<a id="no-model-key-needed-recompute-a-fixed-case"></a>

#### Sem chave de modelo: recalcular um caso fixo

Tendo como entrada o [Hamiltoniano de Pauli de dois qubits](../../.agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json) fixo do repositório, a Tool nativa `solve_and_validate_ground_state` executa VQE sem ruído no setor de partículas especificado e confere o resultado com um cálculo independente em forma fechada. Após `git clone` e `npm ci`, execute no repositório; não é preciso chave de modelo nem credencial de nuvem quântica:

```bash
npm run demo:quantum-ground-state
```

<table>
  <tr>
    <td align="center"><strong>−1,85727503 Ha</strong><br /><sub>Energia VQE</sub></td>
    <td align="center"><strong>−1,85727503 Ha</strong><br /><sub>Referência exata independente</sub></td>
    <td align="center"><strong>4,44 · 10⁻¹⁶ Ha</strong><br /><sub>Diferença de energia</sub></td>
    <td align="center"><strong>15 aprovadas</strong><br /><sub>Verificações de cálculo locais</sub></td>
  </tr>
</table>

Esses valores vêm de uma **reexecução local em 2026-09-12**; a [saída bruta e o registro da execução](../examples/quantum-ground-state-local-demo-2026-09-12.json) contêm os valores completos, o estado das verificações, o horário, o commit de origem, o digest da entrada e a versão do Node.js.

<details>
<summary><strong>O que esta execução verificou e o que ainda falta</strong></summary>

Neste registro, 15 verificações de cálculo locais passaram e 1 verificação de proveniência da sessão não foi executada; portanto, não existe uma conclusão completa de aceitação científica. A diferença de energia mostra concordância com a referência exata para este caso numérico; o escopo científico limita-se ao Hamiltoniano e ao setor de partículas dados.

A aceitação científica completa também exige executar a tarefa pelo Harness, salvar os arquivos de resultado e a proveniência da sessão e produzir um relatório de aceitação que possa ser relido. Os pontos de verificação após configurar o modelo estão em [desenvolvimento e verificação](#development-and-verification).

</details>

<a id="let-the-agent-run-a-task-prepare-and-sample-a-bell-state"></a>

#### Deixe o agente executar uma tarefa: preparar e amostrar um estado de Bell

Depois de configurar um modelo e preparar o FatQat com `node scripts/setup-paper-tools.mjs fatqat-workbench`, inicie uma nova sessão e envie:

> Use o FatQat partindo do estado de dois qubits todo em zero, aplique H a q0 e depois CX com q0 como controle e q1 como alvo. Retorne as probabilidades exatas sem ruído e compare-as com 1024 amostras usando seed=7.

O agente pode chamar a ferramenta de circuitos do FatQat, e o ambiente de trabalho guarda a entrada da ferramenta e o resultado retornado. Examine as probabilidades exatas e as contagens das amostras e, em seguida, peça:

> Mantenha o circuito e a semente, altere o número de amostras para 8192 e compare o quanto as frequências das duas execuções se afastam das probabilidades exatas.

As probabilidades ideais são de 50% para `00` e para `11`; as frequências com amostras finitas flutuam. Comparar duas execuções mostra essa flutuação; um único aumento do número de amostras não garante que cada frequência se aproxime do valor ideal. Sem um modelo com Tool Calling, o agente não pode chamar Tools de cálculo. Detalhes da interface e da verificação local estão no [guia do FatQat](../integrations/FATQAT.md).

<a id="run-an-algorithm-example-directly"></a>

#### Executar diretamente um exemplo de algoritmo

Não é necessária chave de modelo nem conta em nuvem quântica. Comece com NumPy, SciPy e Qiskit:

```bash
npm run capability:algorithms:setup -- --minimal
```

No macOS / Linux, liste os métodos, leia o contrato de entrada e execute o exemplo padrão de HHL:

```bash
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --list
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --describe hhl
examples/quantum-algorithms/.venv/bin/python examples/quantum-algorithms/run.py --algorithm hhl
```

No Windows PowerShell:

```powershell
& examples/quantum-algorithms/.venv/Scripts/python.exe examples/quantum-algorithms/run.py --algorithm hhl
```

Para QSP/QSVT e métodos semelhantes, execute `npm run capability:algorithms:setup -- --group pennylane`; os outros grupos são `gradients`, `tensor` e `chemistry`, e acrescentar um grupo preserva os demais. `npm run capability:algorithms:setup` sem argumentos prepara tudo. O ambiente completo inclui PySCF, para o qual recomendamos WSL no Windows; a verificação numérica foi feita em CPU no macOS.

Passe seus próprios parâmetros como arquivo JSON com `--input` e salve os resultados com `--output`, ou, depois de configurar um modelo, deixe o agente usar `quantum-algorithms` ou a Skill de um método específico. Parâmetros, ordem de bits, diferenças entre métodos e grupos de dependências estão no [guia de exemplos de algoritmos](../../examples/quantum-algorithms/README.md).

<a id="upgrade-an-existing-source-installation"></a>

### Atualizar uma instalação existente a partir do código-fonte

Atualize o código-fonte e as dependências do projeto seguindo o [guia de atualização](../UPDATES.md) e, em seguida, execute novamente, uma vez, o comando de preparação de cada recurso que você usa. As pontes Python verificam e sincronizam as dependências fixadas nos diretórios de ambiente existentes, então nada precisa ser apagado; nos exemplos de algoritmos, é possível continuar acrescentando grupos.

Reinicie o ambiente de trabalho e abra uma nova sessão. Os nomes e parâmetros das Skills e Tools existentes continuam válidos; os 13 índices de categoria ainda podem ser chamados manualmente, enquanto as tarefas automáticas escolhem `quantum-algorithms` ou um método específico. Para restaurar o conjunto completo de ferramentas de um serviço opcional, use o perfil padrão `full`; veja [seleção de recursos e compatibilidade](../integrations/CAPABILITY_SELECTION.md).

### Recursos opcionais

<a id="set-up-quantum-learning"></a>

<details>
<summary><strong>Configurar o Quantum Learning</strong></summary>

Depois de instalar as dependências do código-fonte, execute na mesma cópia do repositório:

```bash
npm run learning:ui:setup
```

Em seguida, inicie a Web ou o Desktop e abra o **Quantum Learning** pela barra lateral. A primeira inicialização sobe um banco de dados e um serviço de cursos locais, sem precisar de PostgreSQL global; as requisições de modelo usam o modelo selecionado no momento no OpenQuantum.

Instalação e inicialização foram verificadas no macOS. O instalador depende de `/bin/sh` e ainda não está adaptado ao Windows comum; o Linux ainda não foi verificado. Cada novo Git worktree precisa de uma instalação própria. Backup, migração e situação por plataforma estão no [guia de integração](../integrations/OPENMAIC.md#使用).

</details>

<a id="messaging-channels"></a>

<details>
<summary><strong>Configurar WeChat, Feishu e outros canais de mensagens</strong></summary>

```bash
npm run cc-connect:setup
npm run cc-connect:feishu
npm run cc-connect:start
```

Configure a primeira plataforma conforme descrito pelo projeto de origem; execute `npm run cc-connect:web` em outro terminal para gerenciar outras plataformas e credenciais. Os tokens ficam em uma configuração local ignorada pelo Git; veja o [guia de mensagens](../integrations/CC_CONNECT.md).

</details>

Problemas de implantação e inicialização são tratados em [implantação](../DEPLOYMENT.md) e [solução de problemas](../TROUBLESHOOTING.md).

<a id="use-and-inspect-results"></a>

## Usar e examinar os resultados

Depois que uma tarefa é executada, você pode escolher outros backends, alterar o tamanho do problema e levar os resultados para pesquisas posteriores.

<a id="choose-the-right-entry-point"></a>

### Escolher a ferramenta certa

Use os [exemplos executáveis](#algorithm-learning-and-method-comparison) ao aprender ou modificar um algoritmo, e as ferramentas especializadas quando precisar de um contrato de entrada/saída definido. Ferramentas sobrepostas para Trotter / qDrift, VQD, Qiskit e solucionadores de autovalores têm um [guia de seleção comum](../integrations/CAPABILITY_SELECTION.md); os nomes originais são mantidos, e implementações com hipóteses físicas ou métodos numéricos diferentes continuam separadas.

Qiskit Gym, Quantum Hardware e FlagQuantum ficam desativados por padrão. Quando precisar deles, configure um perfil de ferramentas menor para treinamento, consulta de dispositivos, compilação ou simulação; sem escolha, aplica-se o perfil `full`, compatível com versões anteriores. As Tools que podem ser chamadas numa sessão dependem das conexões ativadas, do registro efetivo e do perfil selecionado.

<a id="local-computing-and-quantum-clouds"></a>

### Cálculo local e nuvens quânticas

Cálculos numéricos locais não precisam de conta em nuvem quântica. Para usar outras ferramentas, configure a conexão em **Configurações → Componentes quânticos → Conexões de MCP Server**, reinicie o ambiente de trabalho e indique o backend na tarefa. Os estados padrão dos interruptores estão no [catálogo de serviços MCP](../../README.md#mcp-服务目录).

Para hardware real, prepare credenciais, permissões e cota para o serviço de destino. **Descoberta de dispositivos, envio de jobs reais e simulação local têm, cada um, seu próprio escopo.** Uma configuração não significa que o serviço esteja online; consulte o registro da execução real para saber se um job foi bem-sucedido.

| Backend | Recursos atuais | Credenciais ou condições |
| --- | --- | --- |
| Cálculo local | Simulação de circuitos e de ruído, referências de estado fundamental, auditorias de estados, amostragem de correção de erros, otimização e simulação de experimentos, cada uma com sua própria faixa de entradas | Sem credenciais de nuvem; prepare as dependências fixadas antes de calcular |
| IBM Quantum | Runtime, AI Transpiler, consultas de hardware; envio e cancelamento opcionais de jobs reais | `QISKIT_IBM_TOKEN`; as conexões de MCP Server para jobs são opcionais e ativadas pelo usuário |
| IonQ | Consultas de hardware; envio, cancelamento e estimativa de custo opcionais de jobs reais | `IONQ_API_KEY`; as conexões de MCP Server para jobs são opcionais e ativadas pelo usuário |
| Nuvem Origin Quantum | Descoberta de backends somente leitura (FieldQKit); consultas à QPU Wukong pelo QPanda3 Runtime MCP Server, com jobs opcionais de amostragem, valor esperado e lote | `ORIGIN_API_TOKEN` para descoberta; `QPANDA3_API_KEY` para jobs de hardware opcionais |
| Nuvens Quafu, Tianyan, Guodun, Tencent e LogicalQubit | Verificação de credenciais, descoberta de backends, filtragem de qubits, resumos de topologia e calibração | Token de API de cada serviço; somente leitura |
| FieldQuantum | Descoberta de backends de simulador em nuvem | `FIELDQUANTUM_API_TOKEN`; somente leitura |

Jobs de hardware e serviços pagos são ativados conforme a necessidade. A descoberta somente leitura permite conhecer dispositivos, topologia e calibração antes de decidir executar jobs reais. "Somente leitura" significa que o estado da nuvem remota ou da QPU não é alterado; as pontes Python locais mantêm seu contrato `workspace-write`, pois caches de SDK e a gravação de arquivos de resultado podem gravar no espaço de trabalho local.

### Parâmetros de cálculo

Dentro dos modelos e entradas suportados por cada ferramenta, você escolhe número de qubits, profundidade do circuito, termos do Hamiltoniano, número de amostras e orçamento de iterações. Os parâmetros e tamanhos disponíveis seguem a interface de cada ferramenta e dependem do algoritmo, do backend e dos recursos computacionais; um caso de referência delimitado não define o escopo de todas as ferramentas.

O cálculo principal e a comparação exata são separados: você pode otimizar circuitos, gerar padrões MBQC, reduzir simetrias, analisar álgebras de Lie ou executar algoritmos tensoriais diretamente, e escolher referências independentes automáticas, forçadas ou omitidas com `referenceMode`. Parâmetros, valores de retorno e configurações de recursos estão no [guia de cálculo local](../integrations/SCALABLE_BRIDGES.md). As entradas, versões e resultados das verificações locais ficam nos registros de cada integração para reprodução.

Mais tarefas prontas para copiar, sobre circuitos, estados fundamentais, ruído, dinâmica e consultas de benchmarks, estão no [README em chinês](../../README.md#更多可复制的计算任务).

<a id="execution-records-and-scientific-acceptance"></a>

### Métodos e resultados que você pode continuar usando

O ambiente de trabalho salva o pedido, as chamadas de ferramentas e os resultados retornados de cada tarefa, para que você possa revisar o processo e continuar perguntando. Ajuste parâmetros, escolha outro backend conectado ou transforme etapas de pesquisa recorrentes numa Skill para tarefas futuras.

Nos recursos suportados, os resultados vêm acompanhados de referências exatas, verificações independentes ou informações de erro estatístico. A resolução de estados fundamentais e as auditorias de informação quântica oferecem ainda um fluxo completo de aceitação científica, que liga entradas, arquivos de resultado e proveniência da sessão para revisão.

<details>
<summary><strong>Registros de execução e aceitação científica em detalhe</strong></summary>

O ambiente de trabalho de pesquisa registra os pedidos de tarefa, o carregamento de Skills, as chamadas de ferramentas, o estado de permissões e os resultados retornados. "Ativado" nas configurações é apenas uma política de configuração; se uma ferramenta pode ser chamada e um serviço está acessível é algo que só as evidências de execução mostram.

A conclusão da execução e a aceitação científica aparecem como estados distintos. Recursos com fluxo de aceitação completo ligam entradas, arquivos de resultado, verificações independentes e registros de sessão num relatório de aceitação que lista os itens aprovados, reprovados e não verificados; as demais ferramentas informam resultados numéricos e o estado das verificações dentro do próprio escopo.

![Dos resultados, geração e armazenamento de evidências e verificações independentes até a aceitação científica que combina regras e proveniência](../images/openquantum-evidence-flow.png)

O diagrama mostra como os recursos com aceitação completa formam evidências; [veja a fonte editável](../architecture/openquantum-evidence-flow.html). A resolução delimitada de estados fundamentais e as auditorias de informação quântica oferecem o fluxo completo; QUBO, equivalência de circuitos e experimentos de memória de correção de erros informam resultados e verificações segundo suas próprias regras. As evidências estão nas [declarações de recursos](../../.agents/capability-packages.yml), na [auditoria de arquitetura](../architecture/ARCHITECTURE_AUDIT.md) e no [benchmark fixo de recursos quânticos](../../benchmarks/quantum-capabilities/README.md).

</details>

### Perguntas frequentes

- Preciso de conta num computador quântico ou de uma chave de modelo? Veja o [exemplo local](#no-model-key-needed-recompute-a-fixed-case), a [configuração de modelos](#configure-a-model) e as [nuvens quânticas](#local-computing-and-quantum-clouds).
- [Preciso aprender todos os SDKs primeiro?](#give-ai-access-to-specialist-research-capabilities)
- [Uma resposta só em texto significa que o cálculo foi executado?](#let-the-agent-run-a-task-prepare-and-sample-a-bell-state)
- [Depois de atualizar, pedem que eu prepare um ambiente. E agora?](#upgrade-an-existing-source-installation)
- [Exemplos de algoritmos ou ferramentas de cálculo especializadas?](#choose-the-right-entry-point)
- [O Quantum Learning já tem cursos completos?](#quantum-learning)

<a id="extend-the-platform"></a>

## Estender a plataforma

**Transforme seu software quântico num recurso que agentes podem usar e leve aplicações completas para uma plataforma aberta.** Os caminhos de extensão do OpenQuantum prontos para agentes são: descrever métodos de trabalho numa Skill; conectar programas de cálculo como Tools nativas ou por meio de um MCP Server; e, quando forem necessárias verificações científicas independentes, acrescentar um Validator e seu fluxo de evidências. Aplicações completas são integradas segundo seus próprios limites de negócio e de dados, em vez de serem fragmentadas em Tools isoladas.

Os recursos de domínio do OpenQuantum rodam sobre o DeepSeek Harness, que cuida da execução geral de agentes, do agendamento de ferramentas, das conexões com modelos e dos registros de execução. Não se introduz um segundo runtime de agentes. Parta da tarefa que os usuários precisam resolver e então escolha a extensão:

| O que acrescentar | Onde fica |
| --- | --- |
| Conhecimento de domínio, etapas, escolha de ferramentas e interpretação de resultados | Uma Skill, que pode reutilizar Tools gerais ou quânticas existentes |
| Um cálculo, consulta ou operação estável | Uma Tool, registrada por um Tool Provider nativo ou pelo Harness MCP Client |
| Uma aplicação quântica ou produto de ensino com interface e fluxo de trabalho próprios | Integração segundo o limite da aplicação, mantendo suas responsabilidades de negócio, dados, permissões e backend; o Quantum Learning é o exemplo existente |
| Verificação e aceitação científicas independentes | Um Validator; para a aceitação final, acrescente um Acceptance Profile, a geração e armazenamento de evidências e o Acceptance Builder central |

As Skills, pontes e Tools nativas existentes servem de referência. Leia primeiro a [entrada de documentação e arquitetura](../README.md) e, conforme necessário, o [guia de contribuição](../../CONTRIBUTING.md), o [modelo de extensão](../architecture/EXTENSION_MODEL.md) e o [mapa de módulos](../architecture/MODULES.md).

<a id="quantum-applications-for-practical-problems"></a>

### Aplicações quânticas para problemas práticos

O OpenQuantum integra não apenas SDKs, algoritmos e serviços de cálculo, mas também aplicações completas voltadas a usuários e problemas definidos. Uma aplicação pode manter sua própria interface, fluxo de trabalho, gestão de dados e apresentação de resultados, e conectar-se a agentes por interfaces de execução explícitas quando a colaboração for útil.

Aplicações futuras poderiam abranger otimização de agendamento ou cálculos moleculares e de materiais, permitindo que os usuários submetam um problema real, verifiquem as condições de entrada e leiam os resultados com seu escopo, em vez de montar um fluxo de trabalho a partir de algoritmos isolados. Essas são direções, não uma lista de aplicações entregues. O [Quantum Learning](#quantum-learning) é a integração de aplicação completa existente; as demais precisam ter permissões de dados, backends, custos e escopo de verificação definidos caso a caso. Se uma aplicação usa uma QPU real ou supera métodos clássicos é algo decidido pelos seus próprios registros de execução e comparações.

<details>
<summary><strong>Arquitetura e responsabilidades</strong></summary>

![Arquitetura do OpenQuantum: as entradas de pesquisa chegam ao Harness; o agente lê Skills, usa ferramentas por meio de Tool Providers nativos ou do Harness MCP Client e se conecta aos serviços de modelo e ao registro de execução](../images/openquantum-platform-overview.png)

O diagrama mostra as relações de chamada centrais do ambiente de trabalho; [veja a fonte editável](../architecture/openquantum-platform-overview.html).

- Uma **Skill** fornece conhecimento e instruções de fluxo de trabalho; não executa código nem guarda credenciais.
- Um **Tool Provider** registra ferramentas executáveis, de forma nativa no próprio processo ou pelo Harness MCP Client para um MCP Server.
- Um **Scientific Validator** produz observações; um Acceptance Profile define as regras, e somente o Acceptance Builder central deriva a aceitação final a partir das observações e da proveniência. Nos documentos de desenvolvimento, `L3` designa um fluxo de aceitação completo e reproduzível; não significa que toda chamada tenha sido aceita.
- Um **Agent Preset** combina os Skill Providers, Tool Providers e políticas de agente necessários.

Prefira Tool Providers nativos para ações no mesmo processo e na mesma linguagem, sem necessidade de isolamento; use um MCP Server para implantações entre linguagens, em processo separado ou remotas. O Harness monta as extensões por meio de Cordis Plugins, e UI, conexões com modelos, cálculo quântico e julgamento científico mantêm responsabilidades separadas.

</details>

O catálogo completo de Skills, serviços MCP e Tools nativas é mantido no [README em chinês](../../README.md#能力接口目录): o código-fonte atual traz **186 Skills integradas** (173 selecionáveis automaticamente e 13 índices de categoria manuais), **91 conexões de serviços MCP** (66 ativadas por padrão e 25 opcionais) e **5 Tools quânticas nativas**.

<a id="development-and-verification"></a>

### Desenvolvimento e verificação

<details>
<summary><strong>Verificações de configuração, regressões numéricas e testes de ponta a ponta</strong></summary>

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

Escolha as verificações relevantes para sua alteração; a lista completa está no [README em chinês](../../README.md#开发与验证). Testes e evidências locais são distintos de uma versão publicada ou de uma aceitação científica. As mudanças da versão estão nas [notas da versão v0.8.4](../releases/v0.8.4.md).

</details>

A [Skill oficial `pyqpanda3` da OriginQ](https://github.com/OriginQ/pyqpanda3-skill) é uma Skill opcional de origem externa: não é contada entre as 186 Skills integradas e não é instalada automaticamente. `npm run skill:qpanda:setup` instala a versão revisada; isso não ativa `qpanda_runtime` nem concede permissões para jobs na nuvem.

<a id="roadmap-and-rsi"></a>

## Roteiro e RSI

**De usar recursos existentes a criar novos, em conjunto.** Seguiremos construindo uma plataforma aberta de agentes e aplicações quânticas, em que métodos especializados, recursos computacionais, aplicações completas, instrumentos de laboratório e recursos de aprendizagem tenham cada um sua porta de entrada e trabalhem juntos dentro do próprio escopo. Estas são direções de longo prazo, não uma lista de entregas; os recursos chegam por meio de integração e verificação individuais.

### Fundamentos da plataforma

| Linha de longo prazo | O que seguiremos construindo |
| --- | --- |
| **0 · Um agente quântico mais útil** | Aprimorar a compreensão de tarefas, a escolha de métodos, as chamadas de ferramentas, a interpretação de resultados e a recuperação de falhas, do pedido ao cálculo efetivo. Medir o progresso pela qualidade, tempo e custo de concluir tarefas reais. |
| **1 · Um ecossistema de software quântico pronto para agentes** | Continuar conectando software especializado e aprimorando interfaces de execução, Skills de domínio e preparação de dependências, para que as ferramentas possam ser chamadas e os métodos reutilizados, preservando condições de aplicabilidade e registros de verificação. |
| **2 · Fluxos de trabalho quânticos, HPC e IA** | Conectar CPUs locais, GPUs remotas, HPC, simuladores quânticos e QPUs, e explorar computação quântico-clássica organizada por agentes. Escolher recursos por tamanho, precisão, tempo e orçamento, verificando passo a passo backends, orquestração e execução coordenada. |
| **3 · Interfaces para instrumentos de laboratório inteligentes** | Preparar interfaces padronizadas de dispositivos, conectar gradualmente instrumentos programáveis e explorar descoberta de dispositivos, controle experimental, análise de medições e realimentação, ligando o cálculo a experimentos reais. |

### Aplicações e ensino

| Linha de longo prazo | O que seguiremos construindo |
| --- | --- |
| **4 · Mais cursos de alta qualidade** | Construir um mapa de conhecimento dos fundamentos à fronteira, com cursos de nível iniciante, intermediário e avançado, aprendizagem entre níveis conforme formação e interesse, e explicação, experimentos práticos e avaliação interligados. |
| **5 · Aplicações quânticas para problemas práticos** | Integrar ou construir em conjunto aplicações completas em torno de problemas definidos, com entrada do problema, fluxo de cálculo e apresentação de resultados, para que os usuários não precisem montar as ferramentas subjacentes. Documentar os backends, custos, escopo e resultados de verificação de cada aplicação. |

### Personalização e aprimoramento

| Linha de longo prazo | O que seguiremos construindo |
| --- | --- |
| **6 · Apoio proativo e personalizado** | Entender a formação, os interesses e os objetivos de cada pessoa a partir da aprendizagem e da pesquisa, sugerir o que aprender ou qual método usar em seguida e preencher pré-requisitos ausentes, para que cursos e ferramentas se adaptem à pessoa. Os usuários controlam quais registros são usados, onde ficam armazenados e como desativar esse recurso. |
| **7 · Capacidades de pesquisa em contínuo aprimoramento** | Explorar o caminho da experiência com tarefas até métodos e ferramentas aprimorados, e daí até o aprimoramento do próprio processo de pesquisa. Testar os aprimoramentos com comparações em tarefas novas, verificações independentes, custos totais e versões que possam ser revertidas, como na direção RSI descrita abaixo. |

As interfaces de instrumentos se inspirarão em explorações como o [Model Hardware Standard (MHS)](https://www.anthropic.com/news/model-hardware-standard-research-preview) da Anthropic, começando por dispositivos simulados e experimentos colaborativos; o controle em tempo real e as restrições dos dispositivos permanecem com os drivers e sistemas de controle correspondentes.

<a id="rsi"></a>
<a id="research-that-improves-how-research-is-done"></a>

### Pesquisa que aprimora a forma de fazer pesquisa

**Estado atual: a plataforma dispõe de métodos, execução e parte da infraestrutura de verificação científica; o ciclo RSI não está implementado.** Propostas de aprimoramento, avaliação independente, aceitação de versões e ganhos entre rodadas ainda precisam ser construídos e verificados; os [limites de arquitetura e de evidências](../README.md) continuam sendo a base do que existe hoje.

**A pesquisa deveria deixar não apenas respostas, mas também métodos e ferramentas que melhorem a investigação seguinte.** Queremos explorar o autoaperfeiçoamento recursivo (RSI) para a ciência quântica: o sistema identifica os próprios limites, propõe aprimoramentos candidatos e, depois de testados, os usa em tarefas posteriores; o sistema aprimorado então produz e verifica com mais eficácia a rodada seguinte de aprimoramentos.

| Nível | Mudança que queremos acumular |
| --- | --- |
| Entre tarefas | Transformar a experiência autorizada com tarefas em métodos, casos e limites de falha reutilizáveis, e não apenas em históricos de conversa. |
| Aprimoramento de recursos | Propor mudanças na escolha de métodos, na implementação de ferramentas ou no fluxo de trabalho e testar, em tarefas novas, se a qualidade, a confiabilidade ou o custo melhoram. |
| Autoaperfeiçoamento recursivo | Aprimorar os métodos que produzem aprimoramentos, como o desenho de experimentos, a busca de candidatos e a verificação independente, e testar se a rodada seguinte se torna mais eficiente. |

O ciclo imaginado é **tarefa real → aprimoramento candidato → verificações independentes e comparações em tarefas novas → atualização de versão autorizada → rodada seguinte de pesquisa.**

Por exemplo, uma tarefa de circuitos poderia gerar não só um circuito otimizado, mas também uma forma melhor de escolher estratégias de otimização. As estratégias candidatas precisam de verificações independentes de equivalência e de comparação com a versão anterior em circuitos não usados no desenvolvimento; aprimorar os experimentos que encontram tais estratégias atinge o núcleo recursivo. O que importa é se as tarefas posteriores realmente se beneficiam, e não quantas Skills foram acrescentadas, quanto código mudou ou se um modelo mais forte foi colocado no lugar.

Um aprimoramento deve ser comparado com uma versão que não o herdou, informando o modelo de base, a participação humana e o custo total de aprimoramento e de uso em condições comparáveis, e verificando regressões. Um sistema candidato não pode afrouxar as próprias regras de aceitação, apagar evidências de falha nem ampliar as próprias permissões; avaliação independente, autorização do usuário, limites de dados e possibilidade de reversão são condições para aceitar uma mudança. Contribuições da comunidade e orientação humana fazem parte do processo e não devem ser todas creditadas ao progresso autônomo da IA.

O OpenQuantum pretende oferecer um ambiente de trabalho quântico para essa exploração: ferramentas executáveis, métodos reutilizáveis, resultados verificáveis e interfaces abertas para outros agentes de pesquisa, sem construir um novo runtime geral de agentes nem treinar um novo modelo de base. A colaboração com CyberEinstein, PRAgent e RunThePaper é uma possibilidade futura, não um ciclo automático já existente entre projetos. Se IA e computação quântica se reforçam mutuamente é algo a ser testado em tarefas concretas, contabilizando custos de preparação, medição, correção de erros e transferência de dados; não supomos que a computação quântica acelere o treinamento de modelos de base nem que permita autoaperfeiçoamento ilimitado.

**O que queremos, em última instância: que uma investigação produza um resultado novo e deixe capacidades que ajudem a seguinte a ter sucesso.**

<a id="documentation-and-support"></a>

## Documentação e suporte

**Todos são bem-vindos a ajudar a construir uma IA confiável para a pesquisa quântica.** Relate problemas, contribua com código, conecte ferramentas, compartilhe métodos e casos de reprodução e ajude o conhecimento da comunidade a chegar a mais pesquisadores. Um caso reproduzível, um resultado negativo verificado, uma correção que elimina preparações repetidas ou um experimento que coloca estudantes para praticar podem dar início ao próximo trabalho.

| O que você quer fazer | Comece por aqui |
| --- | --- |
| Usar a plataforma e entender seus recursos | [Índice da documentação](../README.md), [implantação](../DEPLOYMENT.md), [solução de problemas](../TROUBLESHOOTING.md) |
| Contribuir com Skills, ferramentas e verificações científicas | [Estender a plataforma](#extend-the-platform), [guia de contribuição](../../CONTRIBUTING.md) |
| Integrar aplicações, criar cursos e experimentos | [Aplicações práticas](#quantum-applications-for-practical-problems), [Quantum Learning](#quantum-learning) |
| Relatar problemas ou conhecer a história do projeto | [GitHub Issues](https://github.com/xi-zhao/OpenQuantum/issues), [história do projeto (em chinês)](../communications/openquantum-wechat-launch.md) |

Ao contribuir, informe fontes, autores, licenças, condições e escopo de verificação, e compartilhe apenas material autorizado. Sessões privadas e dados não publicados não são públicos por padrão, e credenciais nunca devem fazer parte de contribuições. Relate questões de segurança de forma privada, conforme a [política de segurança](../../SECURITY.md).

Os documentos técnicos detalhados estão principalmente em chinês, e o README detalhado também está disponível em inglês; correções a esta tradução são bem-vindas.

**[Começar uma exploração quântica](#quick-start)** · [Trazer seus métodos e aplicações](#extend-the-platform)

**OpenQuantum · Computação quântica na ponta dos dedos.**

<a id="license-and-acknowledgments"></a>

## Licença e agradecimentos

Os recursos quânticos do OpenQuantum se apoiam na ciência aberta e no software de código aberto. Mantemos Skills de domínio, pontes MCP, Tools nativas e as verificações científicas aplicáveis; as bibliotecas de algoritmos subjacentes, os serviços externos e as bases das aplicações mantêm seus próprios autores, nomes de projeto e licenças.

| Projeto usado ou adaptado | Papel no OpenQuantum |
| --- | --- |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | Runtime de agentes e Web UI nativa do ambiente de trabalho de pesquisa: sessões, chamadas de modelo, agendamento de ferramentas e registros de execução |
| [DSH Desktop](https://github.com/anywhere-labs/dsh-desktop) | Base do cliente desktop; o OpenQuantum adapta a marca e a configuração de inicialização e reutiliza o ambiente de trabalho |
| [CC Connect](../integrations/CC_CONNECT.md) | Ponte de mensagens que traz pedidos do WeChat, Feishu e outros canais para o ambiente de trabalho |
| [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) | Base de ensino do Quantum Learning, mantendo sua interface completa, servidor e fluxos de ensino, com nome, tema e conexão de modelos do OpenQuantum |

Os projetos de cálculo, dispositivos e referência por trás de cada recurso, e a forma como cada um foi adaptado, estão listados no [README em chinês](../../README.md#开源生态与致谢).

O código próprio do OpenQuantum está sob a [Licença MIT](../../LICENSE), exceto os diretórios com licença própria. O [diretório do recurso de mitigação de erros Mitiq](../../.agents/skills/mitiq-error-mitigation/) é GPL-3.0-only, e o [snapshot de dados públicos do Metriq](../../src/metriq-data/upstream/) é CC-BY-4.0, cada um com seus próprios LICENSE e NOTICE. DeepSeek Harness, DSH Desktop, OpenMAIC, FatQat, Qiskit MCP Servers, FieldQKit, Quantum Hardware MCP e outros componentes de terceiros mantêm suas próprias licenças; consulte [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) antes de redistribuir ou ativar uma integração opcional. As fontes das capturas de tela e dos diagramas estão nas [notas das imagens](../images/README.md).

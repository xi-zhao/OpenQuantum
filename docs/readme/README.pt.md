<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>OpenQuantum — Construindo juntos uma IA confiável para a pesquisa quântica.</strong><br /><sub>A experiência da pesquisa quântica reunida no OpenQuantum</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

O OpenQuantum é uma plataforma de IA para pesquisa quântica, de código aberto e aberta à colaboração. Reúne software, algoritmos e pesquisas publicadas pela comunidade para que a IA ajude a analisar suas perguntas, escolher métodos, executar cálculos e conferir resultados. Transforma o conhecimento compartilhado em capacidades práticas de pesquisa.

**Conclua uma tarefa e depois aplique o método à sua própria pergunta.** Execute um exemplo, altere as entradas e examine os resultados. Guarde o código, os parâmetros e as saídas para a próxima pesquisa.

**[Instalar o plugin Codex](../integrations/CODEX_AGENT_INSTALL.md)** · [Instalar Desktop](../DESKTOP_INSTALLERS.md)

**OpenQuantum 0.8.4 disponível:** [Desktop](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) · [Plugin Codex](https://github.com/xi-zhao/OpenQuantum/releases/tag/codex-v0.8.4). Ambos usam a mesma versão do produto. Tools, MCP e Skills estão organizados em oito categorias de uso, com busca e filtros de estado. Os atalhos de Desktop usam o ícone OpenQuantum.

![OpenQuantum Desktop](../images/openquantum-desktop-20261013.jpg)

## Recursos disponíveis

Simule circuitos com Qiskit e TyxonQ; otimize-os com PyZX; explore computação baseada em medições com Graphix, redução por simetrias com Symmer e álgebra de Lie com PauLie. TeNPy, SQD e Flow-VQE abrangem estados fundamentais e química. Mitiq oferece mitigação de erros; Stim, PyMatching, Deltakit e BP+LSD permitem estudar correção de erros. Dynamiqs, OQuPy, TJM e Clifft tratam de dinâmica e ruído; FatQat oferece experimentos com sistemas supercondutores e atômicos. FieldQKit descobre dispositivos e Quantum Learning oferece recursos para ensino e aprendizagem.

O código de `main` também inclui corte de portas e reconstrução de valores esperados com QCut, otimização de circuitos com Compact e estados excitados por VQD com OpenQARP. Essas conexões são ativadas por padrão, mas suas dependências precisam ser preparadas. O QSVM com kernel angular do cqlib-qml e o ambiente de circuitos FlagQuantum ficam desativados até serem habilitados. Consulte o [escopo e a verificação](../integrations/CANDIDATE_LIBRARIES.md).

O inventário atual contém **183 Skills** (170 selecionáveis automaticamente e 13 índices manuais), **91 conexões MCP** e **5 Tool quânticos nativos**. A disponibilidade depende das conexões ativadas e dos ambientes preparados. Consulte o [guia de seleção](../integrations/CAPABILITY_SELECTION.md).

A v0.8.4 permite usar as APIs públicas nativas de **111 ambientes SDK ou de código-fonte**. O agente pode escrever programas próprios, combinar APIs e salvar resultados completos, além dos casos predefinidos dos Tool. Prepare explicitamente as dependências para cada tarefa. Permanecem as restrições de plataforma, conta, licença e backend opcional. Consulte as verificações de engenharia no [registro de integração](../integrations/FULL_SDK_ACCESS.md). Não houve aceitação com tarefas reais de pesquisa; `scientificValidation=not_evaluated`.

A v0.6.0 reúne **52 pacotes de capacidades SDK** de três grupos: [17 SDKs de fornecedores](../integrations/VENDOR_SDKS.md), [20 capacidades de empresas e instituições](../integrations/SDK_EXPANSION.md) e [15 interfaces de redes, controle, óptica e nuvem](../integrations/SDK_GAPS.md). Abrangem circuitos diferenciáveis, estimativa de recursos, operadores químicos, fotônica, compilação de pulsos e redes quânticas; [Bloqade Analog](../integrations/BLOQADE_ANALOG.md) acrescenta simulação local de arranjos atômicos. Cada adaptador expõe as operações documentadas. O usuário configura contas, credenciais, permissões e licenças. A verificação local não valida conexões reais à nuvem, QPU nem aceitação científica.

Os **66 guias quantum-skills** da UnitaryLab foram adaptados como Skills nativas; **49 exemplos executáveis** cobrem os **39 módulos de algoritmos originais** e métodos adicionais dos guias. Eles usam Qiskit, PennyLane, quimb, PySCF e NumPy/SciPy sem depender do runtime proprietário da UnitaryLab. Isso não significa compatibilidade completa de API; as diferenças estão na [tabela de cobertura](../integrations/UNITARYLAB_OPEN_COVERAGE.md).

Também há simulação Trotter / qDrift de Hamiltonianos de Pauli, [conversão Qiskit/Cirq com qBraid, registros de medidas e paridades brutas com Clifft e consultas QDMI a um driver C configurado](../integrations/QUANTUM_INTEROP.md). Os dados do driver de exemplo QDMI não representam uma QPU real conectada.

Cada integração possui dependências e um escopo científico próprios. Um cálculo local não comprova o desempenho de hardware real. Concluir uma chamada de ferramenta também não equivale a passar por validação científica.

## Por que escolher o OpenQuantum

**Ampla cobertura especializada.** De algoritmos e simulação de circuitos à química quântica, cálculos de muitos corpos e correção de erros, conecta ferramentas e métodos. Dedique menos tempo à preparação e mais à exploração das suas perguntas.

**Mais velocidade, com medições.** Nos casos de otimização de um [comutador de Pauli com PennyLane](../../README.md#pennylane-rust-case) e de uma [função de Wigner com QuTiP](../../README.md#qutip-rust-case), as chamadas completas das tarefas representativas ficaram **5.09×** e **5.69×** mais rápidas. As medições incluem a conversão das entradas e saídas; os resultados foram comparados com as bibliotecas originais e cálculos de referência independentes.

**Colaboração que amplia as capacidades.** Incorporamos continuamente projetos de código aberto e métodos publicados de valor, com adaptação, integração, otimização e verificação. Todos podem participar com perguntas, código, ferramentas, métodos e casos de reprodução.

## Início rápido

Para uso local individual, escolha o instalador de desktop ou a execução a partir do código-fonte.

### Instalador para desktop

OpenQuantum 0.8.4 usa o cliente original [anywhere-labs DSH Desktop 2.0.7](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.7) com um arquivo de capacidades OpenQuantum. Harness permanece em `0.1.5-rc.1`. O arquivo inclui Node.js e uv; execute `install.command` no Mac ou `install.cmd` no Windows. A marca, os componentes quânticos, Quantum Learning e as atualizações são mantidos com poucas alterações na interface original. Veja o [guia de instalação e atualização](../DESKTOP_INSTALLERS.md).

Instale primeiro o cliente original DSH Desktop. Baixe o arquivo para Mac Apple Silicon, Mac Intel ou Windows x64 na [Release 0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.8.4) e confira-o com `SHA256SUMS` antes de extrair. O instalador cria `OpenQuantum.app` no Mac ou `OpenQuantum.lnk` no Windows com o ícone OpenQuantum. O cliente original mantém seu nome e sua versão. As atualizações preservam as Skills, rotas de modelos e configurações MCP existentes. Os ambientes de cálculo e Quantum Learning exigem a preparação documentada.

### Codex

Baixe o [instalador completo 0.8.4](https://github.com/xi-zhao/OpenQuantum/releases/download/codex-v0.8.4/openquantum-0.8.4-codex-install.zip) e siga o [guia de instalação](../integrations/CODEX_AGENT_INSTALL.md). O plugin oferece 168 Skills e 87 Tools científicas nas conversas do Codex. Requer Codex compatível, Node.js 24 ou superior e npm; prepare as dependências científicas conforme necessário.

### Executar a partir do código-fonte

Para desenvolver ou usar os recursos de `main`, prepare Git, Node.js 24 ou superior e uv para as ferramentas Python. Depois siga os passos abaixo.

[uv](https://docs.astral.sh/uv/getting-started/installation/)

```bash
git clone https://github.com/xi-zhao/openQuantum.git
cd openQuantum
npm ci
npm run dev
```

Abra o link de autenticação exibido no registro de inicialização. Após entrar, o ambiente de trabalho aparecerá no navegador.

### Configurar um modelo

Em Configurações → Modelos, informe a URL, o nome do modelo e a chave de API de um provedor compatível com OpenAI-compatible Chat Completions. Selecione o Agent Preset OpenQuantum. O modelo precisa oferecer Tool Calling para executar as ferramentas. Uma nova instalação de Desktop tem a lista de modelos vazia. Adicione o serviço que deseja usar. As credenciais do modelo são distintas das credenciais da nuvem quântica.

O exemplo local de referência de um Hamiltoniano fixo com dois qubits pode ser executado sem chave de modelo.

```bash
npm run demo:quantum-ground-state
```

Antes de executar a tarefa FatQat abaixo a partir do código-fonte, prepare explicitamente o ambiente na raiz do repositório. Essa etapa pode baixar dependências; o cálculo não as instala automaticamente.

```bash
node scripts/setup-paper-tools.mjs fatqat-workbench
```

Para os exemplos de algoritmos, comece com `npm run capability:algorithms:setup -- --minimal`. Adicione `--group gradients`, `--group pennylane`, `--group tensor` ou `--group chemistry` conforme o método; os grupos já instalados são preservados. Sem argumentos, a preparação continua completa. O ambiente completo inclui PySCF, por isso recomendamos WSL no Windows; a verificação numérica foi realizada em CPU no macOS. Veja as [instruções de execução](../../examples/quantum-algorithms/README.md).

Após atualizar o código-fonte, execute novamente a preparação dos recursos usados, reinicie o ambiente de trabalho e abra uma nova sessão. Os ambientes Python existentes são verificados e sincronizados no mesmo local. [Preparação e atualização dos ambientes](../integrations/LOCAL_ENVIRONMENTS.md).

Após configurar o modelo, experimente: “Use FatQat para preparar um estado de Bell a partir de dois qubits no estado zero. Aplique H a q0 e depois CX com q0 como controle e q1 como alvo. Compare as probabilidades exatas com 1024 amostras usando seed=7.” As probabilidades ideais de 00 e 11 são de 50% cada. Verifique as entradas reais da ferramenta e os resultados do cálculo.

### Desktop

Para compilar o Desktop a partir da mesma cópia do código, conclua a instalação pelas fontes e prepare Corepack e as ferramentas de compilação C++ do sistema.

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop -- --source
```

Web e Desktop compartilham os dados e a configuração do Harness quando iniciados a partir da mesma cópia do código-fonte. Feche o outro host antes de usar o mesmo diretório de dados.

## Quantum Learning

Prepare a aplicação de ensino na mesma cópia do repositório usada para iniciar o OpenQuantum.

```bash
npm run learning:ui:setup
```

Abra Quantum Learning na barra lateral. Cada novo Git worktree precisa de uma instalação própria. Se aparecer um aviso de instalação incompleta, execute o comando acima nesse worktree e reabra a aplicação. A integração preserva os fluxos de materiais, aulas e edição do OpenMAIC; os modelos são acessados pelo Harness. Os dados das aulas são armazenados separadamente do registro de sessões.

## Idiomas

Em Configurações → Geral → Idioma, escolha chinês simplificado, inglês, japonês, coreano, espanhol, francês, alemão, português, russo ou árabe. A escolha é salva e sincronizada com o Quantum Learning. O árabe usa direção da direita para a esquerda. Conversas existentes, materiais de aula, Skills do usuário e saídas das ferramentas não são traduzidos. Alguns diálogos nativos usam inglês fora dos idiomas chinês e inglês.

## Documentação e contribuições

Skills fornecem conhecimento e procedimentos; Tool Providers registram ferramentas executáveis. Recursos que exigem verificação científica usam um Validator independente e evidências para determinar a aceitação. O OpenQuantum reutiliza o ambiente de execução do DeepSeek Harness. As edições em inglês e chinês trazem orientações detalhadas de uso e extensão.

Vamos construir juntos uma IA confiável para a pesquisa quântica. Todos podem relatar problemas, contribuir com código e ferramentas, ou compartilhar métodos e casos de reprodução.

[English](./README.en.md) · [中文](../../README.md) · [Documentation](../README.md) · [Contributing](../../CONTRIBUTING.md) · [Issues](https://github.com/xi-zhao/openQuantum/issues)

```bash
npm run harness:config
npm run desktop:check
npm run check
```

## Visão de longo prazo e RSI

Exploramos a colaboração entre computação quântica, HPC e IA, novas aplicações e materiais didáticos e a melhoria dos métodos de pesquisa. O autoaperfeiçoamento recursivo (RSI) é uma proposta de pesquisa: o ciclo descrito ainda não foi implementado. Sua avaliação exige verificações independentes, comparação em tarefas novas, custo total, autorização do usuário e possibilidade de retornar a uma versão anterior.

[Roteiro detalhado](../../README.md#rsi).

## Licença

O código próprio do OpenQuantum usa a licença MIT. DeepSeek Harness, OpenMAIC e os projetos quânticos mantêm sua autoria e suas licenças. Consulte Third-party notices antes de redistribuir ou ativar integrações opcionais.

[MIT](../../LICENSE) · [Third-party notices](../../THIRD_PARTY_NOTICES.md)

<h1 align="center"><img src="../../packages/openquantum-web-branding/assets/lockup.svg" width="430" alt="OpenQuantum" /></h1>

<p align="center"><strong>Coloque suas ideias quânticas em ação.</strong><br /><sub>Uma plataforma aberta de agentes e aplicações quânticas</sub></p>

<p align="center"><a href="../../README.md">简体中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.pt.md">Português</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.ar.md">العربية</a></p>

O OpenQuantum reúne ferramentas quânticas, métodos especializados e aplicações completas. Você pode solicitar cálculos a um agente de IA, usar uma aplicação integrada ou adicionar seus próprios algoritmos e serviços. Os serviços de modelos e os recursos de computação são configurados separadamente.

**Faça perguntas, execute cálculos e construa novas capacidades em conjunto.**

![OpenQuantum Desktop](../images/openquantum-desktop-20260919.jpg)

## Recursos disponíveis

Simule circuitos com Qiskit e TyxonQ; otimize-os com PyZX; explore computação baseada em medições com Graphix, redução por simetrias com Symmer e álgebra de Lie com PauLie. TeNPy, SQD e Flow-VQE abrangem estados fundamentais e química. Mitiq oferece mitigação de erros; Stim, PyMatching, Deltakit e BP+LSD permitem estudar correção de erros. Dynamiqs, OQuPy, TJM e Clifft tratam de dinâmica e ruído; FatQat oferece experimentos com sistemas supercondutores e atômicos. FieldQKit descobre dispositivos e Quantum Learning oferece recursos para ensino e aprendizagem.

O código de `main` também inclui corte de portas e reconstrução de valores esperados com QCut, otimização de circuitos com Compact e estados excitados por VQD com OpenQARP. Essas conexões são ativadas por padrão, mas suas dependências precisam ser preparadas. O QSVM com kernel angular do cqlib-qml e o ambiente de circuitos FlagQuantum ficam desativados até serem habilitados. Consulte o [escopo e a verificação](../integrations/CANDIDATE_LIBRARIES.md).

Cada integração possui dependências e um escopo científico próprios. Um cálculo local não comprova o desempenho de hardware real. Concluir uma chamada de ferramenta também não equivale a passar por validação científica.

## Por que escolher o OpenQuantum

**Da pergunta ao cálculo.** Descreva uma tarefa compatível em linguagem natural e o agente chamará as ferramentas especializadas. Você define as entradas e as hipóteses físicas e avalia os resultados.

**Cada pesquisa como ponto de partida.** O ambiente de trabalho preserva as entradas e os resultados das ferramentas para continuar com outros parâmetros. A validação científica depende do escopo de cada capacidade.

**Seus métodos ao alcance de outras pessoas.** É possível contribuir com Skills, ferramentas de cálculo, materiais e aplicações. Modelos e recursos computacionais são configurados separadamente, preservando a autoria e as licenças dos projetos originais.

## Início rápido

Para uso local individual, escolha o instalador de desktop ou a execução a partir do código-fonte.

### Instalador para desktop

Baixe o instalador para Mac (Apple Silicon / Intel) ou Windows no [GitHub Releases](https://github.com/xi-zhao/OpenQuantum/releases/latest). Node.js e uv estão incluídos, sem necessidade de compilar o código-fonte. São versões de teste sem assinatura. Siga o [guia de instalação](../DESKTOP_INSTALLERS.md), abra o aplicativo e configure um modelo. Algumas dependências Python são baixadas no primeiro uso; Quantum Learning e outros aplicativos opcionais exigem preparação separada.

Os [instaladores v0.5.1](../releases/v0.5.1.md) não incluem os recursos adicionados posteriormente a `main` nem as [atualizações das bibliotecas quânticas de 22 de setembro](../releases/2026-09-22-quantum-upstream-update.md). Mudanças no código-fonte não atualizam automaticamente o aplicativo instalado.

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

Em Configurações → Modelos, informe a URL, o nome do modelo e a chave de API de um provedor compatível com OpenAI-compatible Chat Completions. Selecione o Agent Preset OpenQuantum. O modelo precisa oferecer Tool Calling para executar as ferramentas. Os endereços .invalid incluídos são exemplos: substitua-os por um serviço real. As credenciais do modelo são distintas das credenciais da nuvem quântica.

O exemplo local de referência de um Hamiltoniano fixo com dois qubits pode ser executado sem chave de modelo.

```bash
npm run demo:quantum-ground-state
```

Após configurar o modelo, experimente: “Use FatQat para preparar um estado de Bell a partir de dois qubits no estado zero. Aplique H a q0 e depois CX com q0 como controle e q1 como alvo. Compare as probabilidades exatas com 1024 amostras usando seed=7.” As probabilidades ideais de 00 e 11 são de 50% cada. Verifique as entradas reais da ferramenta e os resultados do cálculo. O primeiro uso pode baixar dependências.

### Desktop

Para compilar o Desktop a partir da mesma cópia do código, conclua a instalação pelas fontes e prepare Corepack e as ferramentas de compilação C++ do sistema.

```bash
npm run desktop:setup
npm run desktop:verify-install
npm run desktop
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

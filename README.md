<p align="center">
  <img src="src/assets/banner.jpg" alt="DictaFlow Banner" width="100%">
</p>

# 🎙️ DictaFlow


DictaFlow é um aplicativo desktop de ditado por voz inteligente e minimalista. Ele ouve a sua fala, processa o áudio através de modelos avançados de Inteligência Artificial para corrigir imperfeições (gagueiras, erros de concordância, repetições) e **digita/injeta o resultado formatado diretamente no campo em que seu cursor estava ativo**.

A barra de controle flutuante possui um design moderno, translúcido (**glassmorphic dark mode**) e discreto, expandindo-se apenas sob interação e permitindo total foco no seu fluxo de trabalho.

---

## ✨ Funcionalidades principais

- **Modos de Transcrição Inteligente**:
  - **Geral**: Correção inteligente de vícios de linguagem mantendo o texto natural.
  - **E-mail**: Formatação corporativa e elegante ideal para mensagens formais.
  - **WhatsApp**: Mensagens em tom amigável e casual.
  - **Programação**: Transforma a fala em especificações estruturadas em Markdown (requisitos, comportamento esperado, critérios de aceite).
  - **Prompt IA**: Converte sua voz diretamente em instruções estruturadas otimizadas para LLMs.
- **Injeção Rápida de Texto**: Insere instantaneamente o texto gerado na janela ativa usando scripts ultra rápidos de simulação de área de transferência (VBScript).
- **Histórico Local**: Veja os ditados recentes gerados, com botões rápidos para copiar ou injetar/colar novamente.
- **Teclas de Atalho Globais**: Inicie ou finalize a gravação a qualquer momento usando `Ctrl + Win + Espaço` ou `Ctrl + Alt + D` (funciona em segundo plano).
- **Design Premium**: Interface minimalista com 4 opções de temas visuais (Neon Violet, Emerald Cyber, Ocean Blue e Monochrome).
- **Provedores de IA flexíveis**: Suporta integração direta com chaves de API do **Google Gemini (recomendado)**, **OpenAI** (Whisper + GPT) e **Groq** (Whisper + LLaMA).
- **Instância Única**: Prevenção automática de múltiplas janelas abertas simultaneamente.

---

## 🚀 Como Executar o Projeto

Se você quiser rodar o projeto localmente em modo de desenvolvimento ou empacotar o executável, siga os passos abaixo.

### Pré-requisitos
- [Node.js](https://nodejs.org/) instalado.
- Chave de API de algum provedor suportado (Gemini, OpenAI ou Groq).

### 1. Clonar o repositório
```bash
git clone https://github.com/PimentelCode/DictaFlow.git
cd DictaFlow
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Rodar em desenvolvimento
```bash
# Inicie o servidor Vite para o React
npm run dev

# (Em outro terminal) Inicie a janela do Electron
npm run electron:dev
```

### 4. Empacotar executável portable (.exe)
Para gerar o executável portable autônomo na pasta `dist-electron`:
```bash
npm run package
```

---

## 🛠️ Tecnologias Utilizadas

- **Framework Desktop**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React.js](https://react.dev/) + [Vite](https://vite.dev/)
- **Estilização**: Vanilla CSS (Design personalizado com efeitos de glassmorphism e animações wave para áudio)
- **Compilador**: [Electron Builder](https://www.electron.build/)

---

## 🔒 Privacidade e Segurança
Todas as suas chaves de API e o histórico de textos transcritos são salvos estritamente de maneira local no `localStorage` do seu computador. O aplicativo se conecta diretamente aos endpoints oficiais dos provedores escolhidos e não coleta ou envia nenhuma informação para servidores terceiros.

---
Desenvolvido com carinho para melhorar a produtividade através de comandos de voz inteligentes. 🎙️✨

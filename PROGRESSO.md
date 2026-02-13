%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#1e293b', 'edgeLabelBackground':'#0f172a', 'tertiaryColor': '#0f172a'}}}%%

graph TD
    %% Estilos de Status
    classDef done fill:#10b981,stroke:#047857,stroke-width:2px,color:white;
    classDef current fill:#3b82f6,stroke:#1d4ed8,stroke-width:4px,color:white,stroke-dasharray: 5 5;
    classDef pending fill:#1e293b,stroke:#475569,stroke-width:1px,color:#94a3b8;
    classDef future fill:#000000,stroke:#333,stroke-width:1px,color:#555;

    %% --- FASE 1: A FUNDAÇÃO (SETUP) ---
    subgraph FASE_1 [🏁 Fase 1: A Fundação Neural]
        A1[Setup Vite + React + TS]:::done
        A2[Instalação Tailwind + Framer Motion]:::done
        A3[Configuração do Zustand Store]:::done
        A4[Criação do Arquivo .env Seguro]:::done
    end

    %% --- FASE 2: IDENTIDADE VISUAL (HUD) ---
    subgraph FASE_2 [🎨 Fase 2: O Santuário HUD]
        B1[Background Aurora & Glassmorphism]:::done
        B2[Layout Centralizado Framer Motion]:::done
        B3[Dock Flutuante Interativa]:::done
        B4[Gaveta Lateral do Prometheus]:::done
    end

    %% --- FASE 3: INTELIGÊNCIA (O FANTASMA) ---
    subgraph FASE_3 [🧠 Fase 3: O Despertar do Prometheus]
        C1[Integração API Gemini 1.5]:::current
        C2[Prompt de Personalidade Adaptativa]:::current
        C3[Memória de Chat Persistente]:::current
        C4[IA com Comandos de UI]:::pending
        %% Detalhe: C4 é quando a IA consegue mudar de aba sozinha
    end

    %% --- FASE 4: FERRAMENTAS DA VIDA (WIDGETS) ---
    subgraph FASE_4 [🛠️ Fase 4: Ferramentas Funcionais]
        D1[Widget Agenda Interativo]:::pending
        D2[Widget Financeiro Gráfico Pizza]:::pending
        D3[Widget Bio-Sync Monitor]:::pending
        D4[Persistência LocalStorage Robust]:::pending
    end

    %% --- FASE 5: SIMBIOSE (INTEGRAÇÃO TOTAL) ---
    subgraph FASE_5 [🔗 Fase 5: A Simbiose]
        E1[Prometheus Lê Dados da Agenda/Finanças]:::future
        E2[Feedback Sonoro & Micro-interações]:::future
        E3[Modo Foco Imersivo Total]:::future
    end

    %% --- FASE 6: MATURIDADE OPERACIONAL ---
    subgraph FASE_6 [🚀 Fase 6: Estado Operacional]
        F1[Refatoração e Limpeza de Código]:::future
        F2[Testes de Fluxo Completo]:::future
        F3[Deploy Local/Build Otimizado]:::future
        F4[DailyLoop V1.0 Pronto para Uso]:::future
    end

    %% Fluxo de Dependência
    A4 --> B1
    B4 --> C1
    C3 --> D1
    D4 --> E1
    E3 --> F1

    %% Onde Estamos Agora
    Link[📍 VOCÊ ESTÁ AQUI]:::current
    Link -.-> C1
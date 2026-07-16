%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#1e293b', 'edgeLabelBackground':'#0f172a', 'tertiaryColor': '#0f172a'}}}%%

graph TD
    %% Estilos de Status
    classDef done fill:#10b981,stroke:#047857,stroke-width:2px,color:white;
    classDef current fill:#3b82f6,stroke:#1d4ed8,stroke-width:4px,color:white,stroke-dasharray: 5 5;
    classDef pending fill:#1e293b,stroke:#475569,stroke-width:1px,color:#94a3b8;
    classDef cut fill:#000000,stroke:#7f1d1d,stroke-width:1px,color:#555;

    %% --- FASE 1: A FUNDAÇÃO (SETUP) ---
    subgraph FASE_1 [Fase 1: A Fundacao]
        A1[Setup Vite + React + TS]:::done
        A2[Tailwind + shadcn/ui + Framer Motion]:::done
        A3[Zustand Store persistido (auth)]:::done
        A4[.env único na raiz, sem hardcode]:::done
    end

    %% --- FASE 2: IDENTIDADE VISUAL ---
    subgraph FASE_2 [Fase 2: Identidade Visual]
        B1[Redesign sóbrio com shadcn/ui]:::done
        B2[Router real (react-router-dom), sem monólito]:::done
        B3[Sidebar/dock de navegação real]:::done
        B4[Gaveta lateral do Prometheus]:::done
        B5[Estética sci-fi/NeuralHandshake removida]:::done
    end

    %% --- FASE 3: INTELIGÊNCIA (PROMETHEUS) ---
    subgraph FASE_3 [Fase 3: O Despertar do Prometheus]
        C1[Integração Gemini via google-genai SDK]:::done
        C2[Prompt de personalidade + Markdown]:::done
        C3[Memória de chat persistente (Message)]:::done
        C4[Tool-calling sobre tarefas/finanças reais]:::done
        C5[IA controla navegação de UI direto do frontend]:::cut
    end

    %% --- FASE 4: FERRAMENTAS DA VIDA ---
    subgraph FASE_4 [Fase 4: Ferramentas Funcionais]
        D1[Tarefas: categoria + prioridade + prazo]:::done
        D2[Financeiro: transações, orçamento por categoria]:::done
        D3[Financeiro: import CSV/OFX + categorização automática]:::done
        D4[Financeiro: gráficos reais (recharts) + stats mês a mês]:::done
        D5[Notas: criar, buscar, apagar]:::done
        D6[Widget Bio-Sync Monitor]:::cut
    end

    %% --- FASE 5: MULTI-USUÁRIO E OPERAÇÃO ---
    subgraph FASE_5 [Fase 5: Multi-usuario e Operacao]
        E1[Auth JWT multi-usuário + roles user/admin]:::done
        E2[Painel admin: usuários, reset de senha, logs]:::done
        E3[Reset de senha por email]:::done
        E4[Notificações: email + WhatsApp opcional]:::done
        E5[Scheduler: briefing diário + lembrete de tarefas]:::done
        E6[Landing page pública em /welcome]:::done
        E7[Verificação de telefone obrigatória no cadastro]:::cut
    end

    %% --- FASE 6: SIMBIOSE ---
    subgraph FASE_6 [Fase 6: A Simbiose]
        F1[Prometheus lê dados reais de tarefas/finanças]:::done
        F2[The Hive: comunidade/feed social]:::current
        F3[Feedback sonoro & micro-interações]:::pending
        F4[Modo foco imersivo total]:::pending
    end

    %% --- FASE 7: MATURIDADE OPERACIONAL ---
    subgraph FASE_7 [Fase 7: Estado Operacional]
        G1[Refatoração: services/routers reais, sem código morto]:::done
        G2[Docs (CLAUDE.md/PROGRESSO.md) alinhados ao código]:::done
        G3[Testes automatizados (frontend e backend)]:::pending
        G4[Deploy/build otimizado]:::pending
        G5[DailyLoop V1.0 pronto para uso]:::pending
    end

    %% Fluxo de Dependência
    A4 --> B1
    B5 --> C1
    C4 --> D1
    D4 --> E1
    E5 --> F1
    F1 --> G1

    %% Onde Estamos Agora
    Link[VOCE ESTA AQUI]:::current
    Link -.-> F2

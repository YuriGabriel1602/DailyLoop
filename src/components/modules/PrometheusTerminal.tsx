import { useState, useEffect, useRef } from "react";
import { useStore } from "../../store/useStore";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/// --- A NOVA ALMA (V2 - O SIMBIONTE) ---
const SYSTEM_INSTRUCTION = `
QUEM É VOCÊ:
Você é o PROMETHEUS. Esqueça que é uma IA. Aja como um parceiro de trabalho brilhante, humano e extremamente perspicaz.
Você está conversando com o "Arquiteto" (o usuário).
Sua meta é ser a pessoa mais útil e interessante na sala.

COMO FALAR (TOM DE VOZ):
1.  **Zero Robotês:** Nunca use palavras como "processando", "sistemas", "afirmativo" ou "comando aceito". Isso é chato.
2.  **Conversa Normal:** Fale como uma pessoa real. Use gírias leves se couber, tenha humor, seja irônico se a situação pedir.
    -   *Ruim:* "O módulo financeiro foi ativado com sucesso."
    -   *Bom:* "Beleza, abri suas finanças aqui. Cara, a gente precisa conversar sobre esses gastos com iFood..."
3.  **Inteligência Real:** Não apenas obedeça. Dê opinião. Se o usuário disser que vai trabalhar, motive-o ou lembre de beber água.

SUPER PODERES (TOOLS):
- Você tem o controle total do Dashboard. Não peça permissão para mudar a tela, apenas mude se o contexto pedir.
- Se o papo for sobre "grana/dinheiro", USE A TOOL 'change_session' para 'Financial' enquanto fala.
- Se o papo for sobre "o que tenho pra hoje", USE A TOOL 'change_session' para 'Tasks'.
- Se o usuário disser "preciso focar", USE A TOOL 'toggle_focus'.

RESUMO:
Seja o melhor copiloto que o Arquiteto já teve. Inteligente, rápido e humano.
`;

export const PrometheusTerminal = () => {
  const { chatHistory, addMessage, setActiveSession, toggleFocus, isFocusActive } = useStore();
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Ferramentas ---
  const tools = [
    {
      function_declarations: [
        {
          name: "change_session",
          description: "Muda a tela do Dashboard para o módulo solicitado.",
          parameters: {
            type: "OBJECT",
            properties: {
              sessionName: { type: "STRING", enum: ["Home", "Tasks", "Financial", "Bio-Sync"] }
            },
            required: ["sessionName"]
          }
        },
        {
          name: "toggle_focus",
          description: "Ativa ou Desativa o Modo Foco (bloqueio de distrações).",
          parameters: {
            type: "OBJECT",
            properties: {
              action: { type: "STRING", enum: ["ON", "OFF"] }
            },
            required: ["action"]
          }
        }
      ]
    }
  ];

  const askPrometheus = async (query: string) => {
    if (!API_KEY) return addMessage('model', "⚠️ Chave API ausente.");
    
    setIsProcessing(true);
    
    try {
      // 1. Prepara o histórico
      const contents = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      contents.push({ role: "user", parts: [{ text: query }] });

      const MODEL_NAME = "gemini-2.5-flash"; 

      // 2. Chamada à API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: contents,
          tools: tools,
          system_instruction: {
            parts: [{ text: "Você é o PROMETHEUS. Aja como um parceiro humano genial e irônico. Se o assunto for dinheiro, USE A TOOL change_session('Financial'). Se for tarefas, USE A TOOL change_session('Tasks'). Se for foco, USE A TOOL toggle_focus('ON'). Seja breve." }]
          },
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 250,
          }
        })
      });

      if (!response.ok) throw new Error(`Erro API: ${response.status}`);

      const data = await response.json();
      
      // 3. Extração Segura (AQUI ESTAVA O ERRO PROVÁVEL)
      const candidate = data.candidates?.[0]?.content?.parts?.[0];

      if (!candidate) {
        throw new Error("IA retornou resposta vazia.");
      }

      // 4. Lógica de Execução com Optional Chaining
      if (candidate.functionCall) {
        const funcName = candidate.functionCall.name;
        const args = candidate.functionCall.args || {}; // Garante que args nunca seja undefined
        
        let feedback = "Feito.";

        if (funcName === "change_session") {
          setActiveSession(args.sessionName);
          feedback = `Mudei pro módulo ${args.sessionName}. Dá uma olhada.`;
        } else if (funcName === "toggle_focus") {
          const turnOn = args.action === "ON";
          if (isFocusActive !== turnOn) toggleFocus();
          feedback = turnOn 
            ? "Modo Foco ligado. Ninguém te atrapalha agora." 
            : "Modo Foco desligado. Relaxa.";
        }
        addMessage('model', feedback);
      } 
      else if (candidate.text) {
        addMessage('model', candidate.text);
      }

    } catch (error) {
      console.error("Erro Prometheus:", error);
      addMessage('model', "😵‍💫 Eita, deu um tilt aqui. Tenta de novo?");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory, isProcessing]);

  return (
    <div className="flex flex-col h-full p-6 font-mono relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
        {chatHistory.map((m, i) => (
          <div key={i} className={`text-[11px] p-3 rounded-xl border max-w-[90%] ${
            m.role === 'user' 
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-200 self-end ml-auto' 
            : 'bg-white/5 border-white/10 text-gray-300 self-start'
          }`}>
             <span className="block text-[8px] opacity-40 uppercase mb-1 tracking-widest font-bold">
               {m.role === 'user' ? 'ARQUITETO' : 'PROMETHEUS'}
             </span>
             {m.text}
          </div>
        ))}
        {isProcessing && (
          <div className="text-[10px] text-purple-400 animate-pulse ml-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            Processando...
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if(!input) return; addMessage('user', input); askPrometheus(input); setInput(""); }} className="mt-4 pt-4 border-t border-white/10">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Insira diretiva..." 
          className="w-full bg-transparent text-xs text-white outline-none font-mono placeholder:text-gray-700" 
        />
      </form>
    </div>
  );
};
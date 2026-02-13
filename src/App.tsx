import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./App.css";
import NeuralHandshake from "./components/NeuralHandshake";
import { Dashboard } from "./components/Dashboard";

function App() {
  // Estado que controla se o usuário já fez o "login" neural
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Função que será chamada quando o NeuralHandshake terminar
  const handleHandshakeComplete = () => {
    console.log("Sincronização Neural Completa. Entrando no Dashboard...");
    setIsAuthenticated(true);
  };

  return (
    // O contêiner principal do aplicativo
    <div className="h-screen w-screen overflow-hidden bg-[#050505] text-white selection:bg-blue-500/30">
      
      {/* AnimatePresence gerencia as animações de entrada e saída dos componentes */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          // 1. TELA DE ENTRADA (O Aperto de Mão Neural)
          // O usuário precisa interagir aqui para passar.
          <NeuralHandshake key="login" onComplete={handleHandshakeComplete} />
        ) : (
          // 2. O DASHBOARD (Aparece após o login)
          <motion.div
            key="dashboard"
            // Animação de entrada do Dashboard: começa transparente, menor e desfocado
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            // Animação final: totalmente visível, tamanho normal e focado
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            // Duração e tipo de animação (suave e cinematográfica)
            transition={{ duration: 1.2, ease: "circOut" }}
            className="relative w-full h-full"
          >
            {/* Fundo Aurora (Ativo no Dashboard para dar profundidade) */}
            <div className="aurora-bg">
              <div className="aurora-orb-1" />
              <div className="aurora-orb-2" />
            </div>
            
            {/* AQUI ESTÁ ELE: O Grid Holográfico com seus módulos */}
            <Dashboard /> 
            
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
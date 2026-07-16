import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import NeuralHandshake from "./components/NeuralHandshake";
import { Dashboard } from "./components/Dashboard"; // <-- AQUI É QUE ELE CHAMA O DASHBOARD!

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleHandshakeComplete = () => {
    setIsAuthenticated(true);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050505] text-white selection:bg-blue-500/30">
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <NeuralHandshake key="login" onComplete={handleHandshakeComplete} />
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full h-full"
          >
            {/* Isto renderiza o seu ficheiro Dashboard.tsx! */}
            <Dashboard /> 
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
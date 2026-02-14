import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, 
  Calendar, 
  CreditCard, 
  Settings, 
  User, 
  Zap,
  Terminal,
  LogOut 
} from 'lucide-react';

// Estilos básicos (Você pode mover para seu CSS/Tailwind depois)
// A ideia é criar um visual "flutuante" e escuro
const overlayStyle = {
  position: 'fixed' as 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)',
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const CommandMenu = () => {
  const [open, setOpen] = useState(false);

  // Escuta o atalho Ctrl+K ou Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Simulação de ações (Aqui entra a conexão com Rust/Tauri depois)
  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <AnimatePresence>
      {open && (
        <div style={overlayStyle} onClick={() => setOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => e.stopPropagation()} // Impede fechar ao clicar dentro
            className="w-[600px] max-w-[90vw] bg-[#0f0f11] border border-[#2d2d30] rounded-xl shadow-2xl overflow-hidden"
          >
            <Command className="w-full text-white font-sans" loop>
              
              {/* Barra de Busca */}
              <div className="flex items-center border-b border-[#2d2d30] px-4 py-3">
                <Terminal size={18} className="text-gray-500 mr-3" />
                <Command.Input 
                  placeholder="O que você precisa fazer, Arquiteto?" 
                  className="w-full bg-transparent outline-none text-lg text-white placeholder-gray-600 font-light"
                />
              </div>

              {/* Lista de Comandos */}
              <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-hide">
                <Command.Empty className="p-4 text-center text-gray-500 text-sm">
                  Nenhum comando encontrado.
                </Command.Empty>

                <Command.Group heading="DailyLoop OS" className="text-xs text-gray-500 font-bold mb-2 px-2 uppercase tracking-wider">
                  
                  <Command.Item 
                    className="flex items-center px-2 py-3 rounded-lg hover:bg-[#1a1a1d] cursor-pointer text-gray-300 aria-selected:bg-[#252529] aria-selected:text-white transition-colors"
                    onSelect={() => runCommand(() => console.log('Ativar Modo Foco'))}
                  >
                    <Zap size={16} className="mr-3 text-yellow-500" />
                    <span>Ativar Hiperfoco (Deep Work)</span>
                    <span className="ml-auto text-xs text-gray-600 bg-[#1a1a1d] px-2 py-0.5 rounded border border-[#2d2d30]">F1</span>
                  </Command.Item>

                  <Command.Item 
                    className="flex items-center px-2 py-3 rounded-lg hover:bg-[#1a1a1d] cursor-pointer text-gray-300 aria-selected:bg-[#252529] aria-selected:text-white transition-colors"
                    onSelect={() => runCommand(() => console.log('Abrir Finanças'))}
                  >
                    <CreditCard size={16} className="mr-3 text-green-500" />
                    <span>Registrar novo gasto</span>
                  </Command.Item>

                   <Command.Item 
                    className="flex items-center px-2 py-3 rounded-lg hover:bg-[#1a1a1d] cursor-pointer text-gray-300 aria-selected:bg-[#252529] aria-selected:text-white transition-colors"
                    onSelect={() => runCommand(() => console.log('Abrir Prometheus'))}
                  >
                    <Terminal size={16} className="mr-3 text-purple-500" />
                    <span>Conversar com Prometheus</span>
                  </Command.Item>
                </Command.Group>

                <Command.Separator className="h-px bg-[#2d2d30] my-2" />

                <Command.Group heading="Sistema" className="text-xs text-gray-500 font-bold mb-2 px-2 uppercase tracking-wider">
                  <Command.Item className="flex items-center px-2 py-3 rounded-lg hover:bg-[#1a1a1d] cursor-pointer text-gray-300 aria-selected:bg-[#252529] aria-selected:text-white transition-colors">
                    <Settings size={16} className="mr-3" />
                    <span>Configurações</span>
                  </Command.Item>
                  <Command.Item className="flex items-center px-2 py-3 rounded-lg hover:bg-[#1a1a1d] cursor-pointer text-gray-300 aria-selected:bg-[#252529] aria-selected:text-white transition-colors">
                    <LogOut size={16} className="mr-3" />
                    <span>Sair do DailyLoop</span>
                  </Command.Item>
                </Command.Group>

              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usado pelos chats com anexo de imagem (Inbox e WhatsApp Pessoal) — devolve só a
// parte base64 do data URL, sem o prefixo "data:image/png;base64,".
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

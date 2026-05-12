"use client";

import React, { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface ExtratoItem {
  id?: string;
  descricao: string;
  valor: number;
  tipo: string;
  data: string;
  categoria: string;
  status?: string;
}

interface ExtratoQueueContextData {
  uploadExtrato: (file: File) => Promise<void>;
  previewItems: ExtratoItem[] | null;
  setPreviewItems: (items: ExtratoItem[] | null) => void;
  isUploading: boolean;
}

const ExtratoQueueContext = createContext<ExtratoQueueContextData>({} as ExtratoQueueContextData);

export function ExtratoQueueProvider({ children }: { children: React.ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewItems, setPreviewItems] = useState<ExtratoItem[] | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const uploadExtrato = async (file: File) => {
    
    // FAST PATH: Se for um JSON do Claude, processa localmente instantaneamente!
    if (file.type === "application/json" || file.name.endsWith(".json")) {
       try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) throw new Error("O JSON precisa ser um Array.");
          
          setPreviewItems(parsed);
          
          if (pathname !== '/dashboard/extratos') {
             toast((t) => (
               <span className="flex items-center gap-2 cursor-pointer" onClick={() => {toast.dismiss(t.id); router.push('/dashboard/extratos');}}>
                 Extração de {parsed.length} itens via JSON finalizada! <b>Clique para revisar</b>.
               </span>
             ), { duration: 10000 });
          } else {
             toast.success(`Leitura JSON completa: ${parsed.length} transações prontas para revisão!`);
          }
       } catch (err: any) {
          toast.error("Erro ao tentar ler o arquivo JSON fornecido: " + err.message);
       }
       return; // Não envia pra API, encerra aqui.
    }

    setIsUploading(true);
    
    try {
      // 1. Obter a chave com segurança da sessão autenticada (bypassa limite da Vercel)
      const keyRes = await fetch('/api/get-gemini-key');
      const { key } = await keyRes.json();
      if (!key) throw new Error("Chave do Gemini não configurada no servidor.");

      // 2. Converter o arquivo para Base64 diretamente no navegador (suporta arquivos enormes)
      const buffer = await file.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);

      // 3. Prompt de extração
      const systemPrompt = `Você é um especialista financeiro focado na extração de dados de Extratos Bancários e Notas Fiscais (NFe, NFCe, Cupons Fiscais).
Sua missão é extrair TODAS as transações de um comprovante, PDF ou imagem para um JSON ARRAY.

Instruções cruciais de Extração:
1. IDENTIFICAÇÃO DO DOCUMENTO: Se for um Extrato, extraia as transações linha a linha. Se for uma Nota Fiscal/Cupom, extraia como uma única transação (ou item a item se fizer sentido), representando o local da compra.
2. SINAL E TIPO: 
   - No Extrato: Valores negativos (-) ou em cor vermelha SÃO SAÍDAS (despesas). Valores sem sinal ou verdes SÃO ENTRADAS (receitas).
   - Na Nota Fiscal (Compra do usuário): O valor total gasto deve ser classificado como "Saída", pois representa uma despesa.
3. LIMPEZA DE NOME: Ignore lixos bancários como "PIX TRANSF", "PAY ", "PAG BOLETO", "QRS", "DEV PIX". Se for uma Nota Fiscal, a descrição deve ser o nome do estabelecimento (ex: "Supermercado Pão de Açúcar", "Posto Ipiranga") ou o item principal.
4. DATAS: Em extratos com datas curtas (ex: 06/04), infira o ano base da imagem. Na Nota Fiscal, busque a Data de Emissão.

Retorne EXATAMENTE UM ARRAY JSON onde cada objeto tenha:
[
  {
    "descricao": "O recebedor limpo ou nome do local da nota. Max 3 a 5 palavras.",
    "valor": 150.50, // APENAS O NUMERO POSITIVO. (Se era -100 no documento, retorne 100).
    "tipo": "Saída", // 'Saída' para débitos, pagamentos, faturas, notas fiscais de compra. 'Entrada' para créditos, recebimentos.
    "data": "2026-04-06", // Formato YYYY-MM-DD.
    "categoria": "Alimentação" // Deduza: 'Alimentação' (OXXO, iFood, Mercado), 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Cartões', 'Transferências' ou 'Outros'.
  }
]

Atenção máxima em retornar APENAS O ARRAY JSON válido, nenhuma palavra a mais. Se não encontrar dados retorne [].`;

      const payload = {
        contents: [{
            role: "user",
            parts: [
                { text: systemPrompt },
                { inlineData: { mimeType: file.type || 'image/jpeg', data: base64Data } }
            ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      };

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
      
      // 4. Chamada Direta via Browser (SEM TIMEOUT DA VERCEL)
      const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
         throw new Error(responseData.error?.message || 'Falha de comunicação com a IA Google.');
      }

      const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      let aiData = [];
      try {
         aiData = JSON.parse(responseText);
      } catch (err) {
         throw new Error("A IA não retornou um formato válido.");
      }
      
      if (!Array.isArray(aiData) || aiData.length === 0) {
         toast.error("Nenhuma transação encontrada no arquivo.");
         return;
      }

      setPreviewItems(aiData);
      
      if (pathname !== '/dashboard/extratos') {
         toast((t) => (
           <span className="flex items-center gap-2 cursor-pointer" onClick={() => {toast.dismiss(t.id); router.push('/dashboard/extratos');}}>
             Extrato de {aiData.length} itens finalizado! <b>Clique para ir até a aba revisar</b>.
           </span>
         ), { duration: 10000 });
      } else {
         toast.success(`${aiData.length} transações prontas para revisão!`);
      }
      
    } catch (err: any) {
      toast.error(`Erro no extrato: ${err.message}`, { duration: 6000 });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ExtratoQueueContext.Provider value={{ uploadExtrato, previewItems, setPreviewItems, isUploading }}>
      {children}
      
      {/* Widget Global Visível em todas as telas */}
      {isUploading && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999999] flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="bg-[#0f172a] border border-violet-500/30 shadow-[0_0_50px_rgba(147,51,234,0.2)] p-10 rounded-3xl flex flex-col items-center gap-6 max-w-md text-center mx-4">
             <div className="relative">
               <div className="absolute inset-0 bg-violet-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
               <Loader2 className="w-16 h-16 text-violet-400 animate-spin relative z-10" />
             </div>
             <div>
               <h2 className="text-xl font-black text-slate-100 tracking-tight">Lendo Extrato (IA)</h2>
               <p className="text-sm text-slate-400 mt-3 font-medium leading-relaxed">
                 Estamos analisando cada transação do seu documento. Por favor, <b>não feche nem atualize esta aba</b>. 
                 <br/><br/>
                 Dependendo do tamanho do arquivo (ex: 30 dias), isso pode demorar um pouquinho!
               </p>
             </div>
           </div>
         </div>
      )}
    </ExtratoQueueContext.Provider>
  );
}

export const useExtratoQueue = () => useContext(ExtratoQueueContext);

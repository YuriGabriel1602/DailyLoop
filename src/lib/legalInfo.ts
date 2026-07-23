// Dados legais do responsável pelo DailyLoop, usados no rodapé, na Política de
// Privacidade e nos Termos de Uso. Fonte única — mude só aqui.
//
// PENDENTE: cidade/UF/CEP e telefone de contato ainda não foram informados.
// Preencha antes de publicar o site, pois o Meta cruza o endereço declarado
// aqui com o que consta no registro do CNPJ na verificação do Business Manager.
export const LEGAL_INFO = {
  razaoSocial: "66.280.709 YURI GABRIEL GONZAGA CARRAO",
  nomeFantasia: "DailyLoop",
  cnpj: "66.280.709/0001-04",
  endereco: {
    logradouro: "Rua Laranjeiras",
    complemento: "",
    cidade: "", // TODO: preencher
    uf: "", // TODO: preencher
    cep: "", // TODO: preencher
  },
  telefone: "", // TODO: preencher
  emailContato: "contato@dailyloop.com.br", // TODO: confirmar que essa caixa existe/redireciona antes de publicar
  dominio: "dailyloop.com.br",
} as const;

export function enderecoCompleto(): string {
  const { logradouro, complemento, cidade, uf, cep } = LEGAL_INFO.endereco;
  const partes = [logradouro, complemento, [cidade, uf].filter(Boolean).join("/"), cep];
  return partes.filter(Boolean).join(" — ");
}

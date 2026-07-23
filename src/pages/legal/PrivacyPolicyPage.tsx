import { LEGAL_INFO, enderecoCompleto } from "@/lib/legalInfo";
import { LegalLayout, LegalSection } from "./LegalLayout";

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Política de Privacidade" updatedAt="22 de julho de 2026">
      <p className="text-muted-foreground">
        Esta Política de Privacidade descreve como o <strong className="text-foreground">DailyLoop</strong>{" "}
        coleta, usa, compartilha e protege os dados pessoais dos usuários da plataforma, em conformidade
        com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).
      </p>

      <LegalSection id="controlador" title="1. Quem é o controlador dos dados">
        <p>
          O controlador dos dados tratados pelo DailyLoop é:
        </p>
        <ul>
          <li><strong>Razão social:</strong> {LEGAL_INFO.razaoSocial}</li>
          <li><strong>CNPJ:</strong> {LEGAL_INFO.cnpj}</li>
          <li><strong>Endereço:</strong> {enderecoCompleto()}</li>
          <li><strong>Contato (encarregado/DPO):</strong> <a href={`mailto:${LEGAL_INFO.emailContato}`}>{LEGAL_INFO.emailContato}</a></li>
        </ul>
      </LegalSection>

      <LegalSection id="dados-coletados" title="2. Quais dados coletamos">
        <p>
          O DailyLoop separa seus dados em dois ambientes — <strong>Pessoal</strong> e <strong>Empresarial</strong> —
          que não se misturam entre si, inclusive no histórico de conversas com a IA. Coletamos apenas o
          necessário para o funcionamento de cada parte:
        </p>
        <ul>
          <li><strong>Cadastro:</strong> nome de usuário, email e senha (armazenada com hash, nunca em texto puro).</li>
          <li><strong>Lado Pessoal:</strong> tarefas, notas, transações financeiras e orçamentos, extratos bancários (CSV/OFX) importados manualmente, entradas de Diário (incluindo o conteúdo que você escreve e a reflexão gerada pela IA), pessoas cadastradas em "Pessoas" (nome, tipo de relação, data importante, última vez que vocês se falaram), rituais/hábitos e metas.</li>
          <li><strong>Lado Empresarial:</strong> contatos e leads do CRM (nome, telefone, canal, estágio do funil), conteúdo das conversas do Inbox trocadas com esses contatos via WhatsApp/Instagram/Facebook, e o log de atividades do sistema (Logs).</li>
          <li><strong>Integrações conectadas:</strong> tokens de acesso — armazenados de forma criptografada — de Meta (WhatsApp, Instagram, Facebook), Google (Calendar, Gmail, Fit), GitHub, OpenAI e Anthropic, conforme você conectar cada uma nas telas de Integrações.</li>
          <li><strong>Google, quando conectado:</strong> eventos do Calendar, metadados/conteúdo de emails recentes (Gmail) e resumo diário de atividade física (Fit), usados apenas para exibição na Agenda.</li>
          <li><strong>Conversas com o Prometheus (IA):</strong> as mensagens trocadas com o assistente em cada lado, incluindo o histórico recente usado como contexto — mantidas separadas por ambiente.</li>
          <li><strong>Dados técnicos:</strong> registros de acesso e logs do servidor, para segurança e diagnóstico.</li>
        </ul>
        <p>
          Não coletamos dados sensíveis (origem racial, saúde, biometria, etc.) intencionalmente. Entradas de
          Diário podem conter relatos pessoais sensíveis por natureza do próprio conteúdo que você escolhe
          escrever — tratamos esse conteúdo com o mesmo nível de proteção dos demais dados, sem análise
          além da reflexão gerada pela IA a seu pedido.
        </p>
      </LegalSection>

      <LegalSection id="finalidade" title="3. Para que usamos seus dados">
        <ul>
          <li>Criar e manter sua conta, autenticar login e manter sua sessão (execução de contrato).</li>
          <li>Organizar e exibir suas tarefas, finanças, notas e o restante do ecossistema Pessoal (Áreas da Vida, Pessoas, Diário, Rituais, Bússola, Agenda).</li>
          <li>Operar o CRM e o Inbox do lado Empresarial, incluindo a resposta automática de leads pela IA quando você ativa esse recurso numa conversa.</li>
          <li>Gerar respostas do Prometheus (assistente de IA) com base no seu histórico e nos dados de cada ambiente, sem cruzar Pessoal com Empresarial.</li>
          <li>Enviar avisos operacionais — redefinição de senha, lembrete de tarefa, briefing diário, alerta de orçamento — por email e, se você ativar, por WhatsApp.</li>
          <li>Categorizar automaticamente transações importadas, por meio de um classificador que roda inteiramente no nosso servidor.</li>
          <li>Registrar o log de atividades ("Logs"), visível só no lado Empresarial, como painel de controle do que acontece na sua conta.</li>
          <li>Prevenir fraude, abuso e garantir a segurança da plataforma (legítimo interesse).</li>
        </ul>
        <p>Não usamos seus dados para publicidade, não vendemos dados a terceiros e não fazemos perfilamento para fins comerciais.</p>
      </LegalSection>

      <LegalSection id="compartilhamento" title="4. Com quem compartilhamos dados">
        <p>Só compartilhamos dados com os operadores estritamente necessários para o funcionamento do serviço, e apenas das integrações que você conectar:</p>
        <ul>
          <li><strong>Google (Gemini API), OpenAI ou Anthropic:</strong> recebem o conteúdo das suas conversas com o Prometheus e os dados consultados durante a conversa, conforme o motor de IA escolhido em cada lado, para gerar a resposta.</li>
          <li><strong>Meta (WhatsApp Business Cloud API, Instagram e Facebook Messaging):</strong> no lado Pessoal, recebe seu número de telefone e o conteúdo dos templates de notificação, se você ativar o canal de WhatsApp; no lado Empresarial, troca as mensagens do Inbox com seus contatos/leads pelos canais que você conectar.</li>
          <li><strong>Google (OAuth Calendar/Gmail/Fit):</strong> recebe autorização de acesso somente-leitura aos escopos que você conceder, para exibir seus eventos, emails e atividade física na Agenda.</li>
          <li><strong>GitHub:</strong> recebe seu token pessoal de acesso para listar seus repositórios na tela de Integrações.</li>
          <li><strong>Provedor de email (SMTP):</strong> recebe seu email e o conteúdo das notificações transacionais para entrega.</li>
        </ul>
        <p>
          Esses provedores podem processar dados em servidores fora do Brasil. Nesses casos, a transferência
          segue as garantias exigidas pelo Art. 33 da LGPD. Não compartilhamos dados com nenhum outro terceiro,
          nem para fins de marketing.
        </p>
        <p>
          Quando você usa o CRM/Inbox para atender seus próprios leads, o DailyLoop trata os dados desses
          contatos como <strong>operador</strong>, a seu pedido — você é o controlador responsável por ter base
          legal para tratar os dados dos seus próprios clientes/leads.
        </p>
      </LegalSection>

      <LegalSection id="armazenamento" title="5. Armazenamento e segurança">
        <ul>
          <li>Senhas são armazenadas com hash (nunca em texto puro) e a autenticação usa token JWT com expiração.</li>
          <li>O acesso aos seus dados dentro do produto é isolado por conta — nenhum outro usuário enxerga suas tarefas, finanças ou notas.</li>
          <li>Adotamos medidas técnicas e administrativas razoáveis para proteger os dados contra acesso não autorizado, perda ou alteração.</li>
        </ul>
      </LegalSection>

      <LegalSection id="retencao" title="6. Por quanto tempo guardamos seus dados">
        <p>
          Mantemos seus dados enquanto sua conta estiver ativa. Se você solicitar a exclusão da conta, os
          dados pessoais são removidos ou anonimizados em prazo razoável, salvo quando a retenção for exigida
          por obrigação legal.
        </p>
      </LegalSection>

      <LegalSection id="direitos" title="7. Seus direitos como titular">
        <p>Nos termos do Art. 18 da LGPD, você pode solicitar a qualquer momento:</p>
        <ul>
          <li>Confirmação da existência de tratamento e acesso aos seus dados.</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei.</li>
          <li>Portabilidade dos dados a outro fornecedor de serviço.</li>
          <li>Eliminação dos dados tratados com base no seu consentimento.</li>
          <li>Informação sobre com quem seus dados foram compartilhados.</li>
          <li>Revogação do consentimento, a qualquer momento — por exemplo, desativando o canal de WhatsApp nas Configurações.</li>
        </ul>
        <p>
          Para exercer qualquer um desses direitos, entre em contato pelo email{" "}
          <a href={`mailto:${LEGAL_INFO.emailContato}`}>{LEGAL_INFO.emailContato}</a>. Se a solicitação for
          sobre dados de um contato/lead cadastrado por outro usuário no CRM, encaminhamos o pedido ao
          responsável por aquela conta, que é o controlador desses dados.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="8. Cookies e armazenamento local">
        <p>
          O DailyLoop não usa cookies de rastreamento de terceiros. A sessão de login é mantida por meio de
          armazenamento local do navegador (<code>localStorage</code>), apenas no seu próprio dispositivo, e é
          removida quando você faz logout.
        </p>
      </LegalSection>

      <LegalSection id="criancas" title="9. Uso por menores">
        <p>
          O DailyLoop não é direcionado a menores de 18 anos e não coleta intencionalmente dados de crianças
          ou adolescentes.
        </p>
      </LegalSection>

      <LegalSection id="alteracoes" title="10. Alterações desta política">
        <p>
          Podemos atualizar esta Política de Privacidade periodicamente. Alterações relevantes serão
          comunicadas por email ou por aviso dentro do próprio app antes de entrarem em vigor.
        </p>
      </LegalSection>

      <LegalSection id="contato" title="11. Contato">
        <p>
          Dúvidas, solicitações ou reclamações sobre o tratamento de dados podem ser enviadas para{" "}
          <a href={`mailto:${LEGAL_INFO.emailContato}`}>{LEGAL_INFO.emailContato}</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

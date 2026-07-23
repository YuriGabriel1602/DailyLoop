import { LEGAL_INFO, enderecoCompleto } from "@/lib/legalInfo";
import { LegalLayout, LegalSection } from "./LegalLayout";

export default function TermsOfServicePage() {
  return (
    <LegalLayout title="Termos de Uso" updatedAt="22 de julho de 2026">
      <p className="text-muted-foreground">
        Estes Termos de Uso regem o acesso e o uso do DailyLoop, produto de titularidade de{" "}
        <strong className="text-foreground">{LEGAL_INFO.razaoSocial}</strong>, inscrita no CNPJ sob o nº{" "}
        {LEGAL_INFO.cnpj}, com sede em {enderecoCompleto()} ("DailyLoop", "nós"). Ao criar uma conta ou usar
        o serviço, você concorda com estes Termos e com a nossa{" "}
        <a href="/privacidade">Política de Privacidade</a>.
      </p>

      <LegalSection id="descricao" title="1. Descrição do serviço">
        <p>
          O DailyLoop é dividido em dois ambientes dentro da mesma conta — <strong>Pessoal</strong> e{" "}
          <strong>Empresarial</strong> — com dados, histórico de IA e navegação completamente separados entre si:
        </p>
        <ul>
          <li>
            <strong>Pessoal:</strong> tarefas, controle financeiro, notas, Áreas da Vida, Pessoas (agenda de
            relacionamentos), Diário, Rituais, Bússola de Metas e Agenda (quando você conecta sua conta Google).
          </li>
          <li>
            <strong>Empresarial:</strong> CRM (pipeline de leads), Inbox omnichannel (WhatsApp, Instagram e
            Facebook), resposta automática por IA às suas conversas, integração com GitHub e um log de
            atividades ("Logs") do que acontece nos dois ambientes.
          </li>
        </ul>
        <p>
          Ambos os ambientes contam com o Prometheus, assistente de IA com tom e contexto próprios para cada
          lado, sem cruzar informação entre eles. Notificações operacionais chegam por email; WhatsApp é um
          canal opcional. Atualmente o serviço é oferecido gratuitamente.
        </p>
      </LegalSection>

      <LegalSection id="cadastro" title="2. Cadastro e conta">
        <ul>
          <li>Você precisa fornecer um email válido e informações verdadeiras no cadastro.</li>
          <li>Você é responsável por manter sua senha em sigilo e por toda atividade realizada na sua conta.</li>
          <li>Cada conta é individual e isolada — os dados de um usuário não são visíveis a outros usuários.</li>
          <li>Avise-nos imediatamente em caso de uso não autorizado da sua conta.</li>
        </ul>
      </LegalSection>

      <LegalSection id="uso-aceitavel" title="3. Uso aceitável">
        <p>Ao usar o DailyLoop, você concorda em não:</p>
        <ul>
          <li>Usar o serviço para fins ilícitos ou que violem direitos de terceiros.</li>
          <li>Tentar acessar dados de outros usuários ou contornar mecanismos de autenticação.</li>
          <li>Fazer engenharia reversa, sobrecarregar ou interferir na operação normal da plataforma.</li>
          <li>Enviar conteúdo malicioso, spam ou que infrinja leis aplicáveis.</li>
        </ul>
      </LegalSection>

      <LegalSection id="ia" title="4. Assistente de IA (Prometheus)">
        <p>
          O Prometheus responde com base nos seus próprios dados — tarefas, finanças, rituais e metas do lado
          Pessoal; funil de CRM e conversas do Inbox do lado Empresarial. Você pode escolher qual motor de IA
          processa cada lado (Gemini, OpenAI ou Anthropic) nas Configurações, usando sua própria chave de API
          quando aplicável. As respostas são geradas automaticamente e podem conter imprecisões — o
          Prometheus não substitui aconselhamento financeiro, contábil, jurídico ou profissional de qualquer
          natureza, nem no lado Pessoal nem no Empresarial. Decisões tomadas com base nas respostas do
          assistente são de responsabilidade exclusiva do usuário.
        </p>
      </LegalSection>

      <LegalSection id="integracoes" title="5. Conexão de contas e integrações de terceiros">
        <p>
          O DailyLoop permite conectar contas de terceiros — Meta (WhatsApp Business, Instagram, Facebook),
          Google (Calendar, Gmail, Fit), GitHub, OpenAI e Anthropic. Ao conectar qualquer uma delas, você
          declara ter os direitos necessários sobre a conta conectada e concorda em cumprir também os termos
          de uso de cada provedor. O DailyLoop apenas processa e exibe os dados que essas integrações
          disponibilizam; não temos controle sobre a disponibilidade, política ou alterações desses serviços
          de terceiros. Você pode desconectar qualquer integração a qualquer momento nas telas de Integrações.
        </p>
        <p>
          No CRM e no Inbox, os contatos e leads cadastrados são <strong>dados de terceiros</strong> (seus
          próprios clientes/contatos) que você insere ou recebe via integração. Nessa relação, você é o
          responsável (controlador) pelo tratamento desses dados perante seus contatos, e o DailyLoop atua
          como operador, processando-os apenas para viabilizar o CRM, o Inbox e a resposta automática de IA
          que você configurar.
        </p>
      </LegalSection>

      <LegalSection id="notificacoes" title="6. Notificações e WhatsApp">
        <p>
          Notificações por email fazem parte do funcionamento padrão do serviço. O canal de WhatsApp pessoal
          é opcional: só enviamos mensagens depois que você verifica seu número e ativa esse canal
          explicitamente nas Configurações, podendo desativá-lo a qualquer momento. O WhatsApp Business
          usado pelo Inbox/CRM do lado Empresarial depende da sua própria conexão com a Meta, feita em
          Integrações.
        </p>
      </LegalSection>

      <LegalSection id="propriedade" title="7. Propriedade intelectual">
        <p>
          O DailyLoop, sua marca, design e código-fonte são de propriedade de {LEGAL_INFO.razaoSocial} ou de
          seus licenciantes. O conteúdo que você cria dentro do app (tarefas, notas, transações, contatos de
          CRM, entradas de diário) continua sendo seu — nós apenas o processamos para fornecer o serviço.
        </p>
      </LegalSection>

      <LegalSection id="disponibilidade" title="8. Disponibilidade e limitação de responsabilidade">
        <p>
          O serviço é fornecido "como está", sem garantia de disponibilidade ininterrupta. Fazemos esforços
          razoáveis para manter a plataforma no ar e os dados íntegros, mas não nos responsabilizamos por
          perdas decorrentes de indisponibilidade temporária, falhas de terceiros (como Meta, Google,
          provedores de IA ou email) ou uso indevido da conta pelo próprio usuário.
        </p>
      </LegalSection>

      <LegalSection id="cancelamento" title="9. Cancelamento e encerramento de conta">
        <p>
          Você pode encerrar sua conta a qualquer momento entrando em contato pelo email{" "}
          <a href={`mailto:${LEGAL_INFO.emailContato}`}>{LEGAL_INFO.emailContato}</a>. Podemos suspender ou
          encerrar contas que violem estes Termos, mediante aviso sempre que possível.
        </p>
      </LegalSection>

      <LegalSection id="alteracoes" title="10. Alterações destes Termos">
        <p>
          Podemos atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas por email
          ou por aviso dentro do app antes de entrarem em vigor. O uso continuado do serviço após a
          atualização representa concordância com os novos Termos.
        </p>
      </LegalSection>

      <LegalSection id="legislacao" title="11. Legislação aplicável">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil, incluindo a Lei Geral de
          Proteção de Dados Pessoais (Lei nº 13.709/2018). Fica eleito o foro do domicílio do usuário para
          dirimir eventuais controvérsias, conforme aplicável ao consumidor.
        </p>
      </LegalSection>

      <LegalSection id="contato" title="12. Contato">
        <p>
          Dúvidas sobre estes Termos podem ser enviadas para{" "}
          <a href={`mailto:${LEGAL_INFO.emailContato}`}>{LEGAL_INFO.emailContato}</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

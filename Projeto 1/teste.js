// Tenta acessar messages[0]
const messages = $json.messages || $json.body?.messages || [];
const message = Array.isArray(messages) ? messages[0] : null;

if (!message) {
  return [{
    error: "messages[0] não encontrado",
    jsonRecebido: $json // retorna o json pra debug
  }];
}

// created_at pode vir como número ou string
const createdAtRaw = message.created_at;
if (!createdAtRaw) {
  return [{
    error: "Campo created_at não encontrado em messages[0]",
    message
  }];
}

// Se for número (timestamp em segundos), multiplica por 1000
const timestamp = typeof createdAtRaw === "number" 
  ? createdAtRaw * 1000 
  : Date.parse(createdAtRaw);

const date = new Date(timestamp);

// UTC
const utcHour = date.getUTCHours();
const utcMinute = date.getUTCMinutes();
const utcDay = date.getUTCDay();

// Converte para horário de Brasília (UTC-3)
let brasiliaHour = utcHour - 3;
let brasiliaMinute = utcMinute;
let brasiliaDay = utcDay;

// passou da meia-noite
if (brasiliaHour < 0) {
  brasiliaHour += 24;
  brasiliaDay = (brasiliaDay === 0) ? 6 : brasiliaDay - 1;
}

// horário útil
let dentroHorario = false;
if (brasiliaDay >= 1 && brasiliaDay <= 5) {
  if (
    (brasiliaHour > 8 && brasiliaHour < 17) ||
    (brasiliaHour === 8 && brasiliaMinute >= 0) ||
    (brasiliaHour === 17 && brasiliaMinute <= 30)
  ) {
    dentroHorario = true;
  }
}

// conversationId várias fontes
const conversationId = 
  $json.conversation?.id || 
  message.conversation_id || 
  null;

return [{
  dentroHorario,
  createdAtRaw,
  utcTime: `${String(utcHour).padStart(2, '0')}:${String(utcMinute).padStart(2, '0')}`,
  brasiliaTime: `${String(brasiliaHour).padStart(2, '0')}:${String(brasiliaMinute).padStart(2, '0')}`,
  brasiliaDay,
  conversationId,
  url: `https://chat.azship.com.br/api/v1/accounts/1/conversations/${conversationId}/assignments`
}];

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

// Gera um ID único para a sessão do usuário (ex: UUID simples)
let sessionId = localStorage.getItem("chatSessionId");
if (!sessionId) {
    sessionId = 'session-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    localStorage.setItem("chatSessionId", sessionId);
}

// Saudação inicial
addMessage("Olá! Eu sou o AZ_BOT, em que posso te ajudar hoje?", "bot");

// Função para adicionar mensagens no chat
function addMessage(text, sender) {
    const msg = document.createElement('div');
    msg.classList.add('message', sender);
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Função para enviar mensagem ao webhook do n8n
async function sendMessageToWebhook(message) {
    try {
        const response = await fetch('https://n8n.azship.com.br/webhook/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, sessionId })
        });

        const data = await response.json(); // data é um array
        const reply = data.reply || "Desculpe, não consegui responder."; // acessa o primeiro item
        addMessage(reply, 'bot');

    } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
        addMessage("Ops! Não consegui responder. Tente novamente.", 'bot');
    }
}


// Eventos de envio
chatSend.addEventListener('click', () => {
    const text = chatInput.value.trim();
    if(text === "") return;
    addMessage(text, 'user');
    sendMessageToWebhook(text);
    chatInput.value = "";
});

chatInput.addEventListener('keypress', (e) => {
    if(e.key === "Enter") chatSend.click();
});

const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const statusMsg = document.getElementById("statusMsg");
const downloadBtn = document.getElementById("downloadBtn");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusMsg.innerText = "Enviando e processando...";
    downloadBtn.disabled = true;

    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("http://127.0.0.1:8000/avaliar-planilha/", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
        }

        const blob = await response.blob();
        const textData = await blob.text();

        Papa.parse(textData, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                const data = results.data;
                atualizarDashboard(data);

                // Habilitar download
                downloadBtn.disabled = false;
                downloadBtn.onclick = () => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "conversas_classificadas.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                };

                statusMsg.innerText = "✅​✅​✅​Processamento concluído!✅​✅​✅​";
            }
        });

    } catch (error) {
        console.error(error);
        statusMsg.innerText = "❌❌❌Erro no envio ou processamento.❌❌❌";
    }
});

function processarPalavrasFrequentes(mensagens) {
    // 1. Defina as palavras a serem ignoradas (stop words)
    // Adicione mais palavras conforme a necessidade
    const stopWords = new Set([
        'para', 'mais', 'ajudar', 'ajudo', 'posso', 'você', 'aqui', 'algo', 'como', 'esta', 'esse', 'está', 'certo', 'dayane', 'essa', 'isso', 'mesmo', 'precisando', 'momento', 'estamos', 'nosso', 'nada', 'nome', 'muito', 'caso', 'pode', 'seja', 'chamar', 'qual', 'precisa', 'novamente', 'vindo', 'estou', 'tenha', 'favor', 'ajuda', 'eles', 'tarde', 'ainda', 'então', 'consegue', 'chamo', 'time', 'agora', 'tudo', 'alguma', 'entendi', 'quando', 'faço', 'fazer', 'coisa', 'nesse', 'nessa', 'assim', 'parte', 'samuel', 'visto', 'preocupe'
    ]);

    // Juntar todas as mensagens em uma única string
    const textoCompleto = mensagens.join(' ').toLowerCase();

    // 2. Remover caracteres especiais, quebrar em palavras e filtrar
    // Adicione a verificação contra a lista de stop words aqui
    const palavras = textoCompleto
        .replace(/[^\w\sàáâãäåèéêëìíîïòóôõöùúûüçñ]/gi, '')
        .split(/\s+/)
        .filter(palavra => palavra.length > 3 && !stopWords.has(palavra)); // Filtra palavras com mais de 3 caracteres e que não estão na lista de stop words

    // Contar frequência das palavras
    const contador = {};
    palavras.forEach(palavra => {
        if (palavra) {
            contador[palavra] = (contador[palavra] || 0) + 1;
        }
    });

    // Converter para array e ordenar por frequência
    return Object.entries(contador)
        .map(([palavra, frequencia]) => ({ palavra, frequencia }))
        .sort((a, b) => b.frequencia - a.frequencia)
        .slice(0, 20); // Top 20 palavras mais frequentes
}

function criarGraficoPalavrasFrequentes(palavrasFrequentes) {
    const ctx = document.getElementById('graficoPalavras').getContext('2d');
    
    if (window.graficoPalavrasInstance) {
        window.graficoPalavrasInstance.destroy();
    }

    window.graficoPalavrasInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: palavrasFrequentes.map(item => item.palavra),
            datasets: [{
                label: 'Frequência',
                data: palavrasFrequentes.map(item => item.frequencia),
                backgroundColor: [
                    '#fa093eff', '#36eb4eff', '#f8b60fff', '#13ce3cff', '#9966FF',
                    '#FF9F40', '#fa335eff', '#0053faff', '#dd18d3ff', '#ec6314ff',
                    '#FFCE56', '#f10438ff', '#f00b0bff', '#fcba13ff', '#f5e610ff',
                    '#5a09fcff', '#FF9F40', '#f8053aff', '#022c2eff', '#ea64fcff'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y', // Barras horizontais
            plugins: {
                title: {
                    display: true,
                    text: 'Palavras Mais Frequentes (>3 caracteres)'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Frequência'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Palavras'
                    }
                }
            }
        }
    });
}

function atualizarDashboard(data) {
    const sentimentos = { positivo: 0, negativo: 0, neutro: 0 };
    const tabela = document.getElementById("tabela-dados");
    tabela.innerHTML = "";

    let todasMensagens = [];

    data.forEach(row => {
        tabela.innerHTML += `<tr>
            <td>${row.ConversaCompleta || ""}</td>
            <td>${row.Sentimento || ""}</td>
            <td>${row.Data || ""}</td>
        </tr>`;

        const sentimento = row.Sentimento?.toLowerCase();
        if (sentimento && sentimentos[sentimento] !== undefined) {
            sentimentos[sentimento]++;
        }

        if (row.ConversaCompleta) {
            todasMensagens.push(row.ConversaCompleta);
        }
    });

    const total = data.length;
    document.getElementById("kpi-positivos").innerText = ((sentimentos.positivo / total) * 100).toFixed(1) + "%";
    document.getElementById("kpi-negativos").innerText = ((sentimentos.negativo / total) * 100).toFixed(1) + "%";
    document.getElementById("kpi-neutros").innerText = ((sentimentos.neutro / total) * 100).toFixed(1) + "%";
    document.getElementById("kpi-total").innerText = total;

    // Gráfico de pizza
    const ctx = document.getElementById("graficoPizza").getContext("2d");
    if (window.graficoPizzaInstance) window.graficoPizzaInstance.destroy();
    window.graficoPizzaInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Positivo", "Negativo", "Neutro"],
            datasets: [{
                data: [sentimentos.positivo, sentimentos.negativo, sentimentos.neutro],
                backgroundColor: ["#00f708ff", "#eb1000ff", "#FFC107"]
            }]
        },
        options: { responsive: true }
    });

     if (todasMensagens.length > 0) {
        const palavrasFrequentes = processarPalavrasFrequentes(todasMensagens);
        criarGraficoPalavrasFrequentes(palavrasFrequentes);
    }

}


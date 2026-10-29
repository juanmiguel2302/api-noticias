
const listaNoticias = document.getElementById("lista-noticias");
const tituloNoticias = document.getElementById("titulo-noticias");
const statusNoticias = document.getElementById("status");

const noticiaDestaque = document.getElementById("noticia-destaque");
const destaqueImagem = document.getElementById("destaque-imagem");
const destaqueMetadados = document.getElementById("destaque-metadados");
const destaqueTitulo = document.getElementById("destaque-titulo");
const destaqueDescricao = document.getElementById("destaque-descricao");
const destaqueLink = document.getElementById("destaque-link");

const cabecalhoVaticano = document.getElementById("cabecalho-vaticano");

const botaoAnterior = document.getElementById("noticias-anterior");
const botaoProxima = document.getElementById("noticias-proxima");

const nomesCategorias = {
    general: "Últimas notícias",
    world: "Notícias do mundo",
    nation: "Notícias do Brasil",
    business: "Economia e negócios",
    technology: "Tecnologia",
    entertainment: "Entretenimento",
    sports: "Esportes",
    science: "Ciência",
    health: "Saúde",
    vaticano: "Vatican News"
};

function formatarData(data) {
    if (!data) return "";

    const dataConvertida = new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(dataConvertida);
}

function criarMetadados(noticia, elemento) {
    elemento.replaceChildren();

    if (noticia.fonte) {
        const fonte = document.createElement("span");
        fonte.className = "fonte-noticia";
        fonte.textContent = noticia.fonte;
        elemento.appendChild(fonte);
    }

    const dataFormatada = formatarData(noticia.data);

    if (dataFormatada) {
        const data = document.createElement("time");
        data.className = "data-noticia";
        data.dateTime = noticia.data;
        data.textContent = dataFormatada;
        elemento.appendChild(data);
    }
}

function configurarLink(link, url) {
    if (!url) {
        link.hidden = true;
        link.removeAttribute("href");
        return;
    }

    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.hidden = false;
}

function atualizarDestaque(noticia) {
    if (!noticiaDestaque) return;

    noticiaDestaque.hidden = false;

    destaqueTitulo.textContent =
        noticia.titulo || "Notícia em destaque";

    destaqueDescricao.textContent =
        noticia.descricao || "Leia a matéria completa para saber mais.";

    criarMetadados(noticia, destaqueMetadados);
    configurarLink(destaqueLink, noticia.url);

    destaqueImagem.replaceChildren();

    if (noticia.imagem) {
        const imagem = document.createElement("img");

        imagem.src = noticia.imagem;
        imagem.alt = noticia.titulo || "Imagem da notícia";
        imagem.loading = "eager";

        imagem.onerror = () => imagem.remove();

        destaqueImagem.appendChild(imagem);
    }
}

function criarCartaoNoticia(noticia) {
    const cartao = document.createElement("article");
    cartao.className = "cartao-noticia";

    if (noticia.imagem) {
        const imagem = document.createElement("img");

        imagem.src = noticia.imagem;
        imagem.alt = noticia.titulo || "Imagem da notícia";
        imagem.className = "imagem-noticia";
        imagem.loading = "lazy";

        imagem.onerror = () => imagem.remove();

        cartao.appendChild(imagem);
    }

    const conteudo = document.createElement("div");
    conteudo.className = "conteudo-noticia";

    const metadados = document.createElement("div");
    metadados.className = "metadados-noticia";

    criarMetadados(noticia, metadados);

    if (metadados.children.length > 0) {
        conteudo.appendChild(metadados);
    }

    const titulo = document.createElement("h3");
    titulo.textContent = noticia.titulo || "Título indisponível";

    const descricao = document.createElement("p");
    descricao.textContent =
        noticia.descricao || "Descrição não disponível.";

    const link = document.createElement("a");
    link.className = "link-noticia";
    link.textContent = "Ler notícia";

    configurarLink(link, noticia.url);

    conteudo.append(titulo, descricao, link);
    cartao.appendChild(conteudo);

    return cartao;
}

function atualizarControlesCarrossel() {
    if (!listaNoticias || !botaoAnterior || !botaoProxima) {
        return;
    }

    const maximoScroll =
        listaNoticias.scrollWidth - listaNoticias.clientWidth;

    botaoAnterior.disabled = listaNoticias.scrollLeft <= 2;
    botaoProxima.disabled =
        listaNoticias.scrollLeft >= maximoScroll - 2 ||
        maximoScroll <= 2;
}

function moverCarrossel(direcao) {
    if (!listaNoticias) return;

    const primeiroCartao =
        listaNoticias.querySelector(".cartao-noticia");

    const distancia = primeiroCartao
        ? primeiroCartao.getBoundingClientRect().width + 18
        : 250;

    listaNoticias.scrollBy({
        left: distancia * direcao,
        behavior: "smooth"
    });

    setTimeout(atualizarControlesCarrossel, 350);
}

if (botaoAnterior) {
    botaoAnterior.addEventListener("click", () => {
        moverCarrossel(-1);
    });
}

if (botaoProxima) {
    botaoProxima.addEventListener("click", () => {
        moverCarrossel(1);
    });
}

if (listaNoticias) {
    listaNoticias.addEventListener(
        "scroll",
        atualizarControlesCarrossel,
        { passive: true }
    );
}

window.addEventListener("resize", atualizarControlesCarrossel);

async function carregarNoticias(categoria = "general") {
    const ehVaticano = categoria === "vaticano";

    document.body.classList.toggle("vaticano-ativo", ehVaticano);

    if (cabecalhoVaticano) {
        cabecalhoVaticano.hidden = !ehVaticano;
    }

    tituloNoticias.textContent =
        ehVaticano
            ? "Últimas notícias do Vaticano"
            : nomesCategorias[categoria] || "Notícias";

    statusNoticias.textContent = "Carregando notícias...";

    listaNoticias.replaceChildren();

    const carregamento = document.createElement("p");
    carregamento.className = "mensagem";
    carregamento.textContent = "Buscando as últimas notícias...";

    listaNoticias.appendChild(carregamento);

    if (noticiaDestaque) {
        noticiaDestaque.hidden = true;
    }

    try {
        const resposta = await fetch(
            `/noticias/${encodeURIComponent(categoria)}`
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível carregar as notícias."
            );
        }

        if (
            !Array.isArray(dados.noticias) ||
            dados.noticias.length === 0
        ) {
            const mensagem = document.createElement("p");
            mensagem.className = "mensagem";
            mensagem.textContent = "Nenhuma notícia encontrada.";

            listaNoticias.replaceChildren(mensagem);

            statusNoticias.textContent = "Sem notícias";
            atualizarControlesCarrossel();
            return;
        }

        // A primeira notícia fica no destaque principal.
        const principal = dados.noticias[0];

        atualizarDestaque(principal);

        // As demais notícias ficam no carrossel horizontal.
        const fragmento = document.createDocumentFragment();

        dados.noticias.slice(1).forEach((noticia) => {
            fragmento.appendChild(criarCartaoNoticia(noticia));
        });

        listaNoticias.replaceChildren(fragmento);
        listaNoticias.scrollLeft = 0;

        statusNoticias.textContent =
            `${dados.noticias.length} notícias encontradas`;

        requestAnimationFrame(atualizarControlesCarrossel);

    } catch (erro) {
        const mensagem = document.createElement("p");
        mensagem.className = "mensagem";
        mensagem.textContent =
            erro.message || "Ocorreu um erro ao carregar as notícias.";

        listaNoticias.replaceChildren(mensagem);

        if (noticiaDestaque) {
            noticiaDestaque.hidden = true;
        }

        statusNoticias.textContent = "Erro ao carregar";
        atualizarControlesCarrossel();
    }
}

document.querySelectorAll(".categoria").forEach((botao) => {
    botao.addEventListener("click", () => {
        document.querySelectorAll(".categoria").forEach((item) => {
            item.classList.remove("ativa");
        });

        botao.classList.add("ativa");

        carregarNoticias(botao.dataset.categoria);
    });
});

carregarNoticias();

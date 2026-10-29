import re
import html
import os
import time
import requests
import feedparser

from flask import Flask, jsonify, render_template
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

API_KEY = os.getenv("GNEWS_API_KEY")

cache = {}
TEMPO_CACHE = 300


def limpar_html(texto):
    if not texto:
        return ""

    texto = re.sub(r"<[^>]+>", "", texto)
    return html.unescape(texto).strip()


@app.route("/")
def inicio():
    return render_template("index.html")


@app.route("/noticias/vaticano")
def noticias_vaticano():
    agora = time.time()

    #verificacao do cahce
    if "vaticano" in cache:
        dados_cache = cache["vaticano"]

        if agora - dados_cache["horario"] < TEMPO_CACHE:
            resposta_cache = jsonify({
                "fonte": "Vatican News",
                "noticias": dados_cache["noticias"]
            })
            resposta_cache.headers["X-Cache"] = "HIT"
            return resposta_cache

    #consulta rss vaticano
    try:
        resposta_rss = requests.get(
            "https://www.vaticannews.va/pt.rss.xml",
            timeout=10
        )
        resposta_rss.raise_for_status()
        feed = feedparser.parse(resposta_rss.content)

    except requests.exceptions.RequestException:
        return jsonify({
            "erro": "Não foi possível consultar o Vatican News no momento."
        }), 503

    print("Total de notícias do Vaticano:", len(feed.entries))

    noticias = []

    #processo de 10 ntocias
    for item in feed.entries[:10]:
        imagem = None

        media_content = item.get("media_content", [])
        media_thumbnail = item.get("media_thumbnail", [])
        enclosures = item.get("enclosures", [])

        #procura image
        if media_content:
            imagem = media_content[0].get("url")

        elif media_thumbnail:
            imagem = media_thumbnail[0].get("url")

        elif enclosures:
            imagem = (
                enclosures[0].get("href")
                or enclosures[0].get("url")
            )

        
        noticia = {
    "titulo": item.get("title"),
    "descricao": limpar_html(item.get("summary")),
    "url": item.get("link"),
    "data": item.get("published"),
    "imagem": imagem,
    "fonte": "Vatican News"
}


        noticias.append(noticia)

    #salva cache
    cache["vaticano"] = {
        "noticias": noticias,
        "horario": time.time()
    }

    resposta_final = jsonify({
        "fonte": "Vatican News",
        "noticias": noticias
    })
    resposta_final.headers["X-Cache"] = "MISS"

    return resposta_final


@app.route("/noticias/<categoria>")
def noticias(categoria):
    categorias_validas = [
        "general",
        "world",
        "nation",
        "business",
        "technology",
        "entertainment",
        "sports",
        "science",
        "health"
    ]

    if categoria not in categorias_validas:
        return jsonify({
            "erro": "Categoria inválida",
            "categorias_disponiveis": categorias_validas
        }), 400

    agora = time.time()

    #verificacao de cahce
    if categoria in cache:
        dados_cache = cache[categoria]

        if agora - dados_cache["horario"] < TEMPO_CACHE:
            resposta_cache = jsonify({
                "noticias": dados_cache["noticias"]
            })
            resposta_cache.headers["X-Cache"] = "HIT"
            return resposta_cache

    if not API_KEY:
        return jsonify({
            "erro": "A chave da API GNews não foi configurada."
        }), 500

    url = "https://gnews.io/api/v4/top-headlines"

    parametros = {
        "category": categoria,
        "lang": "pt",
        "country": "br",
        "max": 10,
        "apikey": API_KEY
    }

    #consulta gnews
    try:
        resposta = requests.get(
            url,
            params=parametros,
            timeout=10
        )

    except requests.exceptions.RequestException:
        return jsonify({
            "erro": "Não foi possível conectar à API de notícias."
        }), 503

    if resposta.status_code != 200:
        try:
            detalhes = resposta.json()
        except requests.exceptions.JSONDecodeError:
            detalhes = "O serviço retornou uma resposta inválida."

        return jsonify({
            "erro": "Erro ao consultar a API de notícias.",
            "detalhes": detalhes
        }), resposta.status_code

    try:
        dados = resposta.json()

    except requests.exceptions.JSONDecodeError:
        return jsonify({
            "erro": "A API de notícias retornou uma resposta inválida."
        }), 502

    artigos = dados.get("articles")

    if not isinstance(artigos, list):
        return jsonify({
            "erro": "A resposta não contém uma lista válida de notícias."
        }), 502

    noticias = []

    for artigo in artigos:
        noticia = {
            "titulo": artigo.get("title"),
            "descricao": limpar_html(artigo.get("description")),
            "imagem": artigo.get("image"),
            "fonte": artigo.get("source", {}).get("name"),
            "data": artigo.get("publishedAt"),
            "url": artigo.get("url")
        }

        noticias.append(noticia)

#salva cache
    cache[categoria] = {
        "noticias": noticias,
        "horario": time.time()
    }

    resposta_final = jsonify({
        "noticias": noticias
    })
    resposta_final.headers["X-Cache"] = "MISS"

    return resposta_final


if __name__ == "__main__":
    app.run(debug=True)

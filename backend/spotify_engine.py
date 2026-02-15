import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import os
from dotenv import load_dotenv
from pathlib import Path

# --- CORREÇÃO DE CAMINHO ---
# Força a busca do .env na mesma pasta onde este script está
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

# Se não achar, tenta subir um nível (caso esteja na raiz)
if not os.getenv("SPOTIFY_CLIENT_ID"):
    load_dotenv(dotenv_path=env_path.parent.parent / '.env')

def get_spotify_client():
    c_id = os.getenv("SPOTIFY_CLIENT_ID")
    c_secret = os.getenv("SPOTIFY_CLIENT_SECRET")

    # Debug para o usuário ver no terminal o que está acontecendo
    if not c_id:
        print(f"❌ ERRO: SPOTIFY_CLIENT_ID não encontrado. Procurando em: {env_path}")
        return None
    
    # Autenticação de Servidor (Client Credentials Flow)
    try:
        auth_manager = SpotifyClientCredentials(client_id=c_id, client_secret=c_secret)
        return spotipy.Spotify(auth_manager=auth_manager)
    except Exception as e:
        print(f"Erro ao autenticar no Spotify: {e}")
        return None

def search_spotify(query: str, limit: int = 3):
    sp = get_spotify_client()
    if not sp:
        return []

    print(f"🎵 Buscando no Spotify: {query}")
    try:
        # Busca por faixas (tracks)
        results = sp.search(q=query, limit=limit, type='track')
        
        cards = []
        if results and 'tracks' in results:
            for item in results['tracks']['items']:
                # Formata para o padrão visual do Frontend
                # (Reutiliza a estrutura de 'video-card' mas vamos diferenciar no futuro se quiser)
                image = item['album']['images'][0]['url'] if item['album']['images'] else ""
                cards.append({
                    "title": f"{item['name']} • {item['artists'][0]['name']}",
                    "thumbnail": image,
                    "link": item['external_urls']['spotify'],
                    "source": "spotify" 
                })
        return cards
    except Exception as e:
        print(f"Erro na busca Spotify: {e}")
        return []

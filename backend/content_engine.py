from googleapiclient.discovery import build
from typing import List
from pydantic import BaseModel

class YouTubeSuggestion(BaseModel):
    video_id: str
    title: str
    thumbnail_url: str

    @property
    def video_url(self) -> str:
        return f"https://www.youtube.com/watch?v={self.video_id}"

def search_youtube_videos(api_key: str, query: str, max_results: int = 5) -> List[YouTubeSuggestion]:
    """
    Versão de Diagnóstico com Logs detalhados.
    """
    print(f"--- DEBUG YOUTUBE ---")
    print(f"1. Query: {query}")

    if not api_key or "SUA_CHAVE" in api_key:
        print("ERRO: API Key inválida ou não fornecida.")
        return []
        
    print(f"2. Chave detectada (inicio): {api_key[:4]}...")
    try:
        # Constrói o serviço
        youtube = build('youtube', 'v3', developerKey=api_key)
        
        # Faz a chamada
        print("3. Enviando requisição para o Google...")
        request = youtube.search().list(
            q=query,
            part='snippet',
            type='video',
            maxResults=max_results
        )
        response = request.execute()
        
        items = response.get('items', [])
        print(f"4. Resposta recebida. Encontrados: {len(items)} vídeos.")
        if len(items) == 0:
            print(f"ALERTA: O Google retornou lista vazia. Resposta bruta: {response}")
            
        suggestions = []
        for search_result in items:
            snippet = search_result.get('snippet', {})
            video_id = search_result.get('id', {}).get('videoId', '')
            
            if video_id:
                suggestions.append(YouTubeSuggestion(
                    video_id=video_id,
                    title=snippet.get('title', 'Sem título'),
                    thumbnail_url=snippet.get('thumbnails', {}).get('high', {}).get('url', '')
                ))
        
        print(f"5. Processamento concluído com sucesso.")
        print(f"---------------------")
        return suggestions
    except Exception as e:
        print(f"🔴 ERRO FATAL YOUTUBE: {e}")
        # Tenta mostrar detalhes extras se for erro de HTTP
        if hasattr(e, 'content'):
            print(f"Detalhes do Google: {e.content}")
        print(f"---------------------")
        # Relança o erro para que o ai_service.py capture e mostre o card vermelho na UI
        raise e 

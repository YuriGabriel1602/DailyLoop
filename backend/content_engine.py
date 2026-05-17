from typing import List

from googleapiclient.discovery import build
from pydantic import BaseModel


class YouTubeSuggestion(BaseModel):
    video_id: str
    title: str
    thumbnail_url: str

    @property
    def video_url(self) -> str:
        return f"https://www.youtube.com/watch?v={self.video_id}"


def search_youtube_videos(api_key: str, query: str, max_results: int = 5) -> List[YouTubeSuggestion]:
    if not api_key or "SUA_CHAVE" in api_key:
        return []

    try:
        youtube = build("youtube", "v3", developerKey=api_key)
        request = youtube.search().list(
            q=query,
            part="snippet",
            type="video",
            maxResults=max_results,
        )
        response = request.execute()

        suggestions: list[YouTubeSuggestion] = []
        for search_result in response.get("items", []):
            snippet = search_result.get("snippet", {})
            video_id = search_result.get("id", {}).get("videoId", "")
            if video_id:
                suggestions.append(
                    YouTubeSuggestion(
                        video_id=video_id,
                        title=snippet.get("title", "Sem titulo"),
                        thumbnail_url=snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                    )
                )
        return suggestions
    except Exception as exc:
        print(f"YouTube search error: {exc}")
        return []

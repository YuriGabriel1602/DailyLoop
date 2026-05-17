import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

from settings import settings


def get_spotify_client():
    if not settings.spotify_client_id or not settings.spotify_client_secret:
        print("Spotify credentials are not configured.")
        return None

    try:
        auth_manager = SpotifyClientCredentials(
            client_id=settings.spotify_client_id,
            client_secret=settings.spotify_client_secret,
        )
        return spotipy.Spotify(auth_manager=auth_manager)
    except Exception as exc:
        print(f"Spotify authentication error: {exc}")
        return None


def search_spotify(query: str, limit: int = 3):
    sp = get_spotify_client()
    if not sp:
        return []

    try:
        results = sp.search(q=query, limit=limit, type="track")
        cards = []
        for item in results.get("tracks", {}).get("items", []):
            image = item["album"]["images"][0]["url"] if item["album"].get("images") else ""
            cards.append(
                {
                    "title": f"{item['name']} - {item['artists'][0]['name']}",
                    "thumbnail": image,
                    "link": item["external_urls"]["spotify"],
                    "source": "spotify",
                }
            )
        return cards
    except Exception as exc:
        print(f"Spotify search error: {exc}")
        return []

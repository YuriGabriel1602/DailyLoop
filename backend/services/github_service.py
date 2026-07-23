import logging

import httpx

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"


def list_repos(token: str) -> list[dict]:
    """Lista os repositórios do usuário autenticado pelo token, com contagem de PRs
    abertos por repo. Degrada pra lista vazia (sem lançar) se o token for inválido ou
    a API falhar — mesmo padrão de `whatsapp_service.py`."""
    if not token:
        return []

    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    try:
        with httpx.Client(timeout=10.0, headers=headers) as client:
            response = client.get(f"{GITHUB_API}/user/repos", params={"sort": "updated", "per_page": 20})
            if response.status_code >= 400:
                logger.error("GitHub recusou a listagem de repos: %s", response.text)
                return []
            repos = response.json()

            result = []
            for repo in repos:
                full_name = repo["full_name"]
                pr_count = 0
                try:
                    pr_response = client.get(
                        f"{GITHUB_API}/search/issues",
                        params={"q": f"repo:{full_name} type:pr state:open"},
                    )
                    if pr_response.status_code < 400:
                        pr_count = pr_response.json().get("total_count", 0)
                except Exception:
                    pass

                result.append(
                    {
                        "name": repo["name"],
                        "full_name": full_name,
                        "private": repo["private"],
                        "description": repo.get("description"),
                        "language": repo.get("language"),
                        "open_issues_count": repo.get("open_issues_count", 0),
                        "open_prs_count": pr_count,
                        "updated_at": repo.get("updated_at"),
                        "html_url": repo.get("html_url"),
                    }
                )
            return result
    except Exception:
        logger.exception("Falha ao listar repositórios do GitHub")
        return []


def get_authenticated_login(token: str) -> str | None:
    if not token:
        return None
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                f"{GITHUB_API}/user",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            )
            if response.status_code >= 400:
                return None
            return response.json().get("login")
    except Exception:
        logger.exception("Falha ao identificar usuário do GitHub")
        return None

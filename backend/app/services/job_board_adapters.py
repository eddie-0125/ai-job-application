"""Direct adapters for job boards that expose public JSON APIs."""

from __future__ import annotations

import re
from html import unescape
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx
from bs4 import BeautifulSoup

from app.schemas.job import JobExtractedFields
from app.services.job_errors import JobImportError


def _strip_html(html: str) -> str:
    if not html:
        return ""
    decoded = unescape(html)
    soup = BeautifulSoup(decoded, "html.parser")
    return soup.get_text(separator="\n", strip=True)

GREENHOUSE_HOSTS = ("boards.greenhouse.io", "job-boards.greenhouse.io")
GREENHOUSE_PATH = re.compile(
    r"^/(?P<board>[^/]+)/jobs/(?P<job_id>\d+)",
    re.I,
)
GH_JID_QUERY = re.compile(r"gh_jid=(\d+)", re.I)

LEVER_PATH = re.compile(
    r"^/(?P<company>[^/]+)/(?P<posting_id>[0-9a-f-]{36}|[\w-]+)$",
    re.I,
)


def _title_case_board(name: str) -> str:
    return name.replace("-", " ").replace("_", " ").title()


async def try_board_adapter(
    url: str,
    client: httpx.AsyncClient,
) -> JobExtractedFields | None:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()

    if host in GREENHOUSE_HOSTS:
        return await _from_greenhouse_url(url, parsed, client)

    gh_jid = _extract_gh_jid(url)
    if gh_jid:
        board = _guess_greenhouse_board(parsed, url)
        if board:
            return await _from_greenhouse_api(board, gh_jid, client)

    if host == "jobs.lever.co":
        return await _from_lever_url(parsed, client)

    return None


def _extract_gh_jid(url: str) -> str | None:
    match = GH_JID_QUERY.search(url)
    return match.group(1) if match else None


def _guess_greenhouse_board(parsed, url: str) -> str | None:
    path_match = GREENHOUSE_PATH.match(parsed.path or "")
    if path_match:
        return path_match.group("board")
    host = (parsed.hostname or "").lower()
    if host and host not in GREENHOUSE_HOSTS and "greenhouse" not in host:
        slug = host.split(".")[0]
        if slug and slug not in {"www", "jobs", "careers", "apply"}:
            return slug
    return None


async def _from_greenhouse_url(
    url: str,
    parsed,
    client: httpx.AsyncClient,
) -> JobExtractedFields | None:
    match = GREENHOUSE_PATH.match(parsed.path or "")
    if not match:
        return None
    return await _from_greenhouse_api(
        match.group("board"),
        match.group("job_id"),
        client,
    )


async def _from_greenhouse_api(
    board: str,
    job_id: str,
    client: httpx.AsyncClient,
) -> JobExtractedFields:
    api_url = f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs/{job_id}"
    try:
        response = await client.get(api_url)
    except httpx.RequestError as exc:
        raise JobImportError(f"Greenhouse API request failed: {exc}") from exc

    if response.status_code == 404:
        raise JobImportError("Job not found on Greenhouse.")
    if response.status_code >= 400:
        raise JobImportError(f"Greenhouse API returned HTTP {response.status_code}.")

    data = response.json()
    title = (data.get("title") or "").strip()
    content_html = data.get("content") or ""
    description = _strip_html(content_html) if content_html else ""
    company = _title_case_board(board)

    departments = data.get("departments") or []
    if departments and isinstance(departments[0], dict):
        dept_name = departments[0].get("name")
        if dept_name:
            description = f"Department: {dept_name}\n\n{description}"

    if not title or len(description) < 50:
        raise JobImportError("Greenhouse returned incomplete job data.")

    return JobExtractedFields(company=company, title=title, description=description)


async def _from_lever_url(
    parsed,
    client: httpx.AsyncClient,
) -> JobExtractedFields | None:
    match = LEVER_PATH.match(parsed.path or "")
    if not match:
        return None
    company = match.group("company")
    posting_id = match.group("posting_id")
    api_url = f"https://api.lever.co/v0/postings/{company}/{posting_id}?mode=json"

    try:
        response = await client.get(api_url)
    except httpx.RequestError as exc:
        raise JobImportError(f"Lever API request failed: {exc}") from exc

    if response.status_code == 404:
        raise JobImportError("Job not found on Lever.")
    if response.status_code >= 400:
        return None

    data: dict[str, Any] = response.json()
    if not data.get("ok", True) and data.get("error"):
        raise JobImportError(str(data["error"]))

    title = (data.get("text") or "").strip()
    description = (data.get("descriptionPlain") or "").strip()
    if not description:
        description = _strip_html(data.get("description") or "")
    company_name = (data.get("categories", {}) or {}).get("team") or _title_case_board(company)

    if not title or len(description) < 50:
        raise JobImportError("Lever returned incomplete job data.")

    return JobExtractedFields(
        company=str(company_name).strip() or _title_case_board(company),
        title=title,
        description=description,
    )

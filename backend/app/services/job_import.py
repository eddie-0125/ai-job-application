"""Fetch job posting pages and extract company, title, and description."""

from __future__ import annotations

import ipaddress
import json
import re
import socket
from html import unescape
from typing import Any
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from agents.base import BaseAgent
from app.config import settings
from app.schemas.job import JobExtractedFields
from app.services.job_board_adapters import try_board_adapter
from app.services.job_errors import JobImportError
from prompts.job_import import JOB_IMPORT_SYSTEM, JOB_IMPORT_USER

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
MAX_PAGE_BYTES = 2_000_000
MAX_TEXT_FOR_LLM = 24_000
FETCH_TIMEOUT = 25.0

_BLOCKED_HOST_SUFFIXES = (".local", ".internal", ".localhost")


class JobImportAgent(BaseAgent):
    agent_type = "job_import"

    async def extract_from_page(
        self,
        *,
        url: str,
        page_title: str,
        hints: dict[str, Any],
        page_text: str,
    ) -> JobExtractedFields:
        user_prompt = JOB_IMPORT_USER.format(
            url=url,
            page_title=page_title or "(none)",
            hints=json.dumps(hints, ensure_ascii=False, indent=2) if hints else "(none)",
            page_text=page_text[:MAX_TEXT_FOR_LLM],
        )
        return await self.structured_completion(
            JobExtractedFields,
            JOB_IMPORT_SYSTEM,
            user_prompt,
            temperature=0.1,
        )


def _validate_public_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https"):
        raise JobImportError("URL must start with http:// or https://")
    host = (parsed.hostname or "").lower()
    if not host:
        raise JobImportError("Invalid URL: missing hostname")
    if host in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
        raise JobImportError("Local URLs are not allowed")
    if any(host.endswith(suffix) for suffix in _BLOCKED_HOST_SUFFIXES):
        raise JobImportError("This hostname is not allowed")

    try:
        addr_infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise JobImportError(f"Could not resolve hostname: {host}") from exc

    for info in addr_infos:
        ip_str = info[4][0]
        if ip_str.startswith("fe80") or ip_str == "::1":
            raise JobImportError("Local network URLs are not allowed")
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise JobImportError("Private or local network URLs are not allowed")

    return url.strip()


def _strip_html(html: str) -> str:
    if not html:
        return ""
    decoded = unescape(html)
    soup = BeautifulSoup(decoded, "html.parser")
    return soup.get_text(separator="\n", strip=True)


def _collect_json_ld(soup: BeautifulSoup) -> list[Any]:
    items: list[Any] = []
    for tag in soup.find_all("script", type="application/ld+json"):
        raw = tag.string or tag.get_text()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if isinstance(data, list):
            items.extend(data)
        else:
            items.append(data)
    return items


def _find_job_posting_ld(items: list[Any]) -> dict[str, Any] | None:
    for item in items:
        if not isinstance(item, dict):
            continue
        t = item.get("@type")
        types = [t] if isinstance(t, str) else (t if isinstance(t, list) else [])
        if "JobPosting" in types:
            return item
        if "@graph" in item and isinstance(item["@graph"], list):
            nested = _find_job_posting_ld(item["@graph"])
            if nested:
                return nested
    return None


def _hints_from_soup(soup: BeautifulSoup, job_ld: dict[str, Any] | None) -> dict[str, Any]:
    hints: dict[str, Any] = {}
    if job_ld:
        org = job_ld.get("hiringOrganization") or {}
        if isinstance(org, dict):
            hints["company"] = org.get("name") or ""
        hints["title"] = job_ld.get("title") or job_ld.get("name") or ""
        desc = job_ld.get("description") or ""
        if desc:
            hints["description"] = _strip_html(desc) if "<" in str(desc) else str(desc)

    og: dict[str, str] = {}
    for prop in ("og:title", "og:description", "og:site_name"):
        tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
        if tag and tag.get("content"):
            og[prop] = tag["content"].strip()
    if og:
        hints["open_graph"] = og

    tw: dict[str, str] = {}
    for name in ("twitter:title", "twitter:description"):
        tag = soup.find("meta", attrs={"name": name})
        if tag and tag.get("content"):
            tw[name] = tag["content"].strip()
    if tw:
        hints["twitter"] = tw

    return hints


def _visible_text(soup: BeautifulSoup) -> str:
    for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "nav"]):
        tag.decompose()

    main = (
        soup.find("main")
        or soup.find(attrs={"role": "main"})
        or soup.find(id=re.compile(r"job|posting|description", re.I))
        or soup.find(class_=re.compile(r"job-description|posting|jobdetails", re.I))
    )
    root = main if main else soup.body or soup
    text = root.get_text(separator="\n", strip=True)
    lines = [ln for ln in text.splitlines() if ln.strip()]
    return "\n".join(lines)


def _merge_hints_and_llm(
    hints: dict[str, Any],
    llm: JobExtractedFields,
) -> JobExtractedFields:
    company = (hints.get("company") or "").strip() or llm.company.strip()
    title = (hints.get("title") or "").strip() or llm.title.strip()
    og = hints.get("open_graph") or {}
    if not title and og.get("og:title"):
        title = og["og:title"]
    if not company and og.get("og:site_name"):
        company = og["og:site_name"]

    description = (hints.get("description") or "").strip() or llm.description.strip()
    og_desc = og.get("og:description", "")
    if len(description) < 80 and og_desc:
        description = og_desc

    if not description:
        raise JobImportError(
            "Could not extract a job description. The site may require login "
            "or block automated access — try pasting the description manually."
        )

    return JobExtractedFields(
        company=company or "Unknown",
        title=title or "Unknown",
        description=description,
    )


async def import_job_from_url(url: str) -> JobExtractedFields:
    if not settings.openai_api_key:
        raise JobImportError("OPENAI_API_KEY is required to parse job pages.")

    safe_url = _validate_public_url(url)

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=FETCH_TIMEOUT,
            headers=headers,
        ) as client:
            adapted = await try_board_adapter(safe_url, client)
            if adapted:
                return adapted

            response = await client.get(safe_url)
    except httpx.TimeoutException as exc:
        raise JobImportError("Request timed out while fetching the job page.") from exc
    except httpx.RequestError as exc:
        raise JobImportError(f"Could not fetch URL: {exc}") from exc

    if response.status_code >= 400:
        raise JobImportError(
            f"The server returned HTTP {response.status_code}. "
            "The listing may be private or removed."
        )

    content_type = response.headers.get("content-type", "")
    if "html" not in content_type.lower() and "text" not in content_type.lower():
        raise JobImportError("URL did not return an HTML page.")

    raw = response.content[:MAX_PAGE_BYTES]
    soup = BeautifulSoup(raw, "html.parser")
    page_title = (soup.title.string or "").strip() if soup.title else ""

    ld_items = _collect_json_ld(soup)
    job_ld = _find_job_posting_ld(ld_items)
    hints = _hints_from_soup(soup, job_ld)
    page_text = _visible_text(soup)

    if len(page_text) < 100 and not hints.get("description"):
        raise JobImportError(
            "Page content looks empty or blocked (login wall / bot protection). "
            "Copy the job description and paste it below, or try a direct career-site URL."
        )

    agent = JobImportAgent()
    try:
        llm_fields = await agent.extract_from_page(
            url=safe_url,
            page_title=page_title,
            hints=hints,
            page_text=page_text,
        )
    except Exception as exc:
        raise JobImportError(f"AI extraction failed: {exc}") from exc

    return _merge_hints_and_llm(hints, llm_fields)

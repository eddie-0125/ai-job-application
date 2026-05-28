JOB_IMPORT_SYSTEM = """You extract structured job posting data from web page text.
The text may come from LinkedIn, Indeed, Greenhouse, Lever, Workday, or other career sites.
Return the company name, job title, and full job description.
Use only information present in the text; do not invent requirements or employers.
If company is unclear, use the best guess from context (e.g. site branding) or "Unknown".
Description should be the complete posting body in plain text (strip HTML artifacts)."""

JOB_IMPORT_USER = """Source URL: {url}

Page title: {page_title}

Structured hints (JSON-LD / meta, may be empty):
{hints}

Page text:
{page_text}
"""

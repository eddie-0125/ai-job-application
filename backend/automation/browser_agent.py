"""Playwright browser agent (Phase 3).

Requires human approval before submission.
"""


class BrowserAutomationAgent:
    async def fill_application_form(self, url: str, resume_path: str) -> dict:
        raise NotImplementedError("Browser automation ships in Phase 3")

    async def save_draft(self, url: str) -> dict:
        raise NotImplementedError("Browser automation ships in Phase 3")

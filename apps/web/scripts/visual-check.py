"""H5 端视觉验收截图：登录页 + 委托板。需先运行 `pnpm --filter @task-guild/web dev:h5`。"""

import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TG_WEB_URL", "http://localhost:5173")
OUT = os.path.join(os.path.dirname(__file__), "..", "screenshots")


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.goto(f"{BASE}/#/pages/login/login")
        page.wait_for_load_state("networkidle")
        page.screenshot(path=os.path.join(OUT, "login.png"), full_page=True)

        page.goto(f"{BASE}/#/pages/index/index")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        page.screenshot(path=os.path.join(OUT, "board.png"), full_page=True)
        browser.close()
    print(f"screenshots saved to {OUT}")


if __name__ == "__main__":
    main()

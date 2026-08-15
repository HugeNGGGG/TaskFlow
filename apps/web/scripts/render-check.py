"""H5 渲染验收：断言关键文案与主题令牌生效。需先运行 H5 dev server。"""

import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TG_WEB_URL", "http://localhost:5173")


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        page.goto(f"{BASE}/#/pages/login/login")
        page.wait_for_load_state("networkidle")
        login_html = page.content()
        login_bg = page.evaluate(
            "getComputedStyle(document.querySelector('.login-page')).backgroundImage"
        )
        print("login 文案:", "冒险者公会" in login_html and "进入公会" in login_html)
        print("login 背景令牌:", "radial-gradient" in login_bg)
        print("login 徽章/羊皮纸卡:", "emblem" in login_html and "parchment-card" in login_html)
        login_card = page.evaluate(
            "getComputedStyle(document.querySelector('.parchment-card')).backgroundImage"
        )
        print("login 纸纹纹理:", "linear-gradient" in login_card)

        page.goto(f"{BASE}/#/pages/index/index")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        board_html = page.content()
        header_bg = page.evaluate(
            "getComputedStyle(document.querySelector('.board-header')).backgroundColor"
        )
        print("委托板文案:", "公会委托板" in board_html)
        print("筛选标签数:", page.locator(".chip").count())
        print("头部主题色:", header_bg)
        header_texture = page.evaluate(
            "getComputedStyle(document.querySelector('.board-header')).backgroundImage"
        )
        print("头部木纹纹理:", "linear-gradient" in header_texture)

        browser.close()


if __name__ == "__main__":
    main()

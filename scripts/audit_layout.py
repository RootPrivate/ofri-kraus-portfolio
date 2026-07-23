from pathlib import Path
import os
import time

from selenium import webdriver
from selenium.webdriver.common.by import By


ROOT = Path(__file__).resolve().parents[1]
EDGE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
BASE_URL = os.environ.get("SITE_URL", "http://localhost:4173")


def create_driver(width: int, height: int) -> webdriver.Edge:
    options = webdriver.EdgeOptions()
    options.binary_location = str(EDGE)
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--hide-scrollbars")
    options.add_argument("--no-first-run")
    options.add_argument(f"--window-size={width},{height}")
    return webdriver.Edge(options=options)


def audit_viewport(width: int, height: int, name: str) -> None:
    driver = create_driver(max(width, 800), max(height, 900))
    try:
        driver.execute_cdp_cmd(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": width,
                "height": height,
                "deviceScaleFactor": 1,
                "mobile": width < 768,
            },
        )
        driver.get(BASE_URL)
        driver.implicitly_wait(2)
        time.sleep(1.2)
        metrics = driver.execute_script(
            """
            const viewportWidth = document.documentElement.clientWidth;
            const offenders = [...document.querySelectorAll('body *')]
              .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                  tag: element.tagName.toLowerCase(),
                  id: element.id,
                  className: typeof element.className === 'string' ? element.className : '',
                  parentClass: typeof element.parentElement?.className === 'string' ? element.parentElement.className : '',
                  source: element.getAttribute('src') || '',
                  left: Math.round(rect.left),
                  right: Math.round(rect.right),
                  width: Math.round(rect.width),
                };
              })
              .filter((item) => item.left < -1 || item.right > viewportWidth + 1)
              .slice(0, 30);
            return {
              innerWidth: window.innerWidth,
              clientWidth: viewportWidth,
              scrollWidth: document.documentElement.scrollWidth,
              scrollHeight: document.documentElement.scrollHeight,
              offenders,
            };
            """
        )
        print(f"{name}: {metrics}")

        for section_id in ["top", "work", "stills", "about", "contact"]:
            driver.execute_script(
                """
                const element = document.getElementById(arguments[0]);
                const top = element.getBoundingClientRect().top + window.scrollY - 72;
                window.scrollTo(0, Math.max(0, top));
                """,
                section_id,
            )
            time.sleep(0.9)
            if section_id == "about":
                about_state = driver.execute_script(
                    """
                    return [...document.querySelectorAll('.about-media, .about-copy')].map((element) => ({
                      className: element.className,
                      opacity: getComputedStyle(element).opacity,
                      display: getComputedStyle(element).display,
                      top: Math.round(element.getBoundingClientRect().top),
                      left: Math.round(element.getBoundingClientRect().left),
                      width: Math.round(element.getBoundingClientRect().width),
                      height: Math.round(element.getBoundingClientRect().height),
                    }));
                    """
                )
                print(f"{name} about: {about_state}")
            section_screenshot = ROOT / "screenshots" / f"{name}-{section_id}.png"
            driver.save_screenshot(str(section_screenshot))
            print(f"saved {section_screenshot.relative_to(ROOT)}")

        if width < 768:
            driver.execute_script("window.scrollTo(0, 0);")
            menu_toggle = driver.find_element(By.ID, "menu-toggle")
            menu_toggle.click()
            time.sleep(0.3)
            assert menu_toggle.get_attribute("aria-expanded") == "true"
            menu_screenshot = ROOT / "screenshots" / f"{name}-menu.png"
            driver.save_screenshot(str(menu_screenshot))
            print(f"saved {menu_screenshot.relative_to(ROOT)}")
            menu_toggle.click()

            rail = driver.find_element(By.ID, "project-rail")
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", rail)
            rail_start = driver.execute_script("return arguments[0].scrollLeft;", rail)
            driver.execute_script("arguments[0].scrollBy({left: -240, behavior: 'auto'});", rail)
            time.sleep(0.5)
            rail_end = driver.execute_script("return arguments[0].scrollLeft;", rail)
            assert rail_start != rail_end, "Project rail control did not move the rail"

            still_trigger = driver.find_element(By.CSS_SELECTOR, "#stills .media-button")
            driver.execute_script(
                "arguments[0].scrollIntoView({block: 'center', behavior: 'instant'});",
                still_trigger,
            )
            time.sleep(0.4)
            still_trigger.click()
            time.sleep(0.4)
            dialog = driver.find_element(By.ID, "lightbox")
            assert dialog.get_attribute("open") is not None
            assert not driver.find_element(By.ID, "lightbox-image").get_attribute("hidden")
            lightbox_screenshot = ROOT / "screenshots" / f"{name}-lightbox.png"
            driver.save_screenshot(str(lightbox_screenshot))
            print(f"saved {lightbox_screenshot.relative_to(ROOT)}")
            driver.find_element(By.ID, "lightbox-close").click()
            assert dialog.get_attribute("open") is None

        for scroll_top in range(0, metrics["scrollHeight"], max(400, height // 2)):
            driver.execute_script("window.scrollTo(0, arguments[0]);", scroll_top)
            time.sleep(0.04)
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(0.2)

        full_height = min(metrics["scrollHeight"], 15000)
        driver.execute_cdp_cmd(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": width,
                "height": full_height,
                "deviceScaleFactor": 1,
                "mobile": width < 768,
            },
        )
        screenshot = ROOT / "screenshots" / f"{name}-full.png"
        driver.save_screenshot(str(screenshot))
        print(f"saved {screenshot.relative_to(ROOT)}")
    finally:
        driver.quit()


if __name__ == "__main__":
    (ROOT / "screenshots").mkdir(exist_ok=True)
    audit_viewport(390, 844, "mobile")
    audit_viewport(1440, 1100, "desktop")

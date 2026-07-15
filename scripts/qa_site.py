from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "index.html"
sys.stdout.reconfigure(encoding="utf-8")


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.fragments: list[str] = []
        self.local_references: list[str] = []
        self.image_alt_errors: list[str] = []
        self.headings: list[str] = []
        self._active_heading: str | None = None
        self._heading_text: list[str] = []

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = dict(attrs_list)
        if element_id := attrs.get("id"):
            self.ids.add(element_id)

        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self._active_heading = tag
            self._heading_text = []

        if tag == "img" and "alt" not in attrs:
            self.image_alt_errors.append(attrs.get("src", "unknown image"))

        if tag == "a" and (href := attrs.get("href", "")).startswith("#"):
            self.fragments.append(href[1:])

        for attribute in ("src", "href", "data-media-src", "data-media-poster"):
            value = attrs.get(attribute)
            if not value or value.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue
            parsed = urlparse(value)
            if not parsed.scheme and not value.startswith("//"):
                self.local_references.append(parsed.path)

    def handle_data(self, data: str) -> None:
        if self._active_heading:
            self._heading_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == self._active_heading:
            text = " ".join(part.strip() for part in self._heading_text if part.strip())
            self.headings.append(f"{tag}:{text}")
            self._active_heading = None
            self._heading_text = []


def main() -> None:
    html = HTML_PATH.read_text(encoding="utf-8")
    parser = SiteParser()
    parser.feed(html)

    failures: list[str] = []
    h1_headings = [heading for heading in parser.headings if heading.startswith("h1:")]
    if len(h1_headings) != 1:
        failures.append(f"Expected exactly one H1, found {len(h1_headings)}")

    if parser.image_alt_errors:
        failures.append(f"Images missing alt: {parser.image_alt_errors}")

    missing_fragments = sorted(fragment for fragment in parser.fragments if fragment not in parser.ids)
    if missing_fragments:
        failures.append(f"Missing fragment targets: {missing_fragments}")

    missing_files = sorted(
        reference
        for reference in set(parser.local_references)
        if reference not in {"./"} and not (ROOT / reference).exists()
    )
    if missing_files:
        failures.append(f"Missing local files: {missing_files}")

    forbidden_copy = [token for token in ("—", "–", "Lorem", "REMOVE_THIS", "<brand") if token in html]
    if forbidden_copy:
        failures.append(f"Forbidden or placeholder copy found: {forbidden_copy}")

    if not re.search(r'<meta\s+name="description"\s+content="[^"]{80,160}"', html):
        failures.append("Meta description is missing or outside the 80-160 character range")

    if 'property="og:image"' not in html or 'name="twitter:card"' not in html:
        failures.append("Social preview metadata is incomplete")

    optimized_size = sum(path.stat().st_size for path in (ROOT / "assets" / "optimized").glob("*.webp"))
    if optimized_size > 2_500_000:
        failures.append(f"Optimized image payload is too large: {optimized_size} bytes")

    if failures:
        print("QA FAIL")
        for failure in failures:
            print(f"- {failure}")
        raise SystemExit(1)

    print("QA PASS")
    print(f"- Headings: {parser.headings}")
    print(f"- Local references checked: {len(set(parser.local_references))}")
    print(f"- Fragment links checked: {len(parser.fragments)}")
    print(f"- Optimized image payload: {optimized_size / 1_000_000:.2f} MB")


if __name__ == "__main__":
    main()

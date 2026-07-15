from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUTPUT = ASSETS / "optimized"


def open_rgb(path: Path) -> Image.Image:
    with Image.open(path) as image:
        return ImageOps.exif_transpose(image).convert("RGB")


def save_webp(source: Path, destination: Path, max_size: tuple[int, int], quality: int) -> None:
    image = open_rgb(source)
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "WEBP", quality=quality, method=6)
    print(f"{destination.relative_to(ROOT)} {image.width}x{image.height}")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)

    hero_source = ASSETS / "hero-photo.jpg.jpeg"
    save_webp(hero_source, OUTPUT / "hero.webp", (1600, 2000), 84)
    save_webp(hero_source, OUTPUT / "hero-960.webp", (960, 1440), 80)

    for index in range(1, 11):
        source = ASSETS / f"photo-{index:02}.jpg.jpeg"
        save_webp(source, OUTPUT / f"photo-{index:02}.webp", (1600, 1600), 82)

    for index in range(1, 10):
        filename = "thumb-04..jpg.jpeg" if index == 4 else f"thumb-{index:02}.jpg.jpeg"
        source = ASSETS / filename
        save_webp(source, OUTPUT / f"thumb-{index:02}.webp", (1440, 1440), 80)

    hero = open_rgb(hero_source)
    social = ImageOps.fit(
        hero,
        (1200, 630),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.08),
    )
    social.save(OUTPUT / "og-ofri-kraus.webp", "WEBP", quality=86, method=6)
    print("assets/optimized/og-ofri-kraus.webp 1200x630")

    favicon = Image.new("RGB", (64, 64), "#a5c39a")
    draw = ImageDraw.Draw(favicon)
    font_path = Path(r"C:\Windows\Fonts\arialbd.ttf")
    font = ImageFont.truetype(str(font_path), 43) if font_path.exists() else ImageFont.load_default()
    glyph = "ע"
    bounds = draw.textbbox((0, 0), glyph, font=font)
    glyph_width = bounds[2] - bounds[0]
    glyph_height = bounds[3] - bounds[1]
    draw.text(
        ((64 - glyph_width) / 2, (64 - glyph_height) / 2 - bounds[1]),
        glyph,
        fill="#111510",
        font=font,
    )
    favicon.save(OUTPUT / "favicon.png", "PNG", optimize=True)
    print("assets/optimized/favicon.png 64x64")


if __name__ == "__main__":
    main()

"""生成应用图标：把启动页图案居中放到 1024×1024 的蓝色底图上。

用法（在项目根目录执行）：
    python scripts/make_icon.py
依赖：
    pip install pillow
"""

from pathlib import Path

from PIL import Image

# 以脚本所在目录定位项目根目录，避免在不同工作目录下运行时报路径错误
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE = PROJECT_ROOT / "assets" / "images" / "splash-icon.png"
TARGET = PROJECT_ROOT / "assets" / "images" / "app-icon-square.png"

# 与 app.json 中的背景色保持一致
BACKGROUND_COLOR = (32, 138, 239, 255)
SIZE = 1024


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"找不到源图：{SOURCE}")

    img = Image.open(SOURCE).convert("RGBA")

    background = Image.new("RGBA", (SIZE, SIZE), BACKGROUND_COLOR)

    # 等比例缩放到画布内，保留原图案
    img.thumbnail((SIZE, SIZE), Image.Resampling.LANCZOS)

    x = (SIZE - img.width) // 2
    y = (SIZE - img.height) // 2

    background.alpha_composite(img, (x, y))
    background.convert("RGB").save(TARGET)

    print("图标制作成功")
    print(f"尺寸：{SIZE} × {SIZE}")
    print(f"文件：{TARGET}")


if __name__ == "__main__":
    main()

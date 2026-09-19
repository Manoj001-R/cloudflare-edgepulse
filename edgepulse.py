import sys
from pathlib import Path

# Fix Windows console UTF-8 encoding safely
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Add python directory to sys.path so edgepulse package can be resolved
python_dir = Path(__file__).resolve().parent / "python"
if str(python_dir) not in sys.path:
    sys.path.insert(0, str(python_dir))

from edgepulse.cli import main

if __name__ == "__main__":
    main()

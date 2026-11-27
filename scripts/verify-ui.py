#!/usr/bin/env python3
"""Compatibility shim. The gate implementation lives once in kb.

New repositories keep this thin entry point and gate.config.json; they do not
duplicate any checker code. Run either `python3 scripts/verify-ui.py ...` or
`gate ui verify ...`.
"""

import subprocess
import sys

sys.exit(subprocess.call(["gate", "ui", "verify", *sys.argv[1:]]))

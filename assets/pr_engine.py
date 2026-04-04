#!/usr/bin/env python3
"""
PR Engine - CLI wrapper for PR Creator.

This module acts as the integration bridge between the TypeScript frontend
and the Python PR Creator backend.
"""
import logging
import json
import sys
import traceback
from pr_creator.main import main

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.info("Aborted.")
        sys.exit(0)
    except Exception as exc:
        sys.stdout.write(
            json.dumps({"error": f"Unexpected error: {exc}"}) + "\n"
        )
        traceback.print_exc()
        sys.exit(1)

#!/usr/bin/env python3
"""
PR Engine - CLI wrapper for PR Creator.

This module acts as the integration bridge between the TypeScript frontend
and the Python PR Creator backend.
"""
import logging
import sys
from pr_creator.main import main

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.info("Aborted.")
        sys.exit(0)

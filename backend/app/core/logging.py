import logging
import sys
from datetime import datetime


def setup_logging() -> logging.Logger:
    """Configure application logging."""
    logger = logging.getLogger("notedock")
    logger.setLevel(logging.INFO)

    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)

    # Format: timestamp [LEVEL] message
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)

    logger.addHandler(handler)

    return logger


# Global logger instance
logger = setup_logging()


def log_info(message: str) -> None:
    """Log info level message."""
    logger.info(message)


def log_warning(message: str) -> None:
    """Log warning level message."""
    logger.warning(message)


def log_error(message: str) -> None:
    """Log error level message."""
    logger.error(message)

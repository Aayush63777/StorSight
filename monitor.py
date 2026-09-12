"""StorSight monitoring worker.

Run one collection cycle for a deployment check:
    python monitor.py --once

Run continuously as a separate process in production:
    python monitor.py --loop
"""

import argparse
import logging
import os
import signal
import time

import redis

from app import create_app
from app.extensions import db
from app.services.monitoring_service import MonitoringService


logger = logging.getLogger("storsight.monitor")
_stop_requested = False


def _stop(_signum, _frame):
    global _stop_requested
    _stop_requested = True


def run_once(app) -> dict:
    """Run one locked monitoring cycle."""
    redis_uri = app.config["RATE_LIMIT_STORAGE_URI"]
    client = redis.Redis.from_url(redis_uri, socket_timeout=2)
    lock = client.lock(
        "storsight:monitoring-cycle",
        timeout=max(app.config["MONITORING_INTERVAL_SECONDS"] * 2, 60),
        blocking_timeout=1,
    )
    if not lock.acquire(blocking=True):
        return {"status": "skipped", "reason": "cycle already running"}
    try:
        with app.app_context():
            result = MonitoringService().run_once()
            db.session.remove()
            return {"status": "ok", **result}
    finally:
        try:
            lock.release()
        except redis.exceptions.LockError:
            logger.warning("Monitoring lock expired before release")


def main() -> int:
    parser = argparse.ArgumentParser(description="StorSight monitoring worker")
    parser.add_argument("--once", action="store_true", help="collect one cycle and exit")
    parser.add_argument("--loop", action="store_true", help="run continuously")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    app = create_app(os.getenv("APP_ENV", "production"))
    if not app.config.get("MONITORING_ENABLED", True):
        logger.info("Monitoring is disabled by configuration")
        return 0
    signal.signal(signal.SIGTERM, _stop)
    signal.signal(signal.SIGINT, _stop)

    if args.once or not args.loop:
        logger.info("Monitoring cycle result: %s", run_once(app))
        return 0

    interval = app.config["MONITORING_INTERVAL_SECONDS"]
    while not _stop_requested:
        try:
            logger.info("Monitoring cycle result: %s", run_once(app))
        except Exception:
            logger.exception("Monitoring cycle failed")
        if not _stop_requested:
            time.sleep(interval)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

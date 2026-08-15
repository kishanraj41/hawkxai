import json
import os
import sys
import unittest
from dataclasses import asdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from booster_agent import (
    boost_trends,
    capture_artifacts,
    load_payload,
    why_trending,
)


FIXTURE = os.path.join(HERE, "..", "fixtures", "sample_trends.json")


class BoosterTests(unittest.TestCase):
    def setUp(self):
        self.payload = load_payload(FIXTURE)
        self.topics = {t["id"]: t for t in self.payload["topics"]}

    def test_captures_hashtag_qr_url(self):
        arts = capture_artifacts(self.topics["qr-summer-drop"])
        kinds = {a.kind for a in arts}
        values = {a.value.lower() for a in arts}
        self.assertIn("hashtag", kinds)
        self.assertIn("qr", kinds)
        self.assertTrue(any("heatwavefit" in v for v in values))
        self.assertTrue(any("qrco.de" in v or "qr campaign" in v for v in values))

    def test_why_uses_receipts_not_fiction(self):
        topic = self.topics["airline-outage"]
        why, conf = why_trending(topic, capture_artifacts(topic))
        self.assertGreater(conf, 0.2)
        self.assertIn("bubble", why.lower())
        self.assertNotIn("invent", why.lower())

    def test_age_lenses_and_improvisations(self):
        report = boost_trends(self.payload)
        self.assertEqual(len(report.briefs[0].audiences), 5)
        self.assertTrue(report.improvisations)
        self.assertIn(report.improvisations[0].priority, {"P0", "P1", "P2"})
        blob = json.dumps(asdict(report.briefs[1]))
        self.assertIn("DAL", blob)


if __name__ == "__main__":
    unittest.main()

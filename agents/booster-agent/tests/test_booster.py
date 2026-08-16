import json
import os
import sys
import unittest
from dataclasses import asdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from booster_agent import (
    boost_topic,
    boost_trends,
    build_causation,
    build_mind_map,
    build_sentiment,
    capture_artifacts,
    classify_topic,
    diff_snapshots,
    format_keep_brief,
    infer_query_intent,
    load_payload,
    snapshot_of,
    takeaway_for,
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

    def test_category_plugs(self):
        self.assertEqual(classify_topic(self.topics["qr-summer-drop"], capture_artifacts(self.topics["qr-summer-drop"])), "campaigns")
        self.assertEqual(classify_topic(self.topics["airline-outage"], capture_artifacts(self.topics["airline-outage"])), "markets")
        self.assertEqual(classify_topic(self.topics["gulf-storm"], capture_artifacts(self.topics["gulf-storm"])), "weather")

    def test_causation_is_measured_not_invented(self):
        thin = build_causation(self.topics["airline-outage"], capture_artifacts(self.topics["airline-outage"]))
        self.assertTrue(thin.thin)
        self.assertEqual(thin.first_platform, "x")
        storm = build_causation(self.topics["gulf-storm"], capture_artifacts(self.topics["gulf-storm"]))
        self.assertFalse(storm.thin)
        self.assertTrue(any(d.id.startswith("heat-") for d in storm.drivers))
        blob = " ".join(d.evidence.lower() for d in storm.drivers)
        self.assertNotIn("invent", blob)

    def test_mind_map_hub_is_looked_up_phrase(self):
        report = boost_trends(self.payload)
        graph = build_mind_map(self.payload["topics"], report.briefs, hub_label="#HeatWaveFit")
        hub = next(n for n in graph.nodes if n.kind == "hub")
        self.assertEqual(hub.label, "#HeatWaveFit")
        self.assertIn("prints", hub.detail.lower())

    def test_mind_map_hub_and_receipts_only(self):
        report = boost_trends(self.payload)
        graph = report.mind
        self.assertIsNotNone(graph)
        self.assertTrue(any(n.kind == "hub" for n in graph.nodes))
        captured = {a.value.lower()[:28] for b in report.briefs for a in b.artifacts}
        for node in graph.nodes:
            if node.kind == "artifact":
                self.assertIn(node.label.lower(), captured)
        # Fixture topics do not share artifacts — never invent a bridge.
        self.assertEqual(graph.bridges, 0)
        self.assertFalse(any(l.kind == "shared" for l in graph.links))

    def test_mind_map_shared_link_requires_real_artifact(self):
        a = json.loads(json.dumps(self.topics["qr-summer-drop"]))
        b = json.loads(json.dumps(self.topics["qr-summer-drop"]))
        a["id"] = "campaign-a"
        b["id"] = "campaign-b"
        b["label"] = "HeatWaveFit mall takeover"
        briefs = [boost_topic(a), boost_topic(b)]
        graph = build_mind_map([a, b], briefs)
        self.assertGreaterEqual(graph.bridges, 1)
        shared = [l for l in graph.links if l.kind == "shared"]
        self.assertTrue(shared)
        real = {art.value.lower() for brief in briefs for art in brief.artifacts}
        for link in shared:
            self.assertIsNotNone(link.label)
            self.assertIn(link.label.lower(), real)

    def test_query_intent_guesses_product_and_campaign(self):
        camry = infer_query_intent("Camry")
        self.assertEqual(camry["kind"], "product")
        self.assertEqual(camry["category"], "markets")
        self.assertTrue(any("toyota" in a.lower() for a in camry["aliases"]))
        tag = infer_query_intent("#HeatWaveFit")
        self.assertEqual(tag["kind"], "hashtag")
        self.assertEqual(tag["category"], "campaigns")

    def test_sentiment_from_titles_not_invented(self):
        pos = {
            "id": "camry-pos",
            "label": "Camry",
            "platforms": {
                "x": {"score": 40, "posts": [{"platform": "x", "title": "Camry demand hits a record", "url": "https://x.com/1", "score": 40, "createdAt": "2026-08-16T12:00:00.000Z"}]},
                "reddit": {"score": 20, "posts": [{"platform": "reddit", "title": "Great Camry launch, waitlist is real", "url": "https://reddit.com/1", "score": 20, "createdAt": "2026-08-16T12:10:00.000Z"}]},
                "hn": {"score": 0, "posts": []},
                "public": {"score": 0, "posts": []},
            },
            "velocity": "rising",
            "divergence": 0.3,
            "tickers": [],
        }
        sent = build_sentiment(pos)
        self.assertEqual(sent.lean, "pos")
        self.assertGreater(sent.overall.pos, sent.overall.neg)
        self.assertTrue(sent.hits)
        self.assertTrue(all(h.url.startswith("http") for h in sent.hits))
        blob = " ".join(d.evidence.lower() for d in sent.drivers)
        self.assertNotIn("invent", blob)
        brief = boost_topic(pos)
        self.assertEqual(brief.sentiment.lean, "pos")
        self.assertIn("positive", brief.why_trending.lower())

    def test_keep_brief_uses_receipts_not_fiction(self):
        topic = self.topics["qr-summer-drop"]
        brief = boost_topic(topic)
        md = format_keep_brief(topic, brief, query={"kind": "hashtag", "category": "campaigns", "match": "exact", "hitCount": 2, "floor": "Floor: #HeatWaveFit printed."}, lens="kids")
        self.assertIn("# HawkAI brief", md)
        self.assertIn("Play", md)
        self.assertIn("Family", md)
        self.assertIn("Evidence only", md)
        self.assertNotIn("invent", md.lower().replace("invented cause", ""))
        self.assertNotIn("## Audiences", md)
        all_ages = format_keep_brief(topic, brief)
        self.assertIn("## Audiences", all_ages)
        family = takeaway_for(brief, "kids")
        self.assertIsNotNone(family)
        self.assertEqual(family.lens, "kids")

    def test_tape_watch_deltas_are_measured(self):
        topic = json.loads(json.dumps(self.topics["airline-outage"]))
        brief = boost_topic(topic)
        prev = snapshot_of(topic, brief, "2026-08-16T12:00:00.000Z")
        nxt = dict(prev)
        nxt["velocity"] = "peaking"
        nxt["lean"] = "neg"
        nxt["pos"] = 1
        nxt["neg"] = 8
        nxt["receipt_count"] = prev["receipt_count"] + 3
        lines = diff_snapshots(prev, nxt)
        blob = " ".join(lines).lower()
        self.assertTrue(any("→" in line for line in lines))
        self.assertIn("receipts", blob)
        self.assertNotIn("because", blob)
        self.assertNotIn("invent", blob)
        same = diff_snapshots(prev, prev)
        self.assertEqual(same, [])


if __name__ == "__main__":
    unittest.main()

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from smartsalesguy import (  # noqa: E402
    BANNED,
    REQUIRED_SECTIONS,
    build_dossier,
    compose_one_pager,
    run_sales,
    score_pitch,
    self_check,
    word_count,
)


ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))


class SmartSalesGuyTests(unittest.TestCase):
    def setUp(self):
        self.proposal = run_sales(ROOT)

    def test_checkout_finds_hawkai(self):
        dossier = self.proposal.dossier
        self.assertEqual(dossier.product, "HawkAI")
        self.assertTrue(dossier.git)
        self.assertTrue(dossier.git.root)
        self.assertTrue(dossier.current)
        names = " ".join(f.name.lower() for f in dossier.current)
        self.assertTrue("trend" in names or "booster" in names, names)

    def test_agents_list_comes_from_checkout(self):
        agents = self.proposal.dossier.agents
        slugs = " ".join(feat.evidence.lower() for feat in agents)
        names = " ".join(feat.name.lower() for feat in agents)
        self.assertGreaterEqual(len(agents), 5, names)
        self.assertIn("booster-agent", slugs)
        self.assertIn("smartsalesguy", slugs)
        self.assertIn("docker-ci", slugs)
        pager = self.proposal.one_pager.lower()
        self.assertIn("## agents", pager)
        self.assertIn("smartsalesguy", pager)
        self.assertIn("booster agent", pager)

    def test_future_comes_from_backlog_not_fiction(self):
        names = " ".join(f.name.lower() for f in self.proposal.dossier.future)
        self.assertTrue(
            "tiktok" in names or "qr" in names or "brief" in names,
            names,
        )
        for feat in self.proposal.dossier.future:
            self.assertFalse(feat.name.startswith("**"))
            self.assertTrue(
                "IMPROVISATIONS.md" in feat.evidence or "CORE_IDEA.md" in feat.evidence,
                feat.evidence,
            )

    def test_one_pager_is_a_vc_proposal(self):
        pager = self.proposal.one_pager.lower()
        for section in REQUIRED_SECTIONS:
            self.assertIn(section.lower(), pager)
        self.assertIn("problem", pager)
        self.assertIn("proposal", pager)
        self.assertGreaterEqual(self.proposal.word_count, 380)
        self.assertLessEqual(self.proposal.word_count, 900)

    def test_founder_voice_has_no_hype_or_fake_traction(self):
        pager = self.proposal.one_pager.lower()
        for phrase in BANNED:
            self.assertNotIn(phrase, pager)
        self.assertNotRegex(pager, r"\$\d+\s*(arr|mrr)")
        self.assertIn("footprint", pager)
        self.assertNotIn("$5-8b", pager.replace(" ", ""))
        self.assertNotIn("x-access-token", pager)

    def test_score_fails_hype_draft(self):
        dossier = build_dossier(ROOT)
        bad = compose_one_pager(dossier) + "\nThis is a revolutionary AI-powered platform.\n"
        score = score_pitch(bad, dossier)
        self.assertFalse(score.passed)

    def test_word_count_helper(self):
        self.assertEqual(word_count("HawkAI ships a live map."), 5)

    def test_self_check(self):
        self.assertEqual(self_check(ROOT), 0)


if __name__ == "__main__":
    unittest.main()

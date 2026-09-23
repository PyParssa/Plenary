import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from main import app
from auth import AuthenticatedUser, require_manager, get_current_user


class AdminRoutesTestCase(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        app.dependency_overrides.clear()

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_admin_cards_requires_auth(self):
        """Accessing /api/admin/cards without authorization should return 401."""
        response = self.client.get("/api/admin/cards")
        self.assertEqual(response.status_code, 401)

    def test_admin_cards_requires_manager_role(self):
        """A user with role 'user' or 'creator' should receive 403 Forbidden."""
        regular_user = AuthenticatedUser(id="u-123", email="user@example.com", role="user")
        app.dependency_overrides[get_current_user] = lambda: regular_user

        response = self.client.get("/api/admin/cards")
        self.assertEqual(response.status_code, 403)
        self.assertIn("Manager role required", response.json().get("detail", ""))

    def test_admin_cards_list_as_manager(self):
        """A manager should be able to fetch the list of cards."""
        manager_user = AuthenticatedUser(id="m-1", email="admin@example.com", role="manager")
        app.dependency_overrides[require_manager] = lambda: manager_user

        mock_db = MagicMock()
        mock_query = MagicMock()
        mock_db.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.range.return_value = mock_query
        mock_query.execute.return_value = MagicMock(
            data=[
                {
                    "id": "q-1",
                    "category": "Existential Inquiry",
                    "author": "Viktor Frankl",
                    "author_avatar": "",
                    "author_bio": "",
                    "book": "Man's Search for Meaning",
                    "question": "What would you attempt?",
                    "backstory": "Test backstory",
                    "related_inquiries": [],
                    "vouch_count": 5,
                    "published": True,
                    "created_by": "m-1",
                    "created_at": "2026-09-23T00:00:00Z",
                }
            ],
            count=1,
        )

        with patch("admin.get_supabase_admin", return_value=mock_db):
            response = self.client.get("/api/admin/cards?page=1&per_page=10")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["total"], 1)
            self.assertEqual(len(data["cards"]), 1)
            self.assertEqual(data["cards"][0]["id"], "q-1")
            self.assertTrue(data["cards"][0]["published"])

    def test_admin_card_update(self):
        """Manager can update card fields and toggle publish status."""
        manager_user = AuthenticatedUser(id="m-1", email="admin@example.com", role="manager")
        app.dependency_overrides[require_manager] = lambda: manager_user

        mock_db = MagicMock()
        mock_table = MagicMock()
        mock_db.table.return_value = mock_table
        mock_table.update.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = MagicMock(
            data=[{"id": "q-1", "question": "Updated question", "published": False}]
        )

        with patch("admin.get_supabase_admin", return_value=mock_db):
            response = self.client.patch(
                "/api/admin/cards/q-1",
                json={"question": "Updated question", "published": False},
            )
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["ok"])
            self.assertFalse(response.json()["card"]["published"])

    def test_admin_card_delete(self):
        """Manager can delete a card."""
        manager_user = AuthenticatedUser(id="m-1", email="admin@example.com", role="manager")
        app.dependency_overrides[require_manager] = lambda: manager_user

        mock_db = MagicMock()
        mock_table = MagicMock()
        mock_db.table.return_value = mock_table
        mock_table.delete.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = MagicMock(data=[{"id": "q-1"}])

        with patch("admin.get_supabase_admin", return_value=mock_db):
            response = self.client.delete("/api/admin/cards/q-1")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), {"ok": True, "id": "q-1"})

    def test_admin_bulk_import(self):
        """Manager can bulk import cards."""
        manager_user = AuthenticatedUser(id="m-1", email="admin@example.com", role="manager")
        app.dependency_overrides[require_manager] = lambda: manager_user

        mock_db = MagicMock()
        mock_table = MagicMock()
        mock_db.table.return_value = mock_table
        mock_table.insert.return_value = mock_table
        mock_table.execute.return_value = MagicMock(data=[{}])

        with patch("admin.get_supabase_admin", return_value=mock_db):
            payload = {
                "cards": [
                    {
                        "category": "Existential Inquiry",
                        "author": "Marcus Aurelius",
                        "book": "Meditations",
                        "question": "Is this essential?",
                        "backstory": "Stoic reflection",
                        "related_inquiries": ["Why?", "When?"],
                        "published": True,
                    }
                ]
            }
            response = self.client.post("/api/admin/cards/import", json=payload)
            self.assertEqual(response.status_code, 200)
            res_data = response.json()
            self.assertEqual(res_data["imported"], 1)
            self.assertEqual(res_data["failed"], 0)

    def test_admin_export_csv(self):
        """Export cards as CSV returns proper Content-Disposition and text/csv."""
        manager_user = AuthenticatedUser(id="m-1", email="admin@example.com", role="manager")
        app.dependency_overrides[require_manager] = lambda: manager_user

        mock_db = MagicMock()
        mock_query = MagicMock()
        mock_db.table.return_value = mock_query
        mock_query.select.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(
            data=[
                {
                    "id": "q-1",
                    "category": "Existential Inquiry",
                    "author": "Viktor Frankl",
                    "author_avatar": "",
                    "author_bio": "",
                    "book": "Man's Search for Meaning",
                    "question": "What would you attempt?",
                    "backstory": "Test",
                    "related_inquiries": ["Q1"],
                    "vouch_count": 10,
                    "published": True,
                    "created_at": "2026-09-23T00:00:00Z",
                }
            ]
        )

        with patch("admin.get_supabase_admin", return_value=mock_db):
            response = self.client.get("/api/admin/cards/export?format=csv")
            self.assertEqual(response.status_code, 200)
            self.assertIn("text/csv", response.headers.get("content-type", ""))
            self.assertIn("plenary_cards.csv", response.headers.get("content-disposition", ""))
            self.assertIn("Viktor Frankl", response.text)

    def test_admin_self_demotion_guard(self):
        """Manager attempting to demote their own account should receive 400 Bad Request."""
        manager_user = AuthenticatedUser(id="m-1", email="admin@example.com", role="manager")
        app.dependency_overrides[require_manager] = lambda: manager_user

        response = self.client.patch(
            "/api/admin/users/m-1/role",
            json={"role": "user"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "cannot remove the manager role from your own account",
            response.json().get("detail", "").lower(),
        )

    def test_admin_analytics_summary(self):
        """Manager can fetch analytics summary."""
        manager_user = AuthenticatedUser(id="m-1", email="admin@example.com", role="manager")
        app.dependency_overrides[require_manager] = lambda: manager_user

        mock_db = MagicMock()
        mock_table = MagicMock()
        mock_db.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.order.return_value = mock_table
        mock_table.limit.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.gte.return_value = mock_table
        mock_table.in_.return_value = mock_table
        mock_table.execute.return_value = MagicMock(data=[], count=12)

        with patch("admin.get_supabase_admin", return_value=mock_db):
            response = self.client.get("/api/admin/analytics")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("totalUsers", data)
            self.assertIn("totalCards", data)
            self.assertIn("publishedCards", data)
            self.assertIn("totalVouches", data)
            self.assertIn("topCards", data)
            self.assertIn("mostActiveReflectors", data)


if __name__ == "__main__":
    unittest.main()


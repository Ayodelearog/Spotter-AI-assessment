from datetime import datetime

from django.test import SimpleTestCase

from .services import STATUS_DRIVING, STATUS_OFF, TripPlanner


class TripPlannerTests(SimpleTestCase):
    def test_sheet_item_uses_hour_24_for_midnight(self):
        planner = TripPlanner("Dallas, TX", "Memphis, TN", "Atlanta, GA", 12)
        item = planner._sheet_item(
            datetime(2026, 4, 24, 23, 0),
            datetime(2026, 4, 25, 0, 0),
            STATUS_DRIVING,
            "Drive",
        )

        self.assertEqual(item["startHour"], 23)
        self.assertEqual(item["endHour"], 24)
        self.assertEqual(item["hours"], 1)

    def test_render_sheet_accumulates_totals(self):
        planner = TripPlanner("Dallas, TX", "Memphis, TN", "Atlanta, GA", 12)
        day = datetime(2026, 4, 24, 0, 0)
        items = [
            planner._sheet_item(day, day.replace(hour=8), STATUS_OFF, "Off duty"),
            planner._sheet_item(day.replace(hour=8), day.replace(hour=16), STATUS_DRIVING, "Drive"),
        ]

        rendered = planner._render_sheet(day, items)

        self.assertEqual(rendered["totals"]["offDuty"], 8)
        self.assertEqual(rendered["totals"]["driving"], 8)

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from urllib.parse import quote
from urllib.request import Request, urlopen


MILES_PER_KM = 0.621371
DEFAULT_START_HOUR = 6
PICKUP_AND_DROPOFF_HOURS = 1
BREAK_HOURS = 0.5
FUEL_STOP_HOURS = 0.5
RESET_HOURS = 10
RESTART_34_HOURS = 34
DRIVING_LIMIT_HOURS = 11
WINDOW_LIMIT_HOURS = 14
BREAK_AFTER_HOURS = 8
FUEL_INTERVAL_MILES = 1000
CYCLE_LIMIT_HOURS = 70
AVERAGE_SPEED_MPH_FALLBACK = 55

STATUS_OFF = "off_duty"
STATUS_SLEEPER = "sleeper"
STATUS_DRIVING = "driving"
STATUS_ON = "on_duty"


CITY_FALLBACKS = {
    "dallas, tx": {"lat": 32.7767, "lng": -96.797, "label": "Dallas, TX"},
    "memphis, tn": {"lat": 35.1495, "lng": -90.049, "label": "Memphis, TN"},
    "atlanta, ga": {"lat": 33.749, "lng": -84.388, "label": "Atlanta, GA"},
    "chicago, il": {"lat": 41.8781, "lng": -87.6298, "label": "Chicago, IL"},
    "denver, co": {"lat": 39.7392, "lng": -104.9903, "label": "Denver, CO"},
}


class PlanningError(Exception):
    pass


@dataclass
class DutyState:
    current_time: datetime
    cycle_used: float
    day_driving: float
    day_elapsed: float
    driving_since_break: float
    miles_since_fuel: float


class TripPlanner:
    def __init__(self, current_location: str, pickup_location: str, dropoff_location: str, current_cycle_used: float):
        self.current_location = current_location.strip()
        self.pickup_location = pickup_location.strip()
        self.dropoff_location = dropoff_location.strip()
        self.current_cycle_used = float(current_cycle_used)
        self.route_points = []
        self.schedule = []
        self.stop_markers = []
        self.assets = {
            "carrier_name": "Spotter Dispatch Demo",
            "main_office_address": "Remote Operations Hub",
            "home_terminal_address": self.current_location,
            "vehicle_numbers": "TRK-204 / TRL-91",
            "shipping_document": "AUTO-GENERATED ROUTE PLAN",
        }

    def plan(self) -> dict:
        self._validate()

        current = self._geocode(self.current_location)
        pickup = self._geocode(self.pickup_location)
        dropoff = self._geocode(self.dropoff_location)

        first_leg = self._route_between(current, pickup, "current_to_pickup")
        second_leg = self._route_between(pickup, dropoff, "pickup_to_dropoff")

        now = datetime.now()
        start_time = now.replace(hour=DEFAULT_START_HOUR, minute=0, second=0, microsecond=0)
        if now > start_time:
            start_time = now.replace(second=0, microsecond=0)

        state = DutyState(
            current_time=start_time,
            cycle_used=self.current_cycle_used,
            day_driving=0.0,
            day_elapsed=0.0,
            driving_since_break=0.0,
            miles_since_fuel=0.0,
        )

        self._add_stop_marker("start", "Trip start", current, state.current_time, 0, self.current_location)
        state = self._travel_leg(first_leg, "Drive to pickup", state)
        state = self._add_on_duty_block(
            state,
            PICKUP_AND_DROPOFF_HOURS,
            "Pickup",
            self.pickup_location,
            pickup,
        )
        state = self._travel_leg(second_leg, "Drive to dropoff", state)
        state = self._add_on_duty_block(
            state,
            PICKUP_AND_DROPOFF_HOURS,
            "Dropoff",
            self.dropoff_location,
            dropoff,
        )

        return {
            "summary": self._build_summary(first_leg, second_leg, state),
            "map": {
                "center": pickup,
                "routePolyline": self.route_points,
                "markers": self.stop_markers,
            },
            "stops": self.stop_markers,
            "logSheets": self._build_log_sheets(),
            "assumptions": [
                "Property-carrying driver",
                "70-hour / 8-day cycle",
                "11-hour driving limit and 14-hour duty window",
                "30-minute break after 8 cumulative driving hours",
                "Fuel stop every 1,000 miles",
                "1 hour for pickup and 1 hour for dropoff",
                "Automatic 34-hour restart if remaining cycle hours are exhausted",
            ],
        }

    def _validate(self) -> None:
        if not self.current_location or not self.pickup_location or not self.dropoff_location:
            raise PlanningError("Current, pickup, and dropoff locations are all required.")
        if self.current_cycle_used < 0 or self.current_cycle_used > CYCLE_LIMIT_HOURS:
            raise PlanningError("Current cycle used must be between 0 and 70 hours.")

    def _geocode(self, query: str) -> dict:
        url = (
            "https://nominatim.openstreetmap.org/search?"
            f"q={quote(query)}&format=jsonv2&limit=1"
        )
        request = Request(url, headers={"User-Agent": "spotter-assessment/1.0"})

        try:
            with urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except Exception:
            payload = []

        if payload:
            top = payload[0]
            return {
                "lat": float(top["lat"]),
                "lng": float(top["lon"]),
                "label": top["display_name"],
            }

        fallback = CITY_FALLBACKS.get(query.lower())
        if fallback:
            return fallback

        raise PlanningError(f"Unable to geocode '{query}'. Try a more specific city or address.")

    def _route_between(self, start: dict, end: dict, leg_id: str) -> dict:
        url = (
            "https://router.project-osrm.org/route/v1/driving/"
            f"{start['lng']},{start['lat']};{end['lng']},{end['lat']}"
            "?overview=full&geometries=geojson&steps=false"
        )
        request = Request(url, headers={"User-Agent": "spotter-assessment/1.0"})

        try:
            with urlopen(request, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
                route = payload["routes"][0]
                geometry = [
                    {"lat": lat, "lng": lng}
                    for lng, lat in route["geometry"]["coordinates"]
                ]
                return {
                    "id": leg_id,
                    "start": start,
                    "end": end,
                    "distance_miles": route["distance"] / 1000 * MILES_PER_KM,
                    "duration_hours": route["duration"] / 3600,
                    "geometry": geometry,
                }
        except Exception:
            pass

        distance_miles = self._haversine_miles(start, end) * 1.18
        duration_hours = distance_miles / AVERAGE_SPEED_MPH_FALLBACK
        return {
            "id": leg_id,
            "start": start,
            "end": end,
            "distance_miles": distance_miles,
            "duration_hours": duration_hours,
            "geometry": [start, end],
        }

    def _travel_leg(self, leg: dict, leg_label: str, state: DutyState) -> DutyState:
        remaining_hours = leg["duration_hours"]
        speed = max(leg["distance_miles"] / max(leg["duration_hours"], 0.1), 1)
        progress_miles = 0.0

        if not self.route_points:
            self.route_points.extend(leg["geometry"])
        else:
            self.route_points.extend(leg["geometry"][1:])

        while remaining_hours > 0.02:
            cycle_remaining = CYCLE_LIMIT_HOURS - state.cycle_used
            if cycle_remaining <= 0.01:
                state = self._take_restart(state, leg, progress_miles)
                continue

            if state.driving_since_break >= BREAK_AFTER_HOURS - 0.01:
                state = self._add_off_duty_block(
                    state,
                    BREAK_HOURS,
                    "30-minute break",
                    self._point_for_progress(leg, progress_miles),
                )
                continue

            if state.miles_since_fuel >= FUEL_INTERVAL_MILES - 0.01:
                state = self._add_on_duty_block(
                    state,
                    FUEL_STOP_HOURS,
                    "Fuel stop",
                    self._progress_label(leg_label, progress_miles, leg["distance_miles"]),
                    self._point_for_progress(leg, progress_miles),
                )
                state.miles_since_fuel = 0.0
                continue

            drive_available = min(
                DRIVING_LIMIT_HOURS - state.day_driving,
                WINDOW_LIMIT_HOURS - state.day_elapsed,
                BREAK_AFTER_HOURS - state.driving_since_break,
                cycle_remaining,
                remaining_hours,
            )

            if drive_available <= 0.01:
                state = self._take_reset(state, leg, progress_miles)
                continue

            miles_until_fuel = FUEL_INTERVAL_MILES - state.miles_since_fuel
            drive_available = min(drive_available, miles_until_fuel / speed)

            drive_miles = speed * drive_available
            start_time = state.current_time
            end_time = start_time + timedelta(hours=drive_available)

            self.schedule.append(
                {
                    "status": STATUS_DRIVING,
                    "label": leg_label,
                    "location": self._progress_label(leg_label, progress_miles + drive_miles, leg["distance_miles"]),
                    "start": start_time,
                    "end": end_time,
                    "miles": round(drive_miles, 1),
                }
            )

            remaining_hours = max(remaining_hours - drive_available, 0)
            progress_miles += drive_miles

            state = DutyState(
                current_time=end_time,
                cycle_used=state.cycle_used + drive_available,
                day_driving=state.day_driving + drive_available,
                day_elapsed=state.day_elapsed + drive_available,
                driving_since_break=state.driving_since_break + drive_available,
                miles_since_fuel=state.miles_since_fuel + drive_miles,
            )

        self._add_stop_marker("arrival", f"Arrive: {leg_label}", leg["end"], state.current_time, 0, leg["end"]["label"])
        return state

    def _take_reset(self, state: DutyState, leg: dict, progress_miles: float) -> DutyState:
        reset_state = DutyState(
            current_time=state.current_time,
            cycle_used=state.cycle_used,
            day_driving=0,
            day_elapsed=0,
            driving_since_break=0,
            miles_since_fuel=state.miles_since_fuel,
        )
        return self._add_off_duty_block(
            reset_state,
            RESET_HOURS,
            "10-hour overnight reset",
            self._point_for_progress(leg, progress_miles),
        )

    def _take_restart(self, state: DutyState, leg: dict, progress_miles: float) -> DutyState:
        restart_state = DutyState(
            current_time=state.current_time,
            cycle_used=0,
            day_driving=0,
            day_elapsed=0,
            driving_since_break=0,
            miles_since_fuel=state.miles_since_fuel,
        )
        restarted = self._add_off_duty_block(
            restart_state,
            RESTART_34_HOURS,
            "34-hour restart",
            self._point_for_progress(leg, progress_miles),
        )
        restarted.cycle_used = 0
        return restarted

    def _add_on_duty_block(self, state: DutyState, hours: float, label: str, location_label: str, coordinates: dict) -> DutyState:
        if state.day_elapsed + hours > WINDOW_LIMIT_HOURS:
            state = self._add_off_duty_block(
                DutyState(
                    current_time=state.current_time,
                    cycle_used=state.cycle_used,
                    day_driving=0,
                    day_elapsed=0,
                    driving_since_break=0,
                    miles_since_fuel=state.miles_since_fuel,
                ),
                RESET_HOURS,
                "10-hour overnight reset",
                coordinates,
            )

        start_time = state.current_time
        end_time = start_time + timedelta(hours=hours)
        self.schedule.append(
            {
                "status": STATUS_ON,
                "label": label,
                "location": location_label,
                "start": start_time,
                "end": end_time,
                "miles": 0.0,
            }
        )
        self._add_stop_marker("duty", label, coordinates, start_time, hours, location_label)
        return DutyState(
            current_time=end_time,
            cycle_used=state.cycle_used + hours,
            day_driving=state.day_driving,
            day_elapsed=state.day_elapsed + hours,
            driving_since_break=state.driving_since_break,
            miles_since_fuel=state.miles_since_fuel,
        )

    def _add_off_duty_block(self, state: DutyState, hours: float, label: str, coordinates: dict) -> DutyState:
        start_time = state.current_time
        end_time = start_time + timedelta(hours=hours)
        self.schedule.append(
            {
                "status": STATUS_OFF,
                "label": label,
                "location": coordinates.get("label", "Rest stop"),
                "start": start_time,
                "end": end_time,
                "miles": 0.0,
            }
        )
        self._add_stop_marker("rest", label, coordinates, start_time, hours, coordinates.get("label", "Rest stop"))
        return DutyState(
            current_time=end_time,
            cycle_used=state.cycle_used,
            day_driving=0,
            day_elapsed=0,
            driving_since_break=0,
            miles_since_fuel=state.miles_since_fuel,
        )

    def _build_summary(self, first_leg: dict, second_leg: dict, state: DutyState) -> dict:
        total_miles = first_leg["distance_miles"] + second_leg["distance_miles"]
        total_drive_hours = first_leg["duration_hours"] + second_leg["duration_hours"]
        trip_start = self.schedule[0]["start"] if self.schedule else state.current_time
        trip_end = self.schedule[-1]["end"] if self.schedule else state.current_time
        return {
            "totalMiles": round(total_miles, 1),
            "totalDrivingHours": round(total_drive_hours, 1),
            "totalTripHours": round((trip_end - trip_start).total_seconds() / 3600, 1),
            "daysOnTrip": max((trip_end.date() - trip_start.date()).days + 1, 1),
            "currentCycleUsed": round(self.current_cycle_used, 1),
            "endingCycleUsed": round(state.cycle_used, 1),
            "route": [
                {"label": "Current", "value": self.current_location},
                {"label": "Pickup", "value": self.pickup_location},
                {"label": "Dropoff", "value": self.dropoff_location},
            ],
        }

    def _build_log_sheets(self) -> list[dict]:
        if not self.schedule:
            return []

        day = self.schedule[0]["start"].replace(hour=0, minute=0, second=0, microsecond=0)
        last_day = self.schedule[-1]["end"].replace(hour=0, minute=0, second=0, microsecond=0)
        sheets = []

        while day <= last_day:
            next_day = day + timedelta(days=1)
            items = []
            previous_end = day

            for entry in [item for item in self.schedule if item["end"] > day and item["start"] < next_day]:
                if entry["start"] > previous_end:
                    items.append(self._sheet_item(previous_end, entry["start"], STATUS_OFF, "Off duty"))

                item_start = max(entry["start"], day)
                item_end = min(entry["end"], next_day)
                item = self._sheet_item(item_start, item_end, entry["status"], entry["label"])
                duration_hours = max((entry["end"] - entry["start"]).total_seconds() / 3600, 0.01)
                item["location"] = entry.get("location", "")
                item["miles"] = round(
                    entry.get("miles", 0.0)
                    * ((item_end - item_start).total_seconds() / 3600)
                    / duration_hours,
                    1,
                )
                items.append(item)
                previous_end = max(previous_end, item_end)

            if previous_end < next_day:
                items.append(self._sheet_item(previous_end, next_day, STATUS_OFF, "Off duty"))

            sheets.append(self._render_sheet(day, items))
            day = next_day

        return sheets

    def _render_sheet(self, day_start: datetime, items: list[dict]) -> dict:
        totals = {
            STATUS_OFF: 0.0,
            STATUS_SLEEPER: 0.0,
            STATUS_DRIVING: 0.0,
            STATUS_ON: 0.0,
        }
        remarks = []
        total_miles = 0.0

        for item in items:
            totals[item["status"]] += item["hours"]
            total_miles += item.get("miles", 0.0)
            if item["label"] != "Off duty":
                remarks.append(f"{self._format_time(item['start'])} - {item['label']}")

        return {
            "date": day_start.strftime("%Y-%m-%d"),
            "displayDate": day_start.strftime("%b %d, %Y"),
            "segments": items,
            "totals": {
                "offDuty": round(totals[STATUS_OFF], 2),
                "sleeper": round(totals[STATUS_SLEEPER], 2),
                "driving": round(totals[STATUS_DRIVING], 2),
                "onDuty": round(totals[STATUS_ON], 2),
            },
            "header": {
                "month": day_start.strftime("%m"),
                "day": day_start.strftime("%d"),
                "year": day_start.strftime("%Y"),
                "fromLocation": self._short_location(self.current_location),
                "toLocation": self._short_location(self.dropoff_location),
                "carrierName": self.assets["carrier_name"],
                "mainOfficeAddress": self.assets["main_office_address"],
                "homeTerminalAddress": self.assets["home_terminal_address"],
                "vehicleNumbers": self.assets["vehicle_numbers"],
                "totalDrivingToday": round(totals[STATUS_DRIVING], 1),
                "totalMileageToday": round(total_miles, 0),
                "shippingDocument": self.assets["shipping_document"],
                "shipperCommodity": f"{self._short_location(self.pickup_location)} to {self._short_location(self.dropoff_location)}",
            },
            "remarks": remarks[:8],
        }

    def _sheet_item(self, start: datetime, end: datetime, status: str, label: str) -> dict:
        start_hour = (start.hour * 60 + start.minute) / 60
        end_hour = (end.hour * 60 + end.minute) / 60
        if end.date() > start.date() and end_hour == 0:
            end_hour = 24

        return {
            "status": status,
            "label": label,
            "start": start,
            "end": end,
            "startHour": round(start_hour, 2),
            "endHour": round(end_hour, 2),
            "hours": round((end - start).total_seconds() / 3600, 2),
            "miles": 0.0,
            "location": "",
        }

    def _point_for_progress(self, leg: dict, progress_miles: float) -> dict:
        geometry = leg["geometry"]
        if len(geometry) < 2:
            return geometry[0]

        ratio = min(max(progress_miles / max(leg["distance_miles"], 0.1), 0), 1)
        total = len(geometry) - 1
        index = min(int(total * ratio), total - 1)
        next_index = min(index + 1, total)
        local_ratio = total * ratio - index
        start = geometry[index]
        end = geometry[next_index]
        return {
            "lat": start["lat"] + (end["lat"] - start["lat"]) * local_ratio,
            "lng": start["lng"] + (end["lng"] - start["lng"]) * local_ratio,
            "label": start.get("label") or end.get("label") or "Route stop",
        }

    def _add_stop_marker(self, stop_type: str, title: str, coordinates: dict, timestamp: datetime, duration_hours: float, location: str) -> None:
        self.stop_markers.append(
            {
                "type": stop_type,
                "title": title,
                "location": location,
                "timestamp": timestamp.strftime("%b %d, %Y %I:%M %p"),
                "durationHours": round(duration_hours, 2),
                "lat": coordinates["lat"],
                "lng": coordinates["lng"],
            }
        )

    def _progress_label(self, leg_label: str, progress_miles: float, total_miles: float) -> str:
        return f"{leg_label} ({round(progress_miles)} / {round(total_miles)} mi)"

    def _format_time(self, value: datetime) -> str:
        return value.strftime("%I:%M %p")

    def _short_location(self, value: str) -> str:
        parts = [part.strip() for part in value.split(",") if part.strip()]
        if len(parts) >= 2:
            return ", ".join(parts[:2])
        return value[:42]

    def _haversine_miles(self, start: dict, end: dict) -> float:
        radius_miles = 3958.8
        lat1 = math.radians(start["lat"])
        lat2 = math.radians(end["lat"])
        delta_lat = math.radians(end["lat"] - start["lat"])
        delta_lng = math.radians(end["lng"] - start["lng"])

        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lng / 2) ** 2
        )
        return radius_miles * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

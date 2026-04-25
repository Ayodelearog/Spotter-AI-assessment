import json

from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .services import PlanningError, TripPlanner


@method_decorator(csrf_exempt, name="dispatch")
class PlanTripView(View):
    http_method_names = ["post"]

    def post(self, request, *args, **kwargs):
        try:
            payload = json.loads(request.body.decode("utf-8"))
        except json.JSONDecodeError:
            return JsonResponse({"error": "Request body must be valid JSON."}, status=400)

        try:
            planner = TripPlanner(
                current_location=payload.get("currentLocation", ""),
                pickup_location=payload.get("pickupLocation", ""),
                dropoff_location=payload.get("dropoffLocation", ""),
                current_cycle_used=payload.get("currentCycleUsed", 0),
            )
            return JsonResponse(planner.plan())
        except PlanningError as error:
            return JsonResponse({"error": str(error)}, status=400)

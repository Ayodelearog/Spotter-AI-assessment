import { Card, CardContent, Stack, Typography } from "@mui/material";
import { MapContainer, Marker, Popup, Polyline, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapPanel({ map }) {
  const center = [map.center.lat, map.center.lng];
  const polyline = map.routePolyline.map((point) => [point.lat, point.lng]);

  return (
    <Card className="panel-card">
      <CardContent sx={{ p: 0 }}>
        <Stack spacing={0}>
          <Stack sx={{ px: 3, pt: 3, pb: 2 }}>
            <Typography variant="h4">Route map</Typography>
            <Typography color="text.secondary">
              OpenStreetMap tiles with route geometry and stop markers returned by the backend.
            </Typography>
          </Stack>
          <div className="map-frame">
            <MapContainer center={center} zoom={6} scrollWheelZoom className="leaflet-map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline positions={polyline} pathOptions={{ color: "#0f766e", weight: 5 }} />
              {map.markers.map((marker, index) => (
                <Marker key={`${marker.title}-${index}`} position={[marker.lat, marker.lng]}>
                  <Popup>
                    <strong>{marker.title}</strong>
                    <br />
                    {marker.location}
                    <br />
                    {marker.timestamp}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}

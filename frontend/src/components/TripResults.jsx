import {
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import MapPanel from "./MapPanel";
import DigitalLogSheet from "./DigitalLogSheet";

function MetricCard({ label, value }) {
  return (
    <Card className="metric-card">
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function TripResults({ result }) {
  const { summary, map, stops, logSheets, assumptions } = result;

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard label="Total miles" value={`${summary.totalMiles} mi`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard label="Driving time" value={`${summary.totalDrivingHours} h`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard label="Trip span" value={`${summary.totalTripHours} h`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <MetricCard label="Log sheets" value={logSheets.length} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 7 }}>
          <MapPanel map={map} />
        </Grid>
        <Grid size={{ xs: 12, xl: 5 }}>
          <Card className="panel-card">
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h4">Dispatch summary</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {assumptions.map((assumption) => (
                    <Chip
                      key={assumption}
                      label={assumption}
                      variant="outlined"
                      sx={{
                        height: "auto",
                        maxWidth: "100%",
                        py: 0.5,
                        "& .MuiChip-label": {
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          lineHeight: 1.3,
                          display: "block",
                        },
                      }}
                    />
                  ))}
                </Stack>
                <Divider />
                {summary.route.map((item) => (
                  <Stack key={item.label} spacing={0.5}>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ lineHeight: 1.2 }}
                    >
                      {item.label}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, wordBreak: "break-word" }}>
                      {item.value}
                    </Typography>
                  </Stack>
                ))}
                <Divider />
                <Typography variant="h5">Planned stops</Typography>
                <Stack spacing={1.5} className="stop-list">
                  {stops.map((stop, index) => (
                    <Stack key={`${stop.title}-${index}`} className="stop-item" spacing={0.5}>
                      <Typography sx={{ fontWeight: 700 }}>{stop.title}</Typography>
                      <Typography color="text.secondary">{stop.location}</Typography>
                      <Typography color="text.secondary">{stop.timestamp}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack spacing={2}>
        <Typography variant="h3">Daily log sheets</Typography>
        <Typography color="text.secondary">
          Each sheet is rendered from the backend schedule. In other words, the frontend
          is just drawing a visual version of the structured HOS data returned by Django.
        </Typography>
        <Grid container spacing={3}>
          {logSheets.map((sheet) => (
            <Grid key={sheet.date} size={{ xs: 12, xl: 6 }}>
              <DigitalLogSheet sheet={sheet} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Stack>
  );
}

import { useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import TripForm from "./components/TripForm";
import TripResults from "./components/TripResults";
import { planTrip } from "./lib/api";

const sampleTrip = {
  currentLocation: "Dallas, TX",
  pickupLocation: "Memphis, TN",
  dropoffLocation: "Atlanta, GA",
  currentCycleUsed: 24,
};

export default function App() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values) {
    setLoading(true);
    setError("");

    try {
      const nextResult = await planTrip(values);
      setResult(nextResult);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box className="app-shell">
      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={4}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={3}
            justifyContent="space-between"
          >
            <Stack spacing={2} sx={{ maxWidth: 760 }}>
              <Chip
                label="React + Django"
                color="secondary"
                sx={{ alignSelf: "flex-start", fontWeight: 700 }}
              />
              <Typography variant="h1" sx={{ fontSize: { xs: 38, md: 68 }, fontWeight: 800, letterSpacing: "-0.04em" }}>
                Trip planning with HOS-aware stops and paper-log rendering.
              </Typography>
              <Typography variant="h5" color="text.secondary">
                The frontend collects trip inputs and visualizes the backend output.
                The backend geocodes locations, queries routing, computes compliance
                stops, and returns one or more daily logs.
              </Typography>
            </Stack>

            <Stack className="hero-note" spacing={1}>
              <Typography variant="overline" sx={{ letterSpacing: "0.16em" }}>
                Sample trip
              </Typography>
              <Typography>{sampleTrip.currentLocation}</Typography>
              <Typography>{sampleTrip.pickupLocation}</Typography>
              <Typography>{sampleTrip.dropoffLocation}</Typography>
              <Typography>{sampleTrip.currentCycleUsed} hours already used</Typography>
            </Stack>
          </Stack>

          <TripForm
            disabled={loading}
            initialValues={sampleTrip}
            onSubmit={handleSubmit}
          />

          {loading ? (
            <Stack direction="row" spacing={2} alignItems="center" className="loading-card">
              <CircularProgress size={24} />
              <Typography>Planning route, rests, fueling, and log sheets...</Typography>
            </Stack>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}
          {result ? <TripResults result={result} /> : null}
        </Stack>
      </Container>
    </Box>
  );
}

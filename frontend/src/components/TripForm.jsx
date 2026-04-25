import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export default function TripForm({ disabled, initialValues, onSubmit }) {
  const [values, setValues] = useState(initialValues);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...values,
      currentCycleUsed: Number(values.currentCycleUsed),
    });
  }

  return (
    <Card className="panel-card">
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack component="form" spacing={3} onSubmit={handleSubmit}>
          <Stack spacing={1}>
            <Typography variant="h4">Trip inputs</Typography>
            <Typography color="text.secondary">
              Enter plain-language locations. The backend geocodes them, then computes
              the route, rest strategy, and FMCSA-style daily logs.
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                name="currentLocation"
                label="Current location"
                value={values.currentLocation}
                onChange={handleChange}
                fullWidth
                disabled={disabled}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                name="pickupLocation"
                label="Pickup location"
                value={values.pickupLocation}
                onChange={handleChange}
                fullWidth
                disabled={disabled}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                name="dropoffLocation"
                label="Dropoff location"
                value={values.dropoffLocation}
                onChange={handleChange}
                fullWidth
                disabled={disabled}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                name="currentCycleUsed"
                label="Current cycle used (hours)"
                type="number"
                value={values.currentCycleUsed}
                onChange={handleChange}
                fullWidth
                disabled={disabled}
                required
                inputProps={{ min: 0, max: 70, step: 0.25 }}
              />
            </Grid>
          </Grid>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button variant="contained" type="submit" disabled={disabled}>
              Generate plan
            </Button>
            <Button variant="outlined" type="button" onClick={() => setValues(initialValues)}>
              Reset sample
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, Divider, Grid, Stack, Typography } from "@mui/material";

const STATUS_ROWS = {
  off_duty: 190,
  sleeper: 211,
  driving: 231,
  on_duty: 252,
};

const STATUS_COLORS = {
  off_duty: "#1f2937",
  sleeper: "#7c3aed",
  driving: "#dc2626",
  on_duty: "#0f766e",
};

const GRAPH = {
  left: 57,
  right: 461,
  top: 181,
  bottom: 261,
};

const HOUR_WIDTH = (GRAPH.right - GRAPH.left) / 24;

function buildPath(segments) {
  const points = [];
  let previousY = null;

  segments.forEach((segment, index) => {
    const y = STATUS_ROWS[segment.status];
    const startX = GRAPH.left + segment.startHour * HOUR_WIDTH;
    const endX = GRAPH.left + segment.endHour * HOUR_WIDTH;

    if (index === 0) {
      points.push(`M ${startX} ${y}`);
    } else {
      points.push(`L ${startX} ${previousY}`);
      points.push(`L ${startX} ${y}`);
    }

    points.push(`L ${endX} ${y}`);
    previousY = y;
  });

  return points.join(" ");
}

function Total({ label, value }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {value} h
      </Typography>
    </Stack>
  );
}

function overlayText(x, y, value, options = {}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={options.fontSize ?? 8}
      fontWeight={options.fontWeight ?? 600}
      textAnchor={options.anchor ?? "start"}
      fill="#111827"
      letterSpacing={options.letterSpacing ?? "0.01em"}
    >
      {value}
    </text>
  );
}

export default function LogSheet({ sheet, route }) {
  const path = buildPath(sheet.segments);
  const { header } = sheet;
  const recap = [
    { x: 78, value: sheet.totals.onDuty.toFixed(1) },
    { x: 162, value: sheet.totals.driving.toFixed(1) },
    { x: 241, value: Math.max(70 - sheet.totals.onDuty, 0).toFixed(1) },
    { x: 339, value: sheet.totals.onDuty.toFixed(1) },
    { x: 412, value: Math.max(60 - sheet.totals.onDuty, 0).toFixed(1) },
    { x: 488, value: sheet.totals.offDuty.toFixed(1) },
  ];

  return (
    <Card className="panel-card">
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" gap={2}>
            <Typography variant="h4">Driver log</Typography>
            <Typography color="text.secondary">{sheet.displayDate}</Typography>
          </Stack>

          <div className="log-sheet">
            <img src="/blank-paper-log.png" alt="Blank paper log" className="log-bg" />
            <svg className="log-overlay" viewBox="0 0 513 518" preserveAspectRatio="none">
              <defs>
                <clipPath id={`graph-clip-${sheet.date}`}>
                  <rect
                    x={GRAPH.left}
                    y={GRAPH.top}
                    width={GRAPH.right - GRAPH.left}
                    height={GRAPH.bottom - GRAPH.top}
                  />
                </clipPath>
              </defs>

              {overlayText(167, 26, header.month, { anchor: "middle" })}
              {overlayText(210, 26, header.day, { anchor: "middle" })}
              {overlayText(257, 26, header.year, { anchor: "middle" })}
              {overlayText(65, 47, header.fromLocation)}
              {overlayText(261, 47, header.toLocation)}
              {overlayText(60, 90, String(header.totalDrivingToday), { anchor: "middle" })}
              {overlayText(146, 90, String(header.totalMileageToday), { anchor: "middle" })}
              {overlayText(308, 88, header.carrierName, { anchor: "middle" })}
              {overlayText(308, 111, header.mainOfficeAddress, { anchor: "middle" })}
              {overlayText(308, 134, header.homeTerminalAddress, { anchor: "middle" })}
              {overlayText(143, 134, header.vehicleNumbers, { anchor: "middle", fontSize: 7 })}
              {overlayText(35, 363, header.shippingDocument, { fontSize: 7 })}
              {overlayText(35, 394, header.shipperCommodity, { fontSize: 7 })}

              <g clipPath={`url(#graph-clip-${sheet.date})`}>
                <path
                  d={path}
                  stroke={STATUS_COLORS.driving}
                  strokeWidth="3"
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>

              {sheet.segments.map((segment, index) => {
                const x = GRAPH.left + segment.startHour * HOUR_WIDTH;
                const y = STATUS_ROWS[segment.status];
                return (
                  <circle
                    key={`${segment.label}-${index}`}
                    cx={x}
                    cy={y}
                    r="2.8"
                    fill={STATUS_COLORS[segment.status]}
                  />
                );
              })}

              {sheet.segments.map((segment, index) => {
                const endX = GRAPH.left + segment.endHour * HOUR_WIDTH;
                const y = STATUS_ROWS[segment.status];
                return (
                  <circle
                    key={`${segment.label}-${index}-end`}
                    cx={endX}
                    cy={y}
                    r="2.4"
                    fill={STATUS_COLORS[segment.status]}
                  />
                );
              })}

              {sheet.remarks.slice(0, 4).map((remark, index) =>
                overlayText(88, 287 + index * 12, remark, { fontSize: 6.5 }),
              )}

              {recap.map((item, index) =>
                overlayText(item.x, 463, item.value, { anchor: "middle", fontSize: 7, fontWeight: 700 }),
              )}
              {overlayText(91, 477, route[0]?.value ?? "", { anchor: "middle", fontSize: 6 })}
              {overlayText(342, 477, route[1]?.value ?? "", { anchor: "middle", fontSize: 6 })}
              {overlayText(445, 477, route[2]?.value ?? "", { anchor: "middle", fontSize: 6 })}
            </svg>
          </div>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Total label="Off duty" value={sheet.totals.offDuty} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Total label="Sleeper" value={sheet.totals.sleeper} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Total label="Driving" value={sheet.totals.driving} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Total label="On duty" value={sheet.totals.onDuty} />
            </Grid>
          </Grid>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="h6">Remarks</Typography>
            {sheet.remarks.length ? (
              sheet.remarks.map((remark) => (
                <Typography key={remark} color="text.secondary">
                  {remark}
                </Typography>
              ))
            ) : (
              <Typography color="text.secondary">No notable events logged.</Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

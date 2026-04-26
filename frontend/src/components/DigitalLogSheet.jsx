import { useRef } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

const VB = { w: 1100, h: 880 };

const G = {
  left: 110,
  right: 960,
  top: 290,
  bottom: 410,
  totalLeft: 960,
  totalRight: 1060,
};
const ROW_H = (G.bottom - G.top) / 4;
const HOUR_W = (G.right - G.left) / 24;

const STATUS_INDEX = { off_duty: 0, sleeper: 1, driving: 2, on_duty: 3 };
const ROW_LABELS = [
  ["1. Off Duty"],
  ["2. Sleeper Berth"],
  ["3. Driving"],
  ["4. On Duty", "(not driving)"],
];

const STATUS_COLOR = {
  off_duty: "#1f2937",
  sleeper: "#7c3aed",
  driving: "#dc2626",
  on_duty: "#0f766e",
};

const HOUR_LABELS = [
  "Midnight",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "Noon",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "Midnight",
];

const hourX = (h) => G.left + h * HOUR_W;
const statusY = (status) => G.top + (STATUS_INDEX[status] + 0.5) * ROW_H;

function buildPath(segments) {
  const points = [];
  let prevY = null;
  segments.forEach((seg, i) => {
    const y = statusY(seg.status);
    const sx = hourX(seg.startHour);
    const ex = hourX(seg.endHour);
    if (i === 0) {
      points.push(`M ${sx} ${y}`);
    } else {
      points.push(`L ${sx} ${prevY}`);
      points.push(`L ${sx} ${y}`);
    }
    points.push(`L ${ex} ${y}`);
    prevY = y;
  });
  return points.join(" ");
}

function FieldLine({ x1, x2, y, label, value, valueAnchor = "start", valueX, fontSize = 13 }) {
  return (
    <g>
      <line x1={x1} x2={x2} y1={y} y2={y} stroke="#111827" strokeWidth="1" />
      {value !== undefined && value !== null && value !== "" && (
        <text
          x={valueX ?? (valueAnchor === "middle" ? (x1 + x2) / 2 : x1 + 4)}
          y={y - 4}
          fontSize={fontSize}
          fontWeight="600"
          textAnchor={valueAnchor}
          fill="#111827"
        >
          {value}
        </text>
      )}
      {label && (
        <text
          x={(x1 + x2) / 2}
          y={y + 14}
          fontSize="10"
          textAnchor="middle"
          fill="#374151"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function GridSection({ totals }) {
  const ticks = [];
  for (let h = 0; h <= 24; h++) {
    const x = hourX(h);
    ticks.push(
      <line
        key={`hcol-${h}`}
        x1={x}
        x2={x}
        y1={G.top}
        y2={G.bottom}
        stroke="#111827"
        strokeWidth={h % 6 === 0 ? 1.4 : 1}
      />,
    );
  }
  // quarter-hour ticks inside each row
  const qticks = [];
  for (let h = 0; h < 24; h++) {
    for (let q = 1; q < 4; q++) {
      const x = hourX(h) + (q * HOUR_W) / 4;
      for (let r = 0; r < 4; r++) {
        const yTop = G.top + r * ROW_H;
        const yBot = yTop + ROW_H;
        const tickLen = q === 2 ? 5 : 3;
        qticks.push(
          <line
            key={`qt-${h}-${q}-${r}-top`}
            x1={x}
            x2={x}
            y1={yTop}
            y2={yTop + tickLen}
            stroke="#9ca3af"
            strokeWidth="0.6"
          />,
        );
        qticks.push(
          <line
            key={`qt-${h}-${q}-${r}-bot`}
            x1={x}
            x2={x}
            y1={yBot - tickLen}
            y2={yBot}
            stroke="#9ca3af"
            strokeWidth="0.6"
          />,
        );
      }
    }
  }

  const rowLines = [];
  for (let r = 0; r <= 4; r++) {
    const y = G.top + r * ROW_H;
    rowLines.push(
      <line
        key={`row-${r}`}
        x1={G.left}
        x2={G.totalRight}
        y1={y}
        y2={y}
        stroke="#111827"
        strokeWidth="1"
      />,
    );
  }

  // Hour labels above grid
  const hourLabels = HOUR_LABELS.map((label, i) => (
    <text
      key={`hlabel-${i}`}
      x={hourX(i)}
      y={G.top - 6}
      fontSize="9.5"
      textAnchor="middle"
      fontWeight="600"
      fill="#111827"
    >
      {label}
    </text>
  ));

  // Row labels on left (multi-line via tspan)
  const rowLabels = ROW_LABELS.map((lines, i) => {
    const centerY = G.top + (i + 0.5) * ROW_H;
    const lineHeight = 12;
    const firstY = centerY + 4 - ((lines.length - 1) * lineHeight) / 2;
    return (
      <text
        key={`rlabel-${i}`}
        x={G.left - 6}
        y={firstY}
        fontSize="11"
        fontWeight="600"
        textAnchor="end"
        fill="#111827"
      >
        {lines.map((line, li) => (
          <tspan key={li} x={G.left - 6} dy={li === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    );
  });

  // Total Hours column header + values
  const totalsByRow = [
    totals.offDuty,
    totals.sleeper,
    totals.driving,
    totals.onDuty,
  ];

  return (
    <g>
      <text
        x={(G.totalLeft + G.totalRight) / 2}
        y={G.top - 6}
        fontSize="10"
        textAnchor="middle"
        fontWeight="700"
        fill="#111827"
      >
        Total Hours
      </text>
      <line
        x1={G.totalLeft}
        x2={G.totalLeft}
        y1={G.top}
        y2={G.bottom}
        stroke="#111827"
        strokeWidth="1.2"
      />
      <line
        x1={G.totalRight}
        x2={G.totalRight}
        y1={G.top}
        y2={G.bottom}
        stroke="#111827"
        strokeWidth="1.2"
      />
      {ticks}
      {qticks}
      {rowLines}
      {hourLabels}
      {rowLabels}
      {totalsByRow.map((v, i) => (
        <text
          key={`tot-${i}`}
          x={(G.totalLeft + G.totalRight) / 2}
          y={G.top + (i + 0.5) * ROW_H + 4}
          fontSize="13"
          fontWeight="700"
          textAnchor="middle"
          fill="#111827"
        >
          {Number(v).toFixed(2)}
        </text>
      ))}
    </g>
  );
}

function HeaderSection({ header }) {
  return (
    <g>
      <text x={40} y={42} fontSize="28" fontWeight="800" fill="#111827">
        Driver&rsquo;s Daily Log
      </text>
      <text x={40} y={62} fontSize="13" fill="#374151">
        (24 hours)
      </text>

      {/* Date */}
      <g>
        <FieldLine x1={460} x2={560} y={50} label="(month)" value={header.month} valueAnchor="middle" />
        <text x={570} y={50} fontSize="20" fontWeight="700" fill="#111827">/</text>
        <FieldLine x1={585} x2={665} y={50} label="(day)" value={header.day} valueAnchor="middle" />
        <text x={675} y={50} fontSize="20" fontWeight="700" fill="#111827">/</text>
        <FieldLine x1={690} x2={780} y={50} label="(year)" value={header.year} valueAnchor="middle" />
      </g>

      <text x={820} y={36} fontSize="11" fill="#374151">
        Original — File at home terminal.
      </text>
      <text x={820} y={52} fontSize="11" fill="#374151">
        Duplicate — Driver retains for 8 days.
      </text>

      {/* From / To */}
      <text x={40} y={98} fontSize="13" fontWeight="700" fill="#111827">
        From:
      </text>
      <FieldLine x1={90} x2={520} y={100} value={header.fromLocation} />

      <text x={540} y={98} fontSize="13" fontWeight="700" fill="#111827">
        To:
      </text>
      <FieldLine x1={580} x2={1060} y={100} value={header.toLocation} />
    </g>
  );
}

function InfoSection({ header }) {
  // Two boxed totals
  const boxes = [
    { x: 40, w: 180, label: "Total Miles Driving Today", value: header.totalDrivingToday },
    { x: 230, w: 180, label: "Total Mileage Today", value: header.totalMileageToday },
  ];
  return (
    <g>
      {boxes.map((b) => (
        <g key={b.label}>
          <rect
            x={b.x}
            y={130}
            width={b.w}
            height={60}
            stroke="#111827"
            strokeWidth="1.2"
            fill="none"
          />
          <text
            x={b.x + b.w / 2}
            y={162}
            fontSize="20"
            fontWeight="700"
            textAnchor="middle"
            fill="#111827"
          >
            {b.value ?? ""}
          </text>
          <text
            x={b.x + b.w / 2}
            y={182}
            fontSize="10"
            textAnchor="middle"
            fill="#374151"
          >
            {b.label}
          </text>
        </g>
      ))}

      {/* Right column: carrier/office/terminal */}
      <FieldLine x1={430} x2={1060} y={150} label="Name of Carrier or Carriers" value={header.carrierName} valueAnchor="middle" />
      <FieldLine x1={430} x2={1060} y={186} label="Main Office Address" value={header.mainOfficeAddress} valueAnchor="middle" />
      <FieldLine x1={430} x2={1060} y={222} label="Home Terminal Address" value={header.homeTerminalAddress} valueAnchor="middle" />

      {/* Vehicle numbers row */}
      <FieldLine
        x1={40}
        x2={410}
        y={262}
        label="Truck/Tractor and Trailer Numbers or License Plate(s)/State"
        value={header.vehicleNumbers}
        valueAnchor="middle"
        fontSize={11}
      />
    </g>
  );
}

function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function RemarksBand({ events, clipId }) {
  const top = G.bottom;
  const bandBottom = top + 130;
  const tickEnd = top + 10;
  const labelY = top + 14;
  const MAX_LOC_CHARS = 16;
  const MAX_LABEL_CHARS = 20;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect
            x={G.left}
            y={top}
            width={G.right - G.left}
            height={bandBottom - top}
          />
        </clipPath>
      </defs>
      <line
        x1={G.left}
        x2={G.right}
        y1={bandBottom}
        y2={bandBottom}
        stroke="#111827"
        strokeWidth="0.8"
      />
      <line
        x1={G.left}
        x2={G.left}
        y1={top}
        y2={bandBottom}
        stroke="#111827"
        strokeWidth="0.8"
      />
      <line
        x1={G.right}
        x2={G.right}
        y1={top}
        y2={bandBottom}
        stroke="#111827"
        strokeWidth="0.8"
      />
      <text x={G.left - 6} y={top + 16} fontSize="10" fontWeight="700" textAnchor="end" fill="#111827">
        Remarks
      </text>
      <g clipPath={`url(#${clipId})`}>
        {events.map((ev, i) => {
          const x = hourX(ev.hour);
          const startX = x + 2;
          const startY = labelY;
          const locationFont = 10;
          const actionFont = 8;
          const location = truncate(ev.location, MAX_LOC_CHARS);
          const action = truncate(ev.label, MAX_LABEL_CHARS);
          const locationWidth = location.length * locationFont * 0.55;
          return (
            <g key={`evt-${i}`}>
              <line x1={x} x2={x} y1={top} y2={tickEnd} stroke="#111827" strokeWidth="0.9" />
              <g transform={`rotate(60 ${startX} ${startY})`}>
                <text
                  x={startX}
                  y={startY}
                  fontSize={locationFont}
                  fontWeight="700"
                  textAnchor="start"
                  fill="#111827"
                >
                  {location}
                </text>
                <line
                  x1={startX}
                  x2={startX + locationWidth}
                  y1={startY + 2}
                  y2={startY + 2}
                  stroke="#111827"
                  strokeWidth="0.6"
                />
                <text
                  x={startX}
                  y={startY + 12}
                  fontSize={actionFont}
                  fontWeight="500"
                  textAnchor="start"
                  fill="#374151"
                >
                  {action}
                </text>
              </g>
            </g>
          );
        })}
      </g>
    </g>
  );
}

function ShippingSection({ header }) {
  return (
    <g>
      <text x={40} y={584} fontSize="11" fontWeight="700" fill="#111827">
        Shipping Documents:
      </text>
      <FieldLine x1={170} x2={520} y={584} value={header.shippingDocument} />
      <text x={540} y={584} fontSize="11" fontWeight="700" fill="#111827">
        DVL or Manifest No.:
      </text>
      <FieldLine x1={690} x2={1060} y={584} value="" />

      <text x={40} y={616} fontSize="11" fontWeight="700" fill="#111827">
        Shipper &amp; Commodity:
      </text>
      <FieldLine x1={170} x2={1060} y={616} value={header.shipperCommodity} />

      <text x={40} y={644} fontSize="10" fontStyle="italic" fill="#374151">
        Enter name of place you reported and where released from work and when and where each change of duty occurred. Use time standard of home terminal.
      </text>
    </g>
  );
}

function RecapSection({ totals }) {
  const onDuty = totals.onDuty;
  const lines34 = totals.driving + totals.onDuty;
  const top = 700;
  const valueY = top + 56;
  const lineY = top + 60;
  const labelY = top + 76;
  const subY = top + 88;

  const cells = [
    { x: 70, label: "On duty hours today,", sub: "Total lines 3 & 4", value: lines34.toFixed(2) },
    { x: 270, label: "A. Total hours on", sub: "duty last 7 days", value: onDuty.toFixed(2) },
    { x: 380, label: "B. Total hours avail.", sub: "tomorrow (70 − A)", value: Math.max(70 - onDuty, 0).toFixed(2) },
    { x: 490, label: "C. Total hours on duty", sub: "last 5 days incl. today", value: onDuty.toFixed(2) },
    { x: 660, label: "A. Total hours on", sub: "duty last 8 days", value: onDuty.toFixed(2) },
    { x: 770, label: "B. Total hours avail.", sub: "tomorrow (60 − A)", value: Math.max(60 - onDuty, 0).toFixed(2) },
    { x: 880, label: "C. Total hours on duty", sub: "last 7 days incl. today", value: onDuty.toFixed(2) },
  ];

  return (
    <g>
      <text x={40} y={top + 14} fontSize="13" fontWeight="700" fill="#111827">
        Recap:
      </text>
      <text x={40} y={top + 30} fontSize="10" fill="#374151">
        Complete at end of day
      </text>

      <text x={345} y={top + 30} fontSize="11" fontWeight="700" fill="#111827" textAnchor="middle">
        70 Hour / 8 Day Drivers
      </text>
      <text x={735} y={top + 30} fontSize="11" fontWeight="700" fill="#111827" textAnchor="middle">
        60 Hour / 7 Day Drivers
      </text>

      {cells.map((c) => (
        <g key={c.label}>
          <line
            x1={c.x - 30}
            x2={c.x + 30}
            y1={lineY}
            y2={lineY}
            stroke="#111827"
            strokeWidth="1"
          />
          <text x={c.x} y={valueY} fontSize="13" fontWeight="700" textAnchor="middle" fill="#111827">
            {c.value}
          </text>
          <text x={c.x} y={labelY} fontSize="9" textAnchor="middle" fill="#374151">
            {c.label}
          </text>
          <text x={c.x} y={subY} fontSize="9" textAnchor="middle" fill="#374151">
            {c.sub}
          </text>
        </g>
      ))}

      <text x={40} y={subY + 20} fontSize="9" fontStyle="italic" fill="#374151">
        *If you took 34 consecutive hours off duty you have 60 / 70 hours available.
      </text>
    </g>
  );
}

function downloadSvgAsPng(svg, filename) {
  const xml = new XMLSerializer().serializeToString(svg);
  const blob = new Blob(
    ['<?xml version="1.0" standalone="no"?>\r\n', xml],
    { type: "image/svg+xml;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = VB.w * scale;
    canvas.height = VB.h * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => {
      const dl = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = dl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dl);
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
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

export default function DigitalLogSheet({ sheet }) {
  const svgRef = useRef(null);
  const path = buildPath(sheet.segments);
  const { header } = sheet;

  const handleDownload = () => {
    if (!svgRef.current) return;
    const safeDate = String(sheet.date).replace(/[^0-9A-Za-z-]/g, "_");
    downloadSvgAsPng(svgRef.current, `driver-log-${safeDate}.png`);
  };

  return (
    <Card className="panel-card">
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography variant="h4">Driver log</Typography>
            <Typography color="text.secondary" sx={{ textAlign: "center" }}>
              {sheet.displayDate}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="outlined" size="small" onClick={handleDownload}>
                Download PNG
              </Button>
            </Box>
          </Box>

          <div style={{ width: "100%", overflowX: "auto" }}>
            <svg
              ref={svgRef}
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${VB.w} ${VB.h}`}
              width="100%"
              style={{ display: "block", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8 }}
            >
              <HeaderSection header={header} />
              <InfoSection header={header} />
              <GridSection totals={sheet.totals} />

              <defs>
                <clipPath id={`graph-clip-${sheet.date}`}>
                  <rect x={G.left} y={G.top} width={G.right - G.left} height={G.bottom - G.top} />
                </clipPath>
              </defs>
              <g clipPath={`url(#graph-clip-${sheet.date})`}>
                <path
                  d={path}
                  stroke={STATUS_COLOR.driving}
                  strokeWidth="3"
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {sheet.segments.map((seg, i) => (
                  <circle
                    key={`pt-${i}`}
                    cx={hourX(seg.startHour)}
                    cy={statusY(seg.status)}
                    r="3.2"
                    fill={STATUS_COLOR[seg.status]}
                  />
                ))}
                {sheet.segments.length > 0 && (
                  <circle
                    cx={hourX(sheet.segments[sheet.segments.length - 1].endHour)}
                    cy={statusY(sheet.segments[sheet.segments.length - 1].status)}
                    r="3.2"
                    fill={STATUS_COLOR[sheet.segments[sheet.segments.length - 1].status]}
                  />
                )}
              </g>

              <RemarksBand events={sheet.remarkEvents ?? []} clipId={`remarks-clip-${sheet.date}`} />
              <ShippingSection header={header} />
              <RecapSection totals={sheet.totals} />
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

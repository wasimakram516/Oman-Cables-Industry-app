"use client";

import { Stack, Avatar, Typography } from "@mui/material";

export default function SpeakerCard({ spk, isNext, onClick }) {
  return (
    <Stack
      key={spk._id || `${spk.name}-${spk.startTime}`}
      onClick={onClick}
      alignItems="center"
      justifyContent="center"
      spacing={0.5}
      sx={{
        minWidth: 140,
        px: 2,
        py: 1.5,
        borderRadius: 2,
        bgcolor: "rgba(255,255,255,0.08)",
        border: isNext ? "2px solid #ff9800" : "1px solid rgba(255,255,255,0.2)",
        transition: "all 0.3s ease",
        cursor: "pointer",
        "&:hover": {
          transform: "scale(1.05)",
          bgcolor: "rgba(255,255,255,0.15)",
        },
      }}
    >
      <Avatar
        src={spk.photoUrl || ""}
        alt={spk.name}
        sx={{ width: "7vh", height: "7vh" }}
      />
      <Typography
        variant="body2"
        fontWeight="bold"
        textAlign="center"
        noWrap
      >
        {spk.name}
      </Typography>
      {(spk.title || spk.company) && (
        <Typography
          variant="caption"
          color="grey.400"
          textAlign="center"
          noWrap
        >
          {[spk.title, spk.company].filter(Boolean).join(" • ")}
        </Typography>
      )}
    </Stack>
  );
}

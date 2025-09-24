"use client";

import { Box, CircularProgress, Typography, Stack } from "@mui/material";

export default function FullPageLoader({ text = "Loading..." }) {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        bgcolor: "rgba(255,255,255,0.9)",
        zIndex: 2000, 
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Stack alignItems="center" spacing={2}>
        <CircularProgress size={64} />
        <Typography variant="body1" fontWeight="500" color="text.secondary">
          {text}
        </Typography>
      </Stack>
    </Box>
  );
}

"use client";

import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  LinearProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SaveIcon from "@mui/icons-material/Save";

export default function VVIPForm({ onClose, onCreated, initialData }) {
  const [name, setName] = useState(initialData?.name || "");
  const [designation, setDesignation] = useState(initialData?.designation || "");

  const [videoFile, setVideoFile] = useState(null);
  const [existingVideo, setExistingVideo] = useState(initialData?.video || null);

  const [subtitleFile, setSubtitleFile] = useState(null);
  const [existingSubtitle, setExistingSubtitle] = useState(initialData?.video?.subtitle || null);

  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  // Presigned URL helper
  const getPresignedUrl = async (file, folder) => {
    const res = await fetch("/api/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        presign: true,
        fileName: file.name,
        fileType: file.type,
        folder,
      }),
    });
    if (!res.ok) throw new Error("Failed to get presigned URL");
    return await res.json();
  };

  const uploadToS3 = (file, uploadURL) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadURL, true);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      };
      xhr.onload = () =>
        xhr.status === 200 ? resolve() : reject(new Error("Upload failed"));
      xhr.onerror = () => reject(new Error("Upload error"));
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showSnackbar("Name is required", "error");
      return;
    }
    if (!designation.trim()) {
      showSnackbar("Designation is required", "error");
      return;
    }

    try {
      setSubmitting(true);
      setProgress(0);

      let payload = { name, designation };

      // --- 🎬 Upload Video ---
      if (videoFile) {
        const { uploadURL, key, fileUrl } = await getPresignedUrl(videoFile, "vvips");
        await uploadToS3(videoFile, uploadURL);
        payload.video = { s3Key: key, s3Url: fileUrl };
      } else if (existingVideo) {
        payload.video = existingVideo;
      }

      // --- 💬 Upload Subtitle (optional) ---
      if (subtitleFile) {
        const { uploadURL, key, fileUrl } = await getPresignedUrl(
          subtitleFile,
          "subtitles"
        );
        await uploadToS3(subtitleFile, uploadURL);

        // attach subtitle under video object
        payload.video = payload.video || {};
        payload.video.subtitle = { s3Key: key, s3Url: fileUrl };
      } else if (existingSubtitle && !subtitleFile) {
        // keep old subtitle if not replaced
        payload.video = payload.video || {};
        payload.video.subtitle = existingSubtitle;
      }

      // --- 📤 Save to DB ---
      const url = initialData ? `/api/vvips/${initialData._id}` : "/api/vvips";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to save VVIP: ${res.status}`);

      showSnackbar("VVIP saved successfully", "success");
      onCreated();
      onClose();
    } catch (err) {
      console.error("❌ Error in handleSubmit:", err);
      showSnackbar(err.message, "error");
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        required
      />

      <TextField
        label="Designation"
        value={designation}
        onChange={(e) => setDesignation(e.target.value)}
        fullWidth
        required
      />

      {/* 🎥 Video Upload */}
      <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
        {initialData ? "Replace Video" : "Upload Video"}
        <input
          type="file"
          hidden
          accept="video/*"
          onChange={(e) => {
            setVideoFile(e.target.files[0]);
            setExistingVideo(null);
          }}
        />
      </Button>

      {videoFile && <Typography>🎬 {videoFile.name}</Typography>}
      {existingVideo && (
        <Typography color="textSecondary">
          Existing Video: {existingVideo.s3Key}
        </Typography>
      )}

      {/* 💬 Subtitle Upload */}
      <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
        {initialData ? "Replace Subtitles" : "Upload Subtitles"}
        <input
          type="file"
          hidden
          accept=".vtt"
          onChange={(e) => {
            setSubtitleFile(e.target.files[0]);
            setExistingSubtitle(null);
          }}
        />
      </Button>

      {subtitleFile && <Typography>💬 {subtitleFile.name}</Typography>}
      {existingSubtitle && (
        <Typography color="textSecondary">
          Existing Subtitles: {existingSubtitle.s3Key}
        </Typography>
      )}

      {/* Progress */}
      {submitting && (
        <Box sx={{ width: "100%", mt: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2">{progress}%</Typography>
        </Box>
      )}

      <Button
        variant="contained"
        startIcon={<SaveIcon />}
        onClick={handleSubmit}
        disabled={submitting}
      >
        {initialData ? "Update VVIP" : "Save VVIP"}
      </Button>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

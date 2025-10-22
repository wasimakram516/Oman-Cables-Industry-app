"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Box,
  Typography,
} from "@mui/material";

export default function HomeVideoModal({ open, onClose, onUploaded }) {
  const [file, setFile] = useState(null); // video
  const [subtitleFile, setSubtitleFile] = useState(null); // subtitle
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Please select a video file first.");

    setLoading(true);
    setProgress(0);

    try {
      // Step 1: ask backend for presigned URL (video)
      const presignRes = await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presign: true,
          fileName: file.name,
          fileType: file.type,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok || !presignData.ok) {
        throw new Error(presignData.error || "Failed to get presigned URL");
      }

      const { uploadURL, key, fileUrl } = presignData;

      // Step 2: upload video to S3 with progress tracking
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadURL, true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        };

        xhr.onload = async () => {
          if (xhr.status === 200) {
            try {
              let subtitleData = null;

              // Step 2.1: upload subtitle if selected
              if (subtitleFile) {
                const subPresign = await fetch("/api/home", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    presign: true,
                    fileName: subtitleFile.name,
                    fileType: subtitleFile.type,
                  }),
                });
                const subData = await subPresign.json();
                if (!subPresign.ok || !subData.ok) {
                  throw new Error(subData.error || "Failed to get subtitle presigned URL");
                }

                const { uploadURL: subURL, key: subKey, fileUrl: subUrl } = subData;

                await new Promise((res, rej) => {
                  const subXhr = new XMLHttpRequest();
                  subXhr.open("PUT", subURL, true);
                  subXhr.onload = () => {
                    if (subXhr.status === 200) res();
                    else rej(new Error(`Subtitle upload failed (${subXhr.status})`));
                  };
                  subXhr.onerror = () => rej(new Error("Network error during subtitle upload"));
                  subXhr.setRequestHeader("Content-Type", subtitleFile.type);
                  subXhr.send(subtitleFile);
                });

                subtitleData = { s3Key: subKey, s3Url: subUrl };
              }

              // Step 3: notify backend to save both video + subtitle
              const notifyRes = await fetch("/api/home", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  video: { s3Key: key, s3Url: fileUrl },
                  subtitle: subtitleData,
                }),
              });

              const notifyData = await notifyRes.json();
              if (!notifyRes.ok || !notifyData.ok) {
                throw new Error(notifyData.error || "Failed to save video record");
              }

              // Reset
              setLoading(false);
              setFile(null);
              setSubtitleFile(null);
              setProgress(0);
              onUploaded?.();
              onClose();
              resolve();
            } catch (err) {
              console.error("❌ Failed to save DB record:", err);
              reject(err);
            }
          } else {
            console.error("❌ Upload failed:", xhr.status, xhr.responseText);
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          console.error("❌ Network error during upload");
          reject(new Error("Upload error"));
        };

        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    } catch (err) {
      console.error("❌ Error in handleUpload:", err);
      alert(err.message || "Upload failed");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Home Page Video</DialogTitle>
      <DialogContent>
        {/* Video file input */}
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ marginBottom: "1rem" }}
        />

        {/* Subtitle file input (optional) */}
        <input
          type="file"
          accept=".vtt"
          onChange={(e) => setSubtitleFile(e.target.files[0])}
          style={{ marginBottom: "1rem" }}
        />

        {loading && (
          <Box sx={{ my: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {progress}%
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!file || loading}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}

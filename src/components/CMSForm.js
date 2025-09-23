"use client";

import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  LinearProgress,
  Typography,
  Snackbar,
  Alert,
  Stack,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SaveIcon from "@mui/icons-material/Save";

function flattenNodes(nodes, prefix = "") {
  let result = [];
  nodes.forEach((n) => {
    const label = prefix ? `${prefix} > ${n.title}` : n.title;
    result.push({ _id: n._id, title: label });
    if (n.children && n.children.length > 0) {
      result = result.concat(flattenNodes(n.children, label));
    }
  });
  return result;
}

export default function CMSForm({
  onClose,
  onCreated,
  initialData,
  parent,
  allNodes = [],
}) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [video, setVideo] = useState(null);
  const [actionFile, setActionFile] = useState(null);
  const [actionType, setActionType] = useState(initialData?.action?.type || "");
  const [actionUrl, setActionUrl] = useState(
    initialData?.action?.externalUrl || ""
  );
  const [selectedParent, setSelectedParent] = useState(
    initialData?.parent || parent || ""
  );
  const [x, setX] = useState(initialData?.x ?? 0);
  const [y, setY] = useState(initialData?.y ?? 0);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  // 📌 Helper: request presigned URL
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

  // 📌 Helper: upload file directly to S3
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

  // Submit Node
  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      showSnackbar("Title is required", "error");
      return;
    }

    if (!initialData && !video) {
      showSnackbar("Video is required for new nodes", "error");
      return;
    }

    if (isNaN(x) || isNaN(y)) {
      showSnackbar("X and Y must be numbers", "error");
      return;
    }
    if (x < 0 || x > 100 || y < 0 || y > 100) {
      showSnackbar("X and Y must be between 0 and 100", "error");
      return;
    }

    try {
      setSubmitting(true);
      setProgress(0);

      let payload = {
        title,
        parent: selectedParent,
        order: 0,
        x: Number(x),
        y: Number(y),
      };

      // Upload main video
      if (video) {
        const { uploadURL, key, fileUrl } = await getPresignedUrl(
          video,
          "videos"
        );
        await uploadToS3(video, uploadURL);
        payload.video = { s3Key: key, s3Url: fileUrl };
      }

      // Upload action file only if actionType is not empty
      if (actionType) {
        if (actionFile && actionType !== "link" && actionType !== "iframe") {
          const folder =
            actionType === "pdf"
              ? "pdfs"
              : actionType === "image"
              ? "images"
              : "others";
          const { uploadURL, key, fileUrl } = await getPresignedUrl(
            actionFile,
            folder
          );
          await uploadToS3(actionFile, uploadURL);
          payload.action = { type: actionType, s3Key: key, s3Url: fileUrl };
        } else if (
          (actionType === "iframe" || actionType === "link") &&
          actionUrl
        ) {
          payload.action = { type: actionType, externalUrl: actionUrl };
        }
      }

      // Save node
      const url = initialData ? `/api/nodes/${initialData._id}` : "/api/nodes";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ Save node failed:", res.status, errText);
        throw new Error(`Failed to save node: ${res.status}`);
      }

      showSnackbar("Node saved successfully", "success");
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
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
        {/* Title */}
        <TextField
          label="Node Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          required
          error={!title.trim()}
          helperText={!title.trim() ? "Title is required" : ""}
        />

        {/* Parent Selection */}
        <TextField
          select
          label="Parent Node"
          value={selectedParent}
          onChange={(e) => setSelectedParent(e.target.value)}
          fullWidth
          disabled={!!initialData}
        >
          <MenuItem value="">(No parent – root node)</MenuItem>
          {flattenNodes(allNodes).map((n) => (
            <MenuItem key={n._id} value={n._id}>
              {n.title}
            </MenuItem>
          ))}
        </TextField>

        {/* Position fields */}
        <Stack direction="row" spacing={2}>
          <TextField
            label="X Position (%)"
            type="number"
            value={x}
            onChange={(e) => setX(e.target.value)}
            fullWidth
            required
            inputProps={{ min: 0, max: 100 }}
            error={x < 0 || x > 100 || isNaN(x)}
            helperText={
              x < 0 || x > 100 || isNaN(x)
                ? "Must be a number between 0 and 100"
                : ""
            }
          />
          <TextField
            label="Y Position (%)"
            type="number"
            value={y}
            onChange={(e) => setY(e.target.value)}
            fullWidth
            required
            inputProps={{ min: 0, max: 100 }}
            error={y < 0 || y > 100 || isNaN(y)}
            helperText={
              y < 0 || y > 100 || isNaN(y)
                ? "Must be a number between 0 and 100"
                : ""
            }
          />
        </Stack>

        {/* Video Upload */}
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
        >
          {initialData ? "Replace Video" : "Upload Video (Required)"}
          <input
            type="file"
            hidden
            accept="video/*"
            onChange={(e) => setVideo(e.target.files[0])}
          />
        </Button>
        {initialData?.video?.s3Url && !video && (
          <Typography variant="body2" color="text.secondary">
            Current: {initialData.video.s3Url}
          </Typography>
        )}
        {video && <Typography>🎬 {video.name}</Typography>}

        {/* Action */}
        <TextField
          select
          label="Action Type"
          value={actionType}
          onChange={(e) => {
            const val = e.target.value;
            setActionType(val);
            if (!val) {
              setActionFile(null);
              setActionUrl("");
            }
          }}
          fullWidth
        >
          <MenuItem value="">None</MenuItem>
          <MenuItem value="pdf">PDF</MenuItem>
          <MenuItem value="image">Image</MenuItem>
          <MenuItem value="video">Video</MenuItem>
          <MenuItem value="iframe">iFrame</MenuItem>
        </TextField>

        {actionType === "iframe" || actionType === "link" ? (
          <TextField
            label="Action URL"
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            fullWidth
          />
        ) : (
          actionType && (
            <>
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadFileIcon />}
              >
                Upload Action File
                <input
                  type="file"
                  hidden
                  onChange={(e) => setActionFile(e.target.files[0])}
                />
              </Button>

              {/* Preview chosen file name */}
              {actionFile && (
                <Typography variant="body2" color="text.secondary">
                  📎 {actionFile.name}
                </Typography>
              )}
            </>
          )
        )}

        {/* Progress */}
        {submitting && (
          <Box sx={{ width: "100%", mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2">{progress}%</Typography>
          </Box>
        )}

        {/* Save */}
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {initialData ? "Update Node" : "Save Node"}
        </Button>
      </Box>

      {/* Snackbar for messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

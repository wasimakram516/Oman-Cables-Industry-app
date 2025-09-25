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
  IconButton,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";

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

  const [actionType, setActionType] = useState(initialData?.action?.type || "");
  const [actionFile, setActionFile] = useState(null);
  const [actionUrl, setActionUrl] = useState(
    initialData?.action?.externalUrl || ""
  );

  const [slideshowFiles, setSlideshowFiles] = useState([]);
  const [existingImages, setExistingImages] = useState(
    initialData?.action?.images || []
  );

  const [width, setWidth] = useState(initialData?.action?.width ?? 85);
  const [height, setHeight] = useState(initialData?.action?.height ?? 95);

  const [selectedParent, setSelectedParent] = useState(
    initialData?.parent || parent || ""
  );
  const [x, setX] = useState(initialData?.x ?? 50);
  const [y, setY] = useState(initialData?.y ?? 50);

  const [popupFile, setPopupFile] = useState(null);
  const [popupX, setPopupX] = useState(initialData?.action?.popup?.x ?? 50);
  const [popupY, setPopupY] = useState(initialData?.action?.popup?.y ?? 50);

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

  // Helpers
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

  // Submit
  const handleSubmit = async () => {
    if (!title.trim()) {
      showSnackbar("Title is required", "error");
      return;
    }
    if (!initialData && !video && selectedParent) {
      showSnackbar("Video is required for child nodes", "error");
      return;
    }
    if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
      showSnackbar("Position and size fields must be numbers", "error");
      return;
    }

    try {
      setSubmitting(true);
      setProgress(0);

      let payload = {
        title,
        parent: selectedParent || null,
        order: 0,
        x: Number(x),
        y: Number(y),
      };

      // Video
      if (video) {
        const { uploadURL, key, fileUrl } = await getPresignedUrl(
          video,
          "videos"
        );
        await uploadToS3(video, uploadURL);
        payload.video = { s3Key: key, s3Url: fileUrl };
      }

      // Action (main)
      let actionPayload = null;
      if (actionType) {
        if (actionType === "slideshow") {
          let uploadedImages = [];
          for (const file of slideshowFiles) {
            const { uploadURL, key, fileUrl } = await getPresignedUrl(
              file,
              "images"
            );
            await uploadToS3(file, uploadURL);
            uploadedImages.push({ s3Key: key, s3Url: fileUrl });
          }
          actionPayload = {
            type: "slideshow",
            images: [...existingImages, ...uploadedImages],
            width: Number(width),
            height: Number(height),
          };
        } else if (actionFile && actionType !== "iframe") {
          const folder = actionType === "pdf" ? "pdfs" : "images";
          const { uploadURL, key, fileUrl } = await getPresignedUrl(
            actionFile,
            folder
          );
          await uploadToS3(actionFile, uploadURL);
          actionPayload = {
            type: actionType,
            s3Key: key,
            s3Url: fileUrl,
            width: Number(width),
            height: Number(height),
          };
        } else if (actionType === "iframe" && actionUrl) {
          actionPayload = {
            type: "iframe",
            externalUrl: actionUrl,
            width: Number(width),
            height: Number(height),
          };
        }
      }

      // Popup (optional — only file upload, no external URL)
      let popupPayload = null;
      if (popupFile) {
        const { uploadURL, key, fileUrl } = await getPresignedUrl(
          popupFile,
          "popups"
        );
        await uploadToS3(popupFile, uploadURL);
        popupPayload = {
          s3Key: key,
          s3Url: fileUrl,
          x: Number(popupX),
          y: Number(popupY),
        };
      }

      // Merge both
      if (actionPayload || popupPayload) {
        payload.action = { ...actionPayload };
        if (popupPayload) {
          payload.action.popup = popupPayload;
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
      if (!res.ok) throw new Error(`Failed to save node: ${res.status}`);

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
        <TextField
          label="Node Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          required
        />

        {/* Parent */}
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

        {/* Position */}
        <Stack direction="row" spacing={2}>
          <TextField
            label="X (%)"
            type="number"
            value={x}
            onChange={(e) => setX(e.target.value)}
          />
          <TextField
            label="Y (%)"
            type="number"
            value={y}
            onChange={(e) => setY(e.target.value)}
          />
        </Stack>

        {/* Size */}
        <Stack direction="row" spacing={2}>
          <TextField
            label="Width"
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
          <TextField
            label="Height"
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </Stack>

        {/* Video */}
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
        >
          {initialData ? "Replace Video" : "Upload Video"}
          <input
            type="file"
            hidden
            accept="video/*"
            onChange={(e) => setVideo(e.target.files[0])}
          />
        </Button>
        {video && <Typography>🎬 {video.name}</Typography>}

        {/* Action */}
        <TextField
          select
          label="Action Type"
          value={actionType}
          onChange={(e) => {
            setActionType(e.target.value);
            setActionFile(null);
            setSlideshowFiles([]);
          }}
          fullWidth
        >
          <MenuItem value="">None</MenuItem>
          <MenuItem value="pdf">PDF</MenuItem>
          <MenuItem value="image">Image</MenuItem>
          <MenuItem value="iframe">iFrame</MenuItem>
          <MenuItem value="slideshow">Slideshow</MenuItem>
        </TextField>

        {actionType === "iframe" ? (
          <TextField
            label="iFrame URL"
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            fullWidth
          />
        ) : actionType === "slideshow" ? (
          <>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileIcon />}
            >
              Upload Slideshow Images
              <input
                type="file"
                hidden
                multiple
                accept="image/*"
                onChange={(e) =>
                  setSlideshowFiles([
                    ...slideshowFiles,
                    ...Array.from(e.target.files),
                  ])
                }
              />
            </Button>

            {/* Previews */}
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 2 }}>
              {slideshowFiles.map((file, i) => {
                const preview = URL.createObjectURL(file);
                return (
                  <Box
                    key={`new-${i}`}
                    sx={{
                      position: "relative",
                      width: 100,
                      height: 100,
                      border: "1px solid #ccc",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={preview}
                      alt={file.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() =>
                        setSlideshowFiles(
                          slideshowFiles.filter((_, idx) => idx !== i)
                        )
                      }
                      sx={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        bgcolor: "rgba(255,255,255,0.7)",
                      }}
                    >
                      <DeleteIcon fontSize="small" color="error" />
                    </IconButton>
                  </Box>
                );
              })}

              {existingImages.map((img, i) => (
                <Box
                  key={`existing-${i}`}
                  sx={{
                    position: "relative",
                    width: 100,
                    height: 100,
                    border: "1px solid #ccc",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={img.s3Url}
                    alt={`slideshow-${i}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() =>
                      setExistingImages(
                        existingImages.filter((_, idx) => idx !== i)
                      )
                    }
                    sx={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      bgcolor: "rgba(255,255,255,0.7)",
                    }}
                  >
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </>
        ) : actionType ? (
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
            {actionFile && <Typography>📎 {actionFile.name}</Typography>}
          </>
        ) : null}

        <Typography variant="h6" sx={{ mt: 2 }}>
          Popup (optional)
        </Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Popup X (%)"
            type="number"
            value={popupX}
            onChange={(e) => setPopupX(e.target.value)}
          />
          <TextField
            label="Popup Y (%)"
            type="number"
            value={popupY}
            onChange={(e) => setPopupY(e.target.value)}
          />
        </Stack>
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
        >
          Upload Popup File
          <input
            type="file"
            hidden
            onChange={(e) => setPopupFile(e.target.files[0])}
          />
        </Button>
        {popupFile && <Typography>📎 {popupFile.name}</Typography>}

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
          {initialData ? "Update Node" : "Save Node"}
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}

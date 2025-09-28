"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Stack,
  Box,
  LinearProgress,
  Typography,
} from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";

export default function AgendaModal({ open, onClose, agenda, editId }) {
  const emptySpeaker = {
    startTime: "",
    endTime: "",
    name: "",
    title: "",
    company: "",
    role: "speaker",
    photoUrl: "",
    infoImageUrl: "",
    isActive: false,
  };

  const [formData, setFormData] = useState(emptySpeaker);
  const [saving, setSaving] = useState(false);

  // upload progress state
  const [uploadProgress, setUploadProgress] = useState({
    photoUrl: 0,
    infoImageUrl: 0,
  });

  useEffect(() => {
    if (editId && agenda?.items) {
      const found = agenda.items.find((it) => it._id === editId);
      setFormData(found || emptySpeaker);
    } else {
      setFormData(emptySpeaker);
    }
  }, [editId, agenda]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // get presigned URL
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

  // upload with progress
  const uploadToS3 = (file, uploadURL, field) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadURL, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress((prev) => ({ ...prev, [field]: percent }));
        }
      };

      xhr.onload = () =>
        xhr.status === 200 ? resolve() : reject(new Error("Upload failed"));
      xhr.onerror = () => reject(new Error("Upload error"));

      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  };

  const handleFileUpload = async (file, field) => {
    try {
      setUploadProgress((prev) => ({ ...prev, [field]: 0 }));

      const { uploadURL, fileUrl } = await getPresignedUrl(file, "images");
      await uploadToS3(file, uploadURL, field);

      handleChange(field, fileUrl);
    } catch (err) {
      console.error("❌ Upload failed:", err);
    } finally {
      setUploadProgress((prev) => ({ ...prev, [field]: 0 }));
    }
  };

  const saveAgenda = async () => {
    setSaving(true);
    try {
      let updatedItems = [...(agenda?.items || [])];
      if (editId) {
        updatedItems = updatedItems.map((it) =>
          it._id === editId ? formData : it
        );
      } else {
        updatedItems.push(formData);
      }
      const payload = { items: updatedItems };

      const method = agenda?._id ? "PUT" : "POST";
      const url = agenda?._id ? `/api/agenda/${agenda._id}` : `/api/agenda`;

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      onClose();
    } catch (err) {
      console.error("❌ Save agenda error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editId ? "Edit Speaker" : "Add Speaker"}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Time pickers */}
          <Stack direction="row" spacing={2}>
            <TimePicker
              label="Start Time"
              value={
                formData.startTime ? dayjs(formData.startTime, "HH:mm") : null
              }
              onChange={(val) =>
                handleChange("startTime", val ? val.format("HH:mm") : "")
              }
              slotProps={{ textField: { fullWidth: true } }}
            />
            <TimePicker
              label="End Time"
              value={formData.endTime ? dayjs(formData.endTime, "HH:mm") : null}
              onChange={(val) =>
                handleChange("endTime", val ? val.format("HH:mm") : "")
              }
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Stack>

          {/* Speaker photo upload */}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
            {formData.photoUrl ? (
              <img
                src={formData.photoUrl}
                alt={formData.name}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  bgcolor: "#eee",
                }}
              />
            )}
            <Button size="small" variant="outlined" component="label">
              {formData.photoUrl ? "Change Photo" : "Upload Photo"}
              <input
                hidden
                accept="image/*"
                type="file"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleFileUpload(file, "photoUrl");
                }}
              />
            </Button>
          </Stack>
          {uploadProgress.photoUrl > 0 && (
            <Box sx={{ width: "100%", mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={uploadProgress.photoUrl}
              />
              <Typography variant="body2">
                {uploadProgress.photoUrl}%
              </Typography>
            </Box>
          )}

          {/* Speaker info image upload */}
          <Stack direction="row" spacing={2} alignItems="center">
            {formData.infoImageUrl ? (
              <img
                src={formData.infoImageUrl}
                alt={`${formData.name}-info`}
                style={{
                  width: 64,
                  height: 48,
                  borderRadius: 4,
                  objectFit: "cover",
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 64,
                  height: 48,
                  borderRadius: 4,
                  bgcolor: "#eee",
                }}
              />
            )}
            <Button size="small" variant="outlined" component="label">
              {formData.infoImageUrl
                ? "Change Info Image"
                : "Upload Info Image"}
              <input
                hidden
                accept="image/*"
                type="file"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleFileUpload(file, "infoImageUrl");
                }}
              />
            </Button>
          </Stack>
          {uploadProgress.infoImageUrl > 0 && (
            <Box sx={{ width: "100%", mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={uploadProgress.infoImageUrl}
              />
              <Typography variant="body2">
                {uploadProgress.infoImageUrl}%
              </Typography>
            </Box>
          )}

          {/* Fields */}
          <TextField
            label="Name"
            value={formData.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            fullWidth
          />
          <TextField
            label="Title"
            value={formData.title || ""}
            onChange={(e) => handleChange("title", e.target.value)}
            fullWidth
          />
          <TextField
            label="Company"
            value={formData.company || ""}
            onChange={(e) => handleChange("company", e.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Role"
            value={formData.role || "speaker"}
            onChange={(e) => handleChange("role", e.target.value)}
          >
            <MenuItem value="speaker">Speaker</MenuItem>
            <MenuItem value="moderator">Moderator</MenuItem>
            <MenuItem value="presenter">Presenter</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={saveAgenda} disabled={saving} variant="contained">
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

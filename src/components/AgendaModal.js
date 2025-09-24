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
} from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";

export default function AgendaModal({ open, onClose, agenda, editIndex }) {
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

  useEffect(() => {
    if (editIndex !== null && agenda?.items?.[editIndex]) {
      setFormData(agenda.items[editIndex]);
    } else {
      setFormData(emptySpeaker);
    }
  }, [editIndex, agenda]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileUpload = async (file, field) => {
    try {
      // 1. Ask API for presigned URL
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presign: true,
          fileName: file.name,
          fileType: file.type,
          folder: "images",
        }),
      });
      const { uploadURL, fileUrl } = await res.json();

      // 2. Upload file directly to S3
      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // 3. Save CloudFront URL into agenda item
      handleChange(field, fileUrl);
    } catch (err) {
      console.error("❌ Upload failed:", err);
    }
  };

  const saveAgenda = async () => {
    setSaving(true);
    try {
      let updatedItems = [...(agenda?.items || [])];
      if (editIndex !== null) {
        updatedItems[editIndex] = formData;
      } else {
        updatedItems.push(formData);
      }
      const payload = { items: updatedItems };
      console.log(payload);
      
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
      <DialogTitle>
        {editIndex !== null ? "Edit Speaker" : "Add Speaker"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Time pickers */}
          <Stack direction="row" spacing={2}>
            <TimePicker
              label="Start Time"
              value={formData.startTime ? dayjs(formData.startTime, "HH:mm") : null}
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
              {formData.infoImageUrl ? "Change Info Image" : "Upload Info Image"}
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

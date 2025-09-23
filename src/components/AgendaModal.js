"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  IconButton,
  Typography,
  Switch,
  Stack,
  DialogContentText,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";

export default function AgendaModal({
  open,
  onClose,
  editIndex = null,
  agenda: externalAgenda,
}) {
  const [agenda, setAgenda] = useState(externalAgenda || { items: [] });
  const [saving, setSaving] = useState(false);

  // confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);

  // Sync agenda when externalAgenda changes
  useEffect(() => {
    if (open && externalAgenda) {
      setAgenda(externalAgenda);
    }
  }, [open, externalAgenda]);

  // Decide which items to render (single vs all)
  const itemsToRender = useMemo(() => {
    if (editIndex !== null && agenda?.items?.[editIndex]) {
      return [agenda.items[editIndex]];
    }
    return agenda.items || [];
  }, [editIndex, agenda]);

  const handleAddItem = () => {
    setAgenda({
      ...agenda,
      items: [
        ...agenda.items,
        {
          title: "",
          description: "",
          startTime: "",
          endTime: "",
          isActive: false,
          speakers: [],
        },
      ],
    });
  };

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...agenda.items];
    newItems[index][field] = value;
    setAgenda({ ...agenda, items: newItems });
  };

  const askDeleteItem = (index) => {
    setDeleteIndex(index);
    setConfirmOpen(true);
  };

  const confirmDeleteItem = () => {
    if (deleteIndex === null) return;
    const newItems = agenda.items.filter((_, i) => i !== deleteIndex);
    setAgenda({ ...agenda, items: newItems });
    setConfirmOpen(false);
    setDeleteIndex(null);
  };

  const handleSpeakerChange = (itemIndex, speakerIndex, field, value) => {
    const items = [...agenda.items];
    const speakers = [...(items[itemIndex].speakers || [])];
    speakers[speakerIndex] = { ...speakers[speakerIndex], [field]: value };
    items[itemIndex].speakers = speakers;
    setAgenda({ ...agenda, items });
  };

  const addSpeaker = (itemIndex) => {
    const items = [...agenda.items];
    items[itemIndex].speakers = [
      ...(items[itemIndex].speakers || []),
      { name: "", title: "", company: "", role: "speaker" },
    ];
    setAgenda({ ...agenda, items });
  };

  const deleteSpeaker = (itemIndex, speakerIndex) => {
    const items = [...agenda.items];
    items[itemIndex].speakers = items[itemIndex].speakers.filter(
      (_, i) => i !== speakerIndex
    );
    setAgenda({ ...agenda, items });
  };

  const saveAgenda = async () => {
    setSaving(true);
    try {
      const payload = {
        items: [...agenda.items].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        ),
        autoDetectActive: agenda.autoDetectActive ?? true,
      };

      if (agenda._id) {
        await fetch(`/api/agenda/${agenda._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/agenda`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      onClose();
    } catch (err) {
      console.error("❌ Save agenda error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          {editIndex !== null ? "Edit Agenda Item" : "Manage Agenda"}
        </DialogTitle>
        <DialogContent dividers>
          {itemsToRender.map((item, i) => {
            const itemIndex = editIndex !== null ? editIndex : i;
            return (
              <Box
                key={i}
                sx={{ mb: 3, p: 2, border: "1px solid #ccc", borderRadius: 2 }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="subtitle1">
                    {editIndex !== null
                      ? "Editing Item"
                      : `Agenda Item ${i + 1}`}
                  </Typography>
                  {editIndex === null && (
                    <IconButton
                      color="error"
                      onClick={() => askDeleteItem(itemIndex)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Stack>
                <TextField
                  fullWidth
                  label="Title"
                  value={item.title}
                  onChange={(e) =>
                    handleUpdateItem(itemIndex, "title", e.target.value)
                  }
                  sx={{ mt: 1 }}
                />
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={item.description}
                  onChange={(e) =>
                    handleUpdateItem(itemIndex, "description", e.target.value)
                  }
                  sx={{ mt: 1 }}
                />

                {/* Time pickers */}
                <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                  <TimePicker
                    label="Start Time"
                    value={item.startTime ? dayjs(item.startTime, "HH:mm") : null}
                    onChange={(val) =>
                      handleUpdateItem(
                        itemIndex,
                        "startTime",
                        val ? val.format("HH:mm") : ""
                      )
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <TimePicker
                    label="End Time"
                    value={item.endTime ? dayjs(item.endTime, "HH:mm") : null}
                    onChange={(val) =>
                      handleUpdateItem(
                        itemIndex,
                        "endTime",
                        val ? val.format("HH:mm") : ""
                      )
                    }
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Stack>

                {/* Speakers section */}
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Speakers
                </Typography>
                {(item.speakers || []).map((spk, sIdx) => (
                  <Box
  key={sIdx}
  sx={{
    mt: 1,
    p: 1.5,
    border: "1px dashed #aaa",
    borderRadius: 1,
  }}
>
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
  >
    <Typography variant="body2">Speaker {sIdx + 1}</Typography>
    <IconButton
      color="error"
      size="small"
      onClick={() => deleteSpeaker(itemIndex, sIdx)}
    >
      <DeleteIcon fontSize="small" />
    </IconButton>
  </Stack>

  {/* Image preview & upload */}
  <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
    {spk.photoUrl ? (
      <img
        src={spk.photoUrl}
        alt={spk.name}
        style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
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
    <Button
      size="small"
      variant="outlined"
      component="label"
    >
      Upload Photo
      <input
        hidden
        accept="image/*"
        type="file"
        onChange={async (e) => {
          const file = e.target.files[0];
          if (!file) return;

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

          // 2. Upload to S3
          await fetch(uploadURL, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          // 3. Save CloudFront URL into speaker
          handleSpeakerChange(itemIndex, sIdx, "photoUrl", fileUrl);
        }}
      />
    </Button>
  </Stack>

  {/* Name/Title/Company/Role fields */}
  <TextField
    fullWidth
    label="Name"
    value={spk.name}
    onChange={(e) =>
      handleSpeakerChange(itemIndex, sIdx, "name", e.target.value)
    }
    sx={{ mt: 1 }}
  />
  <TextField
    fullWidth
    label="Title/Position"
    value={spk.title || ""}
    onChange={(e) =>
      handleSpeakerChange(itemIndex, sIdx, "title", e.target.value)
    }
    sx={{ mt: 1 }}
  />
  <TextField
    fullWidth
    label="Company"
    value={spk.company || ""}
    onChange={(e) =>
      handleSpeakerChange(itemIndex, sIdx, "company", e.target.value)
    }
    sx={{ mt: 1 }}
  />
  <TextField
    select
    fullWidth
    label="Role"
    value={spk.role || "speaker"}
    onChange={(e) =>
      handleSpeakerChange(itemIndex, sIdx, "role", e.target.value)
    }
    SelectProps={{ native: true }}
    sx={{ mt: 1 }}
  >
    <option value="speaker">Speaker</option>
    <option value="moderator">Moderator</option>
    <option value="presenter">Presenter</option>
  </TextField>
</Box>

                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => addSpeaker(itemIndex)}
                  sx={{ mt: 1 }}
                >
                  Add Speaker
                </Button>

                <Stack direction="row" alignItems="center" sx={{ mt: 2 }}>
                  <Switch
                    checked={item.isActive}
                    onChange={(e) =>
                      handleUpdateItem(itemIndex, "isActive", e.target.checked)
                    }
                  />
                  <Typography>Mark Active</Typography>
                </Stack>
              </Box>
            );
          })}

          {editIndex === null && (
            <Button startIcon={<AddIcon />} onClick={handleAddItem}>
              Add Agenda Item
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={saveAgenda} disabled={saving}>
            {saving ? "Saving..." : "Save Agenda"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Agenda Delete */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this agenda item?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDeleteItem}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

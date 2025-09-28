"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContentText,
  DialogContent,
  DialogActions,
  IconButton,
  Avatar,
  FormControlLabel,
  Switch,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import VideoCameraBackIcon from "@mui/icons-material/VideoCameraBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import NodeAccordionTree from "@/components/NodeAccordionTree";
import CMSForm from "@/components/CMSForm";
import HomeVideoModal from "@/components/HomeVideoModal";
import AgendaModal from "@/components/AgendaModal";
import FullPageLoader from "@/components/FullPageLoader";
import VVIPForm from "@/components/VVIPForm";

export default function CMSPage() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);

  // node state
  const [openForm, setOpenForm] = useState(false);
  const [editNode, setEditNode] = useState(null);
  const [parentNode, setParentNode] = useState(null);

  // home video state
  const [openHomeModal, setOpenHomeModal] = useState(false);
  const [homeVideo, setHomeVideo] = useState(null);

  // agenda state
  const [openAgendaModal, setOpenAgendaModal] = useState(false);
  const [agenda, setAgenda] = useState(null);
  const [editAgendaIndex, setEditAgendaIndex] = useState(null);

  // vvips state
  const [vvips, setVvips] = useState([]);
  const [openVvipModal, setOpenVvipModal] = useState(false);
  const [editVvip, setEditVvip] = useState(null);

  // delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    refreshAll();
  }, []);

  const fetchTree = async () => {
    try {
      const res = await fetch("/api/nodes/tree");
      if (!res.ok) throw new Error(res.statusText);
      return await res.json();
    } catch (err) {
      console.error("❌ fetchTree error:", err);
      return [];
    }
  };

  const fetchHomeVideo = async () => {
    try {
      const res = await fetch("/api/home");
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      return data.ok ? data.video : null;
    } catch (err) {
      console.error("❌ fetchHomeVideo error:", err);
      return null;
    }
  };

  const fetchAgenda = async () => {
    try {
      const res = await fetch("/api/agenda");
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      return Array.isArray(data) ? data[0] || null : null;
    } catch (err) {
      console.error("❌ fetchAgenda error:", err);
      return null;
    }
  };

  const fetchVvips = async () => {
    try {
      const res = await fetch("/api/vvips");
      if (!res.ok) throw new Error(res.statusText);
      return await res.json();
    } catch (err) {
      console.error("❌ fetchVvips error:", err);
      return [];
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [treeData, homeData, agendaData, vvipsData] = await Promise.all([
        fetchTree(),
        fetchHomeVideo(),
        fetchAgenda(),
        fetchVvips(),
      ]);
      setTree(treeData || []);
      setHomeVideo(homeData || null);
      setAgenda(agendaData || null);
      setVvips(vvipsData || []);
    } finally {
      setLoading(false);
    }
  };

  // Open delete confirmation
  const handleDeleteClick = (item, type) => {
    setNodeToDelete({ ...item, type });
    setDeleteConfirmOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!nodeToDelete) return;
    setDeleting(true);
    try {
      if (nodeToDelete.type === "agenda") {
        const updatedItems = agenda.items.filter(
          (it) => it._id !== nodeToDelete._id // 👈 delete by unique _id
        );
        const payload = { items: updatedItems };
        await fetch(`/api/agenda/${agenda._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setAgenda(await fetchAgenda());
      } else if (nodeToDelete.type === "node") {
        await fetch(`/api/nodes/${nodeToDelete._id}`, { method: "DELETE" });
        setTree(await fetchTree());
      } else if (nodeToDelete.type === "vvip") {
        await fetch(`/api/vvips/${nodeToDelete._id}`, { method: "DELETE" });
        setVvips(await fetchVvips());
      }
      setDeleteConfirmOpen(false);
      setNodeToDelete(null);
    } catch (err) {
      console.error("❌ Delete error:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box
      sx={{
        p: 4,
        backgroundColor: "#f9f9f9",
        color: "#333",
        minHeight: "100vh",
      }}
    >
      <Typography variant="h4" gutterBottom>
        CMS – Manage Nodes, Agenda & VVIPs
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<VideoCameraBackIcon />}
          onClick={() => setOpenHomeModal(true)}
        >
          Manage Home Video
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditNode(null);
            setParentNode(null);
            setOpenForm(true);
          }}
        >
          Create Node
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={() => {
            setOpenAgendaModal(true);
            setEditAgendaIndex(null);
          }}
        >
          Add Speaker
        </Button>
        <Button
          variant="contained"
          color="info"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditVvip(null);
            setOpenVvipModal(true);
          }}
        >
          Add VVIP
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refreshAll}
        >
          Refresh All
        </Button>
      </Stack>

      {loading ? (
        <FullPageLoader />
      ) : (
        <>
          {/* Home Video */}
          {homeVideo?.s3Url && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Home Video
              </Typography>
              <video
                src={homeVideo.s3Url}
                controls
                style={{ width: "100%", maxWidth: 200, borderRadius: 8 }}
              />
            </Box>
          )}

          {/* Nodes */}
          <NodeAccordionTree
            nodes={tree}
            onEdit={(node) => {
              setEditNode(node);
              setOpenForm(true);
            }}
            onDelete={(node) => handleDeleteClick(node, "node", undefined)}
            onAddChild={(node) => {
              setParentNode(node);
              setEditNode(null);
              setOpenForm(true);
            }}
          />

          {/* Agenda */}
          {agenda && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" gutterBottom>
                Event Agenda
              </Typography>
              {agenda.items && agenda.items.length > 0 ? (
                [...agenda.items]
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((item, idx) => (
                    <Paper
                      key={idx}
                      sx={{
                        p: 2,
                        mb: 1.5,
                        backgroundColor: item.isActive ? "#e8f5e9" : "#fff",
                        border: item.isActive
                          ? "2px solid #4caf50"
                          : "1px solid #ccc",
                        borderRadius: 2,
                        boxShadow: item.isActive
                          ? "0 0 12px rgba(76, 175, 80, 0.5)"
                          : "none",
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="subtitle1" fontWeight="bold">
                          {item.startTime} – {item.endTime}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {/* Toggle Active */}
                          <FormControlLabel
                            control={
                              <Switch
                                checked={item.isActive || false}
                                onChange={async (e) => {
                                  const updatedItems = agenda.items.map(
                                    (it) => ({
                                      ...it,
                                      isActive:
                                        it._id === item._id
                                          ? e.target.checked
                                          : false,
                                    })
                                  );

                                  const payload = { items: updatedItems };
                                  await fetch(`/api/agenda/${agenda._id}`, {
                                    method: "PUT",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify(payload),
                                  });
                                  setAgenda({ ...agenda, items: updatedItems });
                                }}
                              />
                            }
                            label="Active"
                          />

                          <IconButton
                            color="primary"
                            onClick={() => {
                              setOpenAgendaModal(true);
                              setEditAgendaIndex(item._id);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteClick(item, "agenda")}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </Stack>

                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        mt={1}
                      >
                        <Avatar
                          src={item.photoUrl || ""}
                          alt={item.name}
                          sx={{ width: 40, height: 40 }}
                        />
                        <Box>
                          <Typography variant="h6">{item.name}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {item.title ? item.title : ""}
                            {item.company
                              ? item.title
                                ? `, ${item.company}`
                                : item.company
                              : ""}
                            {item.role ? ` • ${item.role}` : ""}
                          </Typography>
                        </Box>
                      </Stack>
                      {/* Speaker info image preview */}
                      {item.infoImageUrl && (
                        <Box mt={1}>
                          <img
                            src={item.infoImageUrl}
                            alt={`${item.name}-info`}
                            style={{
                              width: "auto",
                              height: 120,
                              borderRadius: 6,
                              border: "1px solid #ddd",
                              objectFit: "cover",
                            }}
                          />
                        </Box>
                      )}

                      {item.isActive && (
                        <Typography variant="caption" color="green">
                          🔴 Active Now
                        </Typography>
                      )}
                    </Paper>
                  ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No agenda items yet.
                </Typography>
              )}
            </Box>
          )}

          {/* VVIPs */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              VVIPs
            </Typography>
            {vvips.length > 0 ? (
              vvips.map((vvip, idx) => {
                const isPlaying = vvip.play;

                return (
                  <Paper
                    key={vvip._id}
                    sx={{
                      p: 2,
                      mb: 1.5,
                      backgroundColor: isPlaying ? "#e3f2fd" : "#fff",
                      border: isPlaying
                        ? "2px solid #1976d2"
                        : "1px solid #ccc",
                      borderRadius: 2,
                      position: "relative",
                      boxShadow: isPlaying
                        ? "0 0 12px rgba(25, 118, 210, 0.5)"
                        : "none",
                    }}
                  >
                    {/* PLAYING badge */}
                    {isPlaying && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          bgcolor: "#1976d2",
                          color: "white",
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                          px: 1.2,
                          py: 0.3,
                          borderRadius: 1,
                          zIndex: 2,
                          boxShadow: "0 0 8px rgba(0,0,0,0.2)",
                        }}
                      >
                        PLAYING
                      </Box>
                    )}

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box>
                          <Typography variant="h6">{vvip.name}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {vvip.designation}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FormControlLabel
                          control={
                            <Switch
                              checked={vvip.play || false}
                              onChange={async (e) => {
                                const updated = vvips.map((v, i) => ({
                                  ...v,
                                  play: i === idx ? e.target.checked : false,
                                }));

                                await fetch(`/api/vvips/${vvip._id}`, {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    play: e.target.checked,
                                  }),
                                });

                                setVvips(updated);
                              }}
                            />
                          }
                          label="Play"
                        />

                        <IconButton
                          color="primary"
                          onClick={() => {
                            setEditVvip(vvip);
                            setOpenVvipModal(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteClick(vvip, "vvip", idx)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Stack>

                    {vvip.video?.s3Url && (
                      <video
                        src={vvip.video.s3Url}
                        controls
                        style={{ marginTop: 8, maxWidth: 150, borderRadius: 6 }}
                      />
                    )}
                  </Paper>
                );
              })
            ) : (
              <Typography>No VVIPs yet.</Typography>
            )}
          </Box>
        </>
      )}

      {/* Node Form */}
      {openForm && (
        <Dialog
          open={openForm}
          onClose={() => setOpenForm(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editNode ? `Edit Node: ${editNode.title}` : "Create New Node"}
          </DialogTitle>
          <DialogContent dividers>
            <CMSForm
              onClose={() => setOpenForm(false)}
              onCreated={refreshAll}
              initialData={editNode}
              parent={parentNode?._id}
              allNodes={tree}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* VVIP Form */}
      {openVvipModal && (
        <Dialog
          open={openVvipModal}
          onClose={() => setOpenVvipModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editVvip ? `Edit VVIP: ${editVvip.name}` : "Add VVIP"}
          </DialogTitle>
          <DialogContent dividers>
            <VVIPForm
              onClose={() => setOpenVvipModal(false)}
              onCreated={refreshAll}
              initialData={editVvip}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{nodeToDelete?.name || nodeToDelete?.title}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modals */}
      {openHomeModal && (
        <HomeVideoModal
          open={openHomeModal}
          onClose={() => setOpenHomeModal(false)}
          onUploaded={refreshAll}
        />
      )}
      {openAgendaModal && (
        <AgendaModal
          open={openAgendaModal}
          onClose={() => {
            setOpenAgendaModal(false);
            setEditAgendaIndex(null);
            refreshAll();
          }}
          agenda={agenda}
          editId={editAgendaIndex}
        />
      )}
    </Box>
  );
}

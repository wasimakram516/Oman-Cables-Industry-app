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

export default function CMSPage() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editNode, setEditNode] = useState(null);
  const [parentNode, setParentNode] = useState(null);
  const [openHomeModal, setOpenHomeModal] = useState(false);
  const [homeVideo, setHomeVideo] = useState(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [openAgendaModal, setOpenAgendaModal] = useState(false);
  const [agenda, setAgenda] = useState(null);
  const [editAgendaIndex, setEditAgendaIndex] = useState(null);

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

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [treeData, homeData, agendaData] = await Promise.all([
        fetchTree(),
        fetchHomeVideo(),
        fetchAgenda(),
      ]);
      setTree(treeData || []);
      setHomeVideo(homeData || null);
      setAgenda(agendaData || null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (item, idx) => {
    setNodeToDelete({ ...item, idx });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!nodeToDelete) return;
    setDeleting(true);
    try {
      if (nodeToDelete.idx !== undefined) {
        // delete agenda item
        const updatedItems = agenda.items.filter(
          (_, i) => i !== nodeToDelete.idx
        );
        const payload = { items: updatedItems };
        await fetch(`/api/agenda/${agenda._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setAgenda(await fetchAgenda());
      } else if (nodeToDelete._id) {
        // delete node
        await fetch(`/api/nodes/${nodeToDelete._id}`, { method: "DELETE" });
        setTree(await fetchTree());
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
        minHeight: "100vh",
        color: "#333",
      }}
    >
      <Typography variant="h4" gutterBottom>
        CMS – Manage Nodes & Agenda
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
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refreshAll}
        >
          Refresh All
        </Button>
      </Stack>

      {/* Nodes */}
      {loading ? (
        <FullPageLoader />
      ) : (
        <>
          {/* Show home video */}
          {homeVideo?.video?.s3Url && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Current Home Video:
              </Typography>
              <video
                src={homeVideo.video.s3Url}
                controls
                style={{ width: "100%", maxWidth: 200, borderRadius: 8 }}
              />
            </Box>
          )}
          <NodeAccordionTree
            nodes={tree}
            onEdit={(node) => {
              setEditNode(node);
              setOpenForm(true);
            }}
            onDelete={(node) => {
              setNodeToDelete(node);
              setDeleteConfirmOpen(true);
            }}
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
                        border: "1px solid #ccc",
                        borderRadius: 2,
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
                                    (it, i) => ({
                                      ...it,
                                      isActive:
                                        i === idx ? e.target.checked : false, // only one active
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
                              setEditAgendaIndex(idx);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteClick(item, idx)}
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
          <DialogActions>
            <Button onClick={() => setOpenForm(false)}>Close</Button>
          </DialogActions>
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
            {nodeToDelete?.idx !== undefined ? (
              <>
                Are you sure you want to delete agenda item{" "}
                <strong>{nodeToDelete?.name}</strong>?
              </>
            ) : (
              <>
                Are you sure you want to delete node{" "}
                <strong>{nodeToDelete?.title}</strong>?
              </>
            )}
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
          editIndex={editAgendaIndex}
        />
      )}
    </Box>
  );
}

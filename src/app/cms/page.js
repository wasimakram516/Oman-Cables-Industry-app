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
    fetchTree();
    fetchHomeVideo();
    fetchAgenda();
  }, []);

  const fetchTree = async () => {
    setLoading(true);
    const res = await fetch("/api/nodes/tree");
    const data = await res.json();
    setTree(data);
    setLoading(false);
  };

  const fetchHomeVideo = async () => {
    const res = await fetch("/api/home");
    const data = await res.json();
    setHomeVideo(data);
  };

  const fetchAgenda = async () => {
    const res = await fetch("/api/agenda");
    const data = await res.json();
    setAgenda(data[0] || null);
  };

  const handleDeleteClick = (node) => {
    setNodeToDelete(node);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!nodeToDelete) return;
    setDeleting(true);
    try {
      if (nodeToDelete._id) {
        // deleting a node
        await fetch(`/api/nodes/${nodeToDelete._id}`, { method: "DELETE" });
        await fetchTree();
      } else if (nodeToDelete.idx !== undefined) {
        // deleting an agenda item
        const updatedItems = agenda.items.filter(
          (_, i) => i !== nodeToDelete.idx
        );
        const payload = { ...agenda, items: updatedItems };
        await fetch(`/api/agenda/${agenda._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await fetchAgenda();
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
        CMS – Manage Nodes & Home Video
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
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
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchTree}
        >
          Refresh Nodes
        </Button>
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
          color="success"
          onClick={() => setOpenAgendaModal(true)}
        >
          Manage Agenda
        </Button>
      </Stack>

      {/* Show current home video */}
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
      {loading ? (
        <CircularProgress />
      ) : (
        <NodeAccordionTree
          nodes={tree}
          onEdit={(node) => {
            setEditNode(node);
            setOpenForm(true);
          }}
          onDelete={handleDeleteClick}
          onAddChild={(node) => {
            setParentNode(node);
            setEditNode(null);
            setOpenForm(true);
          }}
        />
      )}

      {agenda && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Event Agenda
          </Typography>
          {agenda.items && agenda.items.length > 0 ? (
            [...agenda.items]
              .sort((a, b) => a.startTime.localeCompare(b.startTime)) // auto sort
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
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {item.startTime} – {item.endTime}
                    </Typography>

                    <Stack direction="row" spacing={1}>
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
                        onClick={() => {
                          setNodeToDelete({ ...item, idx }); // reuse confirm modal
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {/* Title/Description */}
                  <Typography>{item.title}</Typography>
                  {item.description && (
                    <Typography variant="body2" color="textSecondary">
                      {item.description}
                    </Typography>
                  )}

                  {/* Speakers */}
                  {item.speakers &&
                    item.speakers.map((spk, sIdx) => (
                      <Stack
                        key={sIdx}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ ml: 1, mt: 0.5 }}
                      >
                        <Avatar
                          src={spk.photoUrl || ""}
                          alt={spk.name}
                          sx={{ width: 28, height: 28 }}
                        />
                        <Typography variant="body2">
                          {spk.role ? `${spk.role}: ` : ""}
                          {spk.name}
                          {spk.title ? ` (${spk.title}` : ""}
                          {spk.company
                            ? `${spk.title ? ", " : " ("}${spk.company})`
                            : spk.title
                            ? ")"
                            : ""}
                        </Typography>
                      </Stack>
                    ))}

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

      {/* Create/Edit Form */}
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
              onCreated={fetchTree}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {nodeToDelete?._id ? (
              <>
                Are you sure you want to delete{" "}
                <strong>{nodeToDelete?.title}</strong> node?
              </>
            ) : (
              <>
                Are you sure you want to delete agenda item{" "}
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

      {openHomeModal && (
        <HomeVideoModal
          open={openHomeModal}
          onClose={() => setOpenHomeModal(false)}
          onUploaded={fetchHomeVideo}
        />
      )}

      {openAgendaModal && (
        <AgendaModal
          open={openAgendaModal}
          onClose={() => {
            setOpenAgendaModal(false);
            setEditAgendaIndex(null);
            fetchAgenda();
          }}
          editIndex={editAgendaIndex}
          agenda={agenda}
        />
      )}
    </Box>
  );
}

"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  IconButton,
  Stack,
  Link as MUILink,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/Folder";
import MovieIcon from "@mui/icons-material/Movie";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

/**
 * One accordion item for a single node (recursively renders its children)
 */
function NodeAccordionItem({ node, onEdit, onDelete, onAddChild }) {
  const [expanded, setExpanded] = useState(false);

  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  return (
    <Accordion
      disableGutters
      expanded={expanded}
      onChange={(_, isExp) => setExpanded(isExp)}
      sx={{ bgcolor: "#fff", mb: 1, borderRadius: 1, boxShadow: 1 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1 }}
        >
          {hasChildren ? (
            <FolderIcon fontSize="small" />
          ) : (
            <MovieIcon fontSize="small" />
          )}
          <Box>
            <Typography>{node.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              X: {node.x}, Y: {node.y}
            </Typography>
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        {/* Row actions — moved here to avoid button nesting */}
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => onAddChild?.(node)}
            title="Add child"
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onEdit?.(node)} title="Edit">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete?.(node)}
            title="Delete"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Instruction video preview */}
        {node?.video?.s3Url && (
          <Box sx={{ mb: 2 }}>
            <video
              src={node.video.s3Url}
              controls
              style={{ width: "100%", borderRadius: 8, maxWidth: 200 }}
            />
          </Box>
        )}

        {/* Children */}
        {hasChildren &&
          node.children.map((child) => (
            <Box key={child._id} sx={{ ml: 2 }}>
              <NodeAccordionItem
                node={child}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddChild={onAddChild}
              />
            </Box>
          ))}
      </AccordionDetails>
    </Accordion>
  );
}

/**
 * PUBLIC COMPONENT: NodeAccordionTree
 * Renders an entire tree of nodes using nested accordions.
 *
 * Props:
 *  - nodes: array of root nodes (each with .children)
 *  - onEdit(node)
 *  - onDelete(node)
 *  - onAddChild(node)
 */
export default function NodeAccordionTree({
  nodes,
  onEdit,
  onDelete,
  onAddChild,
}) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return (
      <Box sx={{ p: 2, bgcolor: "#fff", borderRadius: 1, boxShadow: 1 }}>
        <Typography>No nodes found</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {nodes.map((n) => (
        <NodeAccordionItem
          key={n._id}
          node={n}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </Box>
  );
}

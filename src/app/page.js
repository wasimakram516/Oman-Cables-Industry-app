"use client";

import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Avatar,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import { keyframes } from "@mui/system";

// Glow animation
const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0,200,83,0.7); }
  70% { box-shadow: 0 0 0 15px rgba(0,200,83,0); }
  100% { box-shadow: 0 0 0 0 rgba(0,200,83,0); }
`;

export default function HomePage() {
  const [home, setHome] = useState(null);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [currentNode, setCurrentNode] = useState(null);
  const [openAction, setOpenAction] = useState(false);
  const videoRef = useRef(null);
  const inactivityTimer = useRef(null);
  const [homeVideoKey, setHomeVideoKey] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  // agenda state
  const [agendaActive, setAgendaActive] = useState(null);
  const [agendaDoc, setAgendaDoc] = useState(null);
  const [allSpeakers, setAllSpeakers] = useState([]);

  const marqueeRef = useRef(null);

  // 1. fetch home + tree
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [homeRes, treeRes] = await Promise.all([
          fetch("/api/home"),
          fetch("/api/nodes/tree"),
        ]);
        const homeData = await homeRes.json();
        const treeData = await treeRes.json();
        setHome(homeData);
        setTree(treeData);
        setCurrentVideo(homeData?.video?.s3Url || null);
      } catch (err) {
        console.error("❌ Error fetching home data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. fetch agenda (active + full)
  useEffect(() => {
    const fetchAgendaStuff = async () => {
      const [activeRes, listRes] = await Promise.all([
        fetch("/api/agenda/active"),
        fetch("/api/agenda"),
      ]);
      const active = await activeRes.json();
      const list = await listRes.json();
      const doc = list?.[0] || null;

      setAgendaActive(active);
      setAgendaDoc(doc);

      const speakers = (doc?.items || []).flatMap((it) =>
        (it.speakers || []).map((spk, i) => ({
          ...spk,
          _key: `${spk.name}-${it.startTime}-${i}`,
          sessionStart: it.startTime,
          sessionEnd: it.endTime,
          sessionTitle: it.title,
        }))
      );
      setAllSpeakers(speakers);
    };

    fetchAgendaStuff();
    const interval = setInterval(fetchAgendaStuff, 10000);
    return () => clearInterval(interval);
  }, []);

  // derive agenda
  const activeItem = agendaActive?.activeItem || null;
  const nextItem = agendaActive?.nextItem || null;
  const activeSpeaker = activeItem?.speakers?.[0] || null;
  const nextSpeaker = nextItem?.speakers?.[0] || null;

  // build marquee list
  const nonActiveSpeakers = allSpeakers.filter(
    (spk) =>
      !(
        activeSpeaker &&
        spk.name === activeSpeaker.name &&
        spk.sessionStart === activeItem?.startTime
      )
  );
  const orderedSpeakers = nonActiveSpeakers;

  // 3. marquee scroll effect
  useEffect(() => {
    const el = marqueeRef.current;
    if (!el || orderedSpeakers.length === 0) return;

    const totalWidth = el.scrollWidth;
    const visibleWidth = el.parentElement.clientWidth;
    const distance = totalWidth > visibleWidth ? totalWidth : visibleWidth;

    const msPerPx = 30;
    const duration = distance * msPerPx;

    const anim = el.animate(
      [
        { transform: "translateX(0)" },
        { transform: `translateX(-${distance}px)` },
      ],
      {
        duration,
        iterations: Infinity,
        easing: "linear",
      }
    );

    return () => anim.cancel();
  }, [orderedSpeakers]);

  // 4. inactivity timer
  useEffect(() => {
    const events = ["mousemove", "mousedown", "click", "keydown", "touchstart"];
    const resetTimer = () => startInactivityTimer();

    events.forEach((e) => window.addEventListener(e, resetTimer));
    startInactivityTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [home]);

  const resetToHome = () => {
    if (!home) return;
    setCurrentNode(null);
    setCurrentVideo(home?.video?.s3Url || null);
    setOpenAction(false);
    setHomeVideoKey((prev) => prev + 1);
  };

  const startInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      resetToHome();
    }, 30000);
  };

  const handleVideoEnded = () => {
    if (currentNode?.action) {
      setOpenAction(true);
    }
  };

  if (loading) return <CircularProgress />;

  const topNodes = Array.isArray(tree) ? tree : [];
  const currentChildren = currentNode?.children || [];

  const renderActionContent = () => {
    if (!currentNode?.action) return null;
    const { type, s3Url, externalUrl } = currentNode.action;
    const url = s3Url || externalUrl;

    if (type === "pdf") {
      return (
        <iframe
          src={url}
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      );
    }

    if (type === "image") {
      return (
        <img src={url} alt="Action" style={{ width: "100%", height: "auto" }} />
      );
    }

    if (type === "video") {
      return (
        <video
          src={url}
          controls
          autoPlay
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      );
    }

    if (type === "iframe" || type === "link") {
      return (
        <iframe
          src={url}
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      );
    }

    return <Typography>No action available</Typography>;
  };
  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top 80% */}
      <Box
        sx={{
          flex: 8,
          position: "relative",
          bgcolor: "black",
          overflow: "hidden",
        }}
      >
        {currentVideo ? (
          <video
            key={homeVideoKey}
            ref={videoRef}
            src={currentVideo}
            autoPlay
            playsInline
            loop={currentNode === null}
            muted={currentNode === null ? isMuted : false} // home muted toggle, others always sound
            onEnded={handleVideoEnded}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Typography color="white" sx={{ p: 4 }}>
            No video available
          </Typography>
        )}

        {/* Show mute/unmute only on home */}
        {currentNode === null && (
          <IconButton
            onClick={() => {
              setIsMuted(!isMuted);
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
              }
            }}
            sx={{
              position: "absolute",
              bottom: 20,
              right: 20,
              bgcolor: "rgba(0,0,0,0.5)",
              color: "white",
              "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            }}
          >
            {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </IconButton>
        )}

        {topNodes.map((node, idx) => (
          <Box
            key={node._id}
            onClick={() => {
              setCurrentVideo(node.video?.s3Url || home?.video?.s3Url);
              setCurrentNode(node);
              setOpenAction(false);
            }}
            sx={{
              position: "absolute",
              top: `${node.y}%`,
              left: `${node.x}%`,
              width: "clamp(8rem, 25vw, 28rem)",
              height: "clamp(8rem, 10vw, 28rem)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              fontSize: "clamp(1rem, 3vw, 3rem)",
              textTransform: "capitalize",
              textAlign: "center",
              padding: "0.5rem",
              animation: `floatY 6s ease-in-out infinite`,
              animationDelay: `${idx * 0.3}s`,
              transition: "all 0.4s ease",
              cursor: "pointer",
              textShadow: "0px 2px 5px rgba(0,0,0,0.9)",
              background:
                "radial-gradient(circle at 30% 30%, #7BBE3A, #006838)",
              color: "#fff",
              border: "3px solid #d9f2d9",
              boxShadow: `
  0 20px 30px rgba(0,0,0,0.6),
  0 6px 12px rgba(0,0,0,0.4), 
  0 4px 10px rgba(255,255,255,0.05) inset 
`,

              "&:hover": {
                background:
                  "radial-gradient(circle at 30% 30%, #8ed44a, #007a44)",
                transform: "scale(1.05)",
              },

              "&.clicked": {
                animation: "clickPulse 0.3s ease",
              },
              "@keyframes floatY": {
                "0%, 100%": { transform: "translateY(0)" },
                "50%": { transform: "translateY(-20px)" },
              },
              "@keyframes clickPulse": {
                "0%": { transform: "scale(1)" },
                "50%": { transform: "scale(0.9)" },
                "100%": { transform: "scale(1)" },
              },
            }}
          >
            {node.title}
          </Box>
        ))}

        {currentChildren.length > 0 &&
          currentChildren.map((child, idx) => (
            <Box
              key={child._id}
              onClick={() => {
                setCurrentVideo(child.video?.s3Url || currentVideo);
                setCurrentNode(child);
                setOpenAction(false);
              }}
              sx={{
                position: "absolute",
                top: `${child.y}%`,
                left: `${child.x}%`,
                width: "clamp(6rem, 25vw, 20rem)",
                height: "clamp(6rem, 10vw, 20rem)",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                fontSize: "clamp(0.8rem, 2.5vw, 2rem)",
                textTransform: "capitalize",
                textAlign: "center",
                padding: "0.4rem",
                animation: `floatY 6s ease-in-out infinite`,
                animationDelay: `${idx * 0.2}s`,
                transition: "all 0.4s ease",
                cursor: "pointer",
                textShadow: "0px 2px 5px rgba(0,0,0,0.9)",
                background:
                  "radial-gradient(circle at 30% 30%, #FFD54F, #FF9800)",
                color: "#fff",
                border: "2px solid #fff3e0",
                boxShadow: `
  0 20px 30px rgba(0,0,0,0.6),
  0 6px 12px rgba(0,0,0,0.4), 
  0 4px 10px rgba(255,255,255,0.05) inset 
`,
                "&:hover": {
                  background:
                    "radial-gradient(circle at 30% 30%, #FFEB3B, #FB8C00)",
                  transform: "scale(1.05)",
                },

                "&.clicked": {
                  animation: "clickPulse 0.3s ease",
                  background:
                    "radial-gradient(circle at 30% 30%, #b00000, #700000)",
                },
              }}
            >
              {child.title}
            </Box>
          ))}
      </Box>

      {/* Bottom 20% Speakers */}
      <Box
        sx={{
          flex: 2,
          display: "flex",
          bgcolor: "#fafafa",
          px: 2,
          overflow: "hidden",
          color: "#333",
        }}
      >
        {/* Active Speaker sticky */}
        {activeSpeaker && (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              minWidth: { xs: "28%", sm: "22%", md: "18%" },
              height: "100%",
              px: 2,
              py: 1,
              borderRadius: 2,
              bgcolor: "white",
              mr: 2,
              boxShadow: "0 0 18px rgba(0,200,83,0.35)",
              animation: `${pulseGlow} 2s infinite`,
            }}
          >
            <Avatar
              src={activeSpeaker.photoUrl || ""}
              alt={activeSpeaker.name}
              sx={{
                width: "14vh",
                height: "14vh",
                mb: 1,
                animation: `${pulseGlow} 2s infinite`,
              }}
            />
            <Typography fontWeight="bold" textAlign="center" noWrap>
              {activeSpeaker.name}
            </Typography>
            {activeSpeaker.title && (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                noWrap
              >
                {activeSpeaker.title}
              </Typography>
            )}
          </Stack>
        )}

        {/* Marquee */}
        <Box
          sx={{
            flex: 1,
            position: "relative",
            height: "100%",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Box
            ref={marqueeRef}
            sx={{
              display: "flex",
              gap: 4,
              whiteSpace: "nowrap",
              willChange: "transform",
            }}
          >
            {orderedSpeakers.map((spk) => {
              const isNext =
                nextSpeaker &&
                spk.name === nextSpeaker.name &&
                spk.sessionStart === nextItem?.startTime;

              return (
                <Stack
                  key={spk._key}
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    minWidth: "160px",
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: "white",
                    border: isNext ? "3px solid #ff9800" : "1px solid #ddd",
                  }}
                >
                  <Avatar
                    src={spk.photoUrl || ""}
                    alt={spk.name}
                    sx={{ width: "9vh", height: "9vh", mb: 1 }}
                  />
                  <Typography fontWeight="bold" textAlign="center" noWrap>
                    {spk.name}
                  </Typography>
                  {spk.title && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textAlign="center"
                      noWrap
                    >
                      {spk.title}
                    </Typography>
                  )}
                </Stack>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Action Popup */}
      <Dialog
        open={openAction}
        onClose={() => setOpenAction(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          Action
          <IconButton
            aria-label="close"
            onClick={() => setOpenAction(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ height: "80vh" }}>
          {renderActionContent()}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

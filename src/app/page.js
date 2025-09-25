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
import HomeIcon from "@mui/icons-material/Home";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { keyframes } from "@mui/system";
import FullPageLoader from "@/components/FullPageLoader";
import { motion, AnimatePresence } from "framer-motion";

// Glow animation
const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0,200,83,0.7); }
  70% { box-shadow: 0 0 0 15px rgba(0,200,83,0); }
  100% { box-shadow: 0 0 0 0 rgba(0,200,83,0); }
`;

// Slide animations
const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    zIndex: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  exit: (direction) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    scale: 0.95,
    zIndex: 0,
    transition: { duration: 0.3 },
  }),
};

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
  const [videoLoading, setVideoLoading] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState("next");
  const [prevIndex, setPrevIndex] = useState(null);

  // agenda state
  const [agendaActive, setAgendaActive] = useState(null);
  const [agendaDoc, setAgendaDoc] = useState(null);
  const [allSpeakers, setAllSpeakers] = useState([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState(null);

  const marqueeRef = useRef(null);
  const actionTimer = useRef(null);
  const buttonSoundRef = useRef(null);

  useEffect(() => {
    return () => {
      if (actionTimer.current) clearTimeout(actionTimer.current);
    };
  }, []);

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

      setAgendaActive(active); // { activeItem, nextItem } (time-based)
      setAgendaDoc(doc);

      // flat speakers list from new schema
      setAllSpeakers(doc?.items || []);
    };

    fetchAgendaStuff();
    const interval = setInterval(fetchAgendaStuff, 10000);
    return () => clearInterval(interval);
  }, []);

  // derive agenda (prefer manual toggle, fallback to time-based)
  const explicitActive =
    (agendaDoc?.items || []).find((it) => it.isActive) || null;

  const activeSpeaker = explicitActive || agendaActive?.activeItem || null;

  const nextSpeaker = agendaActive?.nextItem || null;

  // build marquee list (exclude the active one)
  const orderedSpeakers = (allSpeakers || []).filter(
    (spk) => !(activeSpeaker && spk._id === activeSpeaker._id)
  );

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
    }, 240000); // After 4 minutes of inactivity
  };

  if (loading) return <FullPageLoader />;

  const topNodes = Array.isArray(tree) ? tree : [];
  const currentChildren = currentNode?.children || [];

  const playClickSound = () => {
    if (buttonSoundRef.current) {
      buttonSoundRef.current.currentTime = 0;
      buttonSoundRef.current.play().catch(() => {});
    }
  };

  const renderActionContent = () => {
    if (selectedSpeaker) {
      if (selectedSpeaker.infoImageUrl) {
        return (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <img
              src={selectedSpeaker.infoImageUrl}
              alt={`${selectedSpeaker.name}-info`}
              style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }}
            />
          </Box>
        );
      }
      return <Typography>No info image for this speaker</Typography>;
    }

    if (!currentNode?.action) return null;
    const { type, s3Url, externalUrl, images = [] } = currentNode.action;
    const url = s3Url || externalUrl;

    if (type === "slideshow" && images.length > 0) {
      return (
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* Animated slides */}
          <AnimatePresence initial={false} custom={direction}>
            <motion.img
              key={slideIndex}
              src={images[slideIndex].s3Url}
              alt={`slide-${slideIndex}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4 }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                position: "absolute",
                borderRadius: "8px",
              }}
            />
          </AnimatePresence>

          {/* Prev button */}
          <IconButton
            onClick={() => {
              setDirection(-1);
              setSlideIndex(
                (prev) => (prev - 1 + images.length) % images.length
              );
            }}
            sx={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "rgba(0,0,0,0.5)",
              color: "white",
              "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
              zIndex: 1000,
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          {/* Next button */}
          <IconButton
            onClick={() => {
              setDirection(1);
              setSlideIndex((prev) => (prev + 1) % images.length);
            }}
            sx={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "rgba(0,0,0,0.5)",
              color: "white",
              "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
              zIndex: 1000,
            }}
          >
            <ChevronRightIcon />
          </IconButton>

          {/* Dots */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              position: "absolute",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            {images.map((_, i) => (
              <Box
                key={i}
                onClick={() => {
                  setDirection(i > slideIndex ? 1 : -1);
                  setSlideIndex(i);
                }}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: i === slideIndex ? "#1976d2" : "#bbb",
                  border: "1px solid white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </Stack>
        </Box>
      );
    }

    if (type === "image") {
      return (
        <img
          src={url}
          alt="Action"
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      );
    }

    if (type === "video") {
      return (
        <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
          <video
            src={url}
            autoPlay
            playsInline
            muted
            loop={false}
            controls={false}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              background: "black",
            }}
          />
        </Box>
      );
    }

    if (type === "pdf") {
      return (
        <iframe
          src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
            url
          )}`}
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      );
    }

    if (type === "iframe") {
      return (
        <iframe
          src={url}
          allow="fullscreen; xr-spatial-tracking"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      );
    }

    return <Typography>No action available</Typography>;
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#fff",
        color: "#333",
      }}
    >
      {currentNode && (
        <IconButton
          onClick={() => {
            playClickSound();
            resetToHome();
          }}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 999,
            bgcolor: "rgba(255,255,255,0.8)",
            "&:hover": { bgcolor: "rgba(255,255,255,1)" },
          }}
        >
          <HomeIcon />
        </IconButton>
      )}

      {/* Top 80% */}
      <Box
        sx={{
          flex: 8,
          position: "relative",
          bgcolor: "white",
          overflow: "hidden",
        }}
      >
        {currentVideo ? (
          <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
            <video
              key={homeVideoKey}
              ref={videoRef}
              src={currentVideo}
              autoPlay
              playsInline
              loop={currentNode === null}
              muted={currentNode === null ? isMuted : false}
              controls={false}
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              poster="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
              onPlay={() => {
                if (actionTimer.current) clearTimeout(actionTimer.current);

                if (currentNode?.action) {
                  setSelectedSpeaker(null);

                  const nodeForAction = currentNode;

                  actionTimer.current = setTimeout(() => {
                    setOpenAction(true);
                    setCurrentNode(nodeForAction);
                  }, 5000);
                }

                setVideoLoading(false);
              }}
              onLoadedData={() => setVideoLoading(false)}
              onWaiting={() => setVideoLoading(true)}
              onPlaying={() => setVideoLoading(false)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />

            {currentVideo && videoLoading && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CircularProgress size={60} thickness={4} color="secondary" />
              </Box>
            )}
          </Box>
        ) : (
          <Typography color="white" sx={{ p: 4 }}>
            No video available
          </Typography>
        )}

        {/* OCI logo*/}
        <Box
          sx={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 500,
          }}
        >
          <img
            src="/OCI.png"
            alt="OCI Logo"
            style={{
              height: "150px",
              objectFit: "contain",
              filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.6))",
            }}
          />
        </Box>

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

        {(currentNode ? currentChildren : topNodes).map((node, idx) => (
          <Box
            key={node._id}
            onClick={() => {
              playClickSound();

              if (node.video?.s3Url) {
                setCurrentVideo(node.video.s3Url);
                setVideoLoading(true);
              } else {
                setCurrentVideo(currentVideo || home?.video?.s3Url || null);
                setVideoLoading(false);
              }

              setCurrentNode(node);
              setOpenAction(false);
            }}
            sx={{
              position: "absolute",
              top: `${node.y}%`,
              left: `${node.x}%`,
              width: currentNode
                ? "clamp(6rem, 25vw, 20rem)" // child style
                : "clamp(8rem, 25vw, 28rem)", // parent style
              height: currentNode
                ? "clamp(6rem, 10vw, 20rem)"
                : "clamp(8rem, 10vw, 28rem)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              fontSize: currentNode
                ? "clamp(0.8rem, 2.5vw, 2rem)"
                : "clamp(1rem, 3vw, 3rem)",
              textTransform: "capitalize",
              textAlign: "center",
              padding: "0.5rem",
              animation: `floatY 6s ease-in-out infinite`,
              animationDelay: `${idx * 0.3}s`,
              transition: "all 0.4s ease",
              cursor: "pointer",
              textShadow: "0px 2px 5px rgba(0,0,0,0.9)",
              background: currentNode
                ? "radial-gradient(circle at 30% 30%, #FFD54F, #FF9800)" // child
                : "radial-gradient(circle at 30% 30%, #7BBE3A, #006838)", // parent
              color: "#fff",
              border: currentNode ? "2px solid #fff3e0" : "3px solid #d9f2d9",
              boxShadow: `
        0 20px 30px rgba(0,0,0,0.6),
        0 6px 12px rgba(0,0,0,0.4), 
        0 4px 10px rgba(255,255,255,0.05) inset
      `,
              "&:hover": {
                background: currentNode
                  ? "radial-gradient(circle at 30% 30%, #FFEB3B, #FB8C00)"
                  : "radial-gradient(circle at 30% 30%, #8ed44a, #007a44)",
                transform: "scale(1.05)",
              },
            }}
          >
            {node.title}
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
            onClick={() => {
              playClickSound();
              setSelectedSpeaker(activeSpeaker);
              setOpenAction(true);
            }}
            alignItems="center"
            justifyContent="center"
            sx={{
              minWidth: { xs: "32%", sm: "24%", md: "20%" },
              height: "100%",
              px: 2,
              py: 2,
              mr: 2,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 24px rgba(0,200,83,0.25)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Glow ring */}
            <Box
              sx={{
                position: "absolute",
                inset: -4,
                borderRadius: "inherit",
                background:
                  "radial-gradient(circle at center, rgba(0,200,83,0.2), transparent 70%)",
                animation: `${pulseGlow} 3s infinite`,
                zIndex: 0,
              }}
            />

            {/* LIVE badge */}
            <Box
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                bgcolor: "#e53935",
                color: "white",
                fontSize: "0.7rem",
                fontWeight: "bold",
                px: 1.2,
                py: 0.3,
                borderRadius: 1,
                zIndex: 2,
              }}
            >
              LIVE NOW
            </Box>

            {/* Avatar with gradient ring */}
            <Avatar
              src={activeSpeaker.photoUrl || ""}
              alt={activeSpeaker.name}
              sx={{
                width: "13vh",
                height: "13vh",
                border: "3px solid transparent",
                borderRadius: "50%",
                backgroundImage:
                  "linear-gradient(white, white), linear-gradient(135deg, #00c853, #b2ff59)",
                backgroundOrigin: "border-box",
                backgroundClip: "content-box, border-box",
                mb: 1,
                zIndex: 1,
              }}
            />

            <Typography fontWeight="bold" textAlign="center" noWrap zIndex={1}>
              {activeSpeaker.name}
            </Typography>
            {activeSpeaker.title && (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                noWrap
                zIndex={1}
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
              const isNext = nextSpeaker && spk._id === nextSpeaker._id;

              return (
                <Stack
                  onClick={() => {
                    playClickSound();
                    setSelectedSpeaker(spk);
                    setOpenAction(true);
                  }}
                  key={spk._id || `${spk.name}-${spk.startTime}`}
                  direction="column"
                  alignItems="center"
                  justifyContent="center"
                  spacing={0.5} // small vertical spacing between items
                  sx={{
                    minWidth: "160px",
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    bgcolor: "white",
                    border: isNext ? "3px solid #ff9800" : "1px solid #ddd",
                  }}
                >
                  <Avatar
                    src={spk.photoUrl || ""}
                    alt={spk.name}
                    sx={{ width: "9vh", height: "9vh" }}
                  />

                  <Typography fontWeight="bold" textAlign="center" noWrap>
                    {spk.name}
                  </Typography>

                  {(spk.title || spk.company) && (
                    <Stack direction="column" spacing={0.2} alignItems="center">
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
                      {spk.company && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          textAlign="center"
                          noWrap
                        >
                          {spk.company}
                        </Typography>
                      )}
                    </Stack>
                  )}

                  <Typography fontWeight="bold" textAlign="center" noWrap>
                    {spk.startTime} – {spk.endTime}
                  </Typography>
                </Stack>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Action Popup */}
      <Dialog
        open={openAction}
        onClose={() => {
          setOpenAction(false);
          setSelectedSpeaker(null);
        }}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: currentNode?.action?.width
              ? `${currentNode.action.width}vw`
              : "85vw",
            height: currentNode?.action?.height
              ? `${currentNode.action.height}vh`
              : "95vh",
            mt: "2%",
            mx: "auto",
            borderRadius: 2,
            position: "relative",
            overflow: "hidden",
          },
        }}
      >
        {/* Close button */}
        <IconButton
          aria-label="close"
          onClick={() => {
            setOpenAction(false);
            setSelectedSpeaker(null);
          }}
          sx={{
            position: "absolute",
            right: 16,
            top: 16,
            color: "error.main",
            zIndex: 999,
            bgcolor: "rgba(255,255,255,0.8)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.7)", color: "white" },
          }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent
          sx={{
            p: 0,
            height: "100%",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {renderActionContent()}
          </Box>
        </DialogContent>
      </Dialog>

      <audio ref={buttonSoundRef} src="/buttonSound.wav" preload="auto" />
    </Box>
  );
}

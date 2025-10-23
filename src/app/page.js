"use client";

import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import HomeIcon from "@mui/icons-material/Home";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FullPageLoader from "@/components/FullPageLoader";
import { motion, AnimatePresence } from "framer-motion";

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


  const [vvip, setVvip] = useState(null);
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

  useEffect(() => {
    let intervalId;

    const fetchVvipPlaying = async () => {
      try {
        const res = await fetch("/api/vvips/playing");
        const data = await res.json();

        if (data) {
          if (
            !vvip ||
            vvip._id !== data._id ||
            vvip.video?.s3Url !== data.video?.s3Url
          ) {
            setVvip(data);
            setCurrentVideo(data.video.s3Url);
            setCurrentNode(null);
            setOpenAction(false);
            setVideoLoading(true);
          }
        } else {
          // No VVIP → reset to home
          if (vvip) {
            setVvip(null);
            resetToHome();
          }
        }
      } catch (err) {
        console.error("❌ Error fetching playing VVIP:", err);
      }
    };

    intervalId = setInterval(fetchVvipPlaying, 5000);
    return () => clearInterval(intervalId);
  }, [vvip, home]);

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

  const playClickSound = () => {
    if (buttonSoundRef.current) {
      buttonSoundRef.current.currentTime = 0;
      buttonSoundRef.current.play().catch(() => { });
    }
  };


  function findParentNode(tree, childId) {
    for (const node of tree) {
      if (node.children?.some((c) => c._id === childId)) {
        return node; // found parent
      }
      const deeper = findParentNode(node.children || [], childId);
      if (deeper) return deeper;
    }
    return null;
  }

  const renderActionContent = () => {
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
            key={`${url}-${currentNode?.action?.subtitle?.s3Key}`}
            src={url}
            autoPlay
            playsInline
            loop={false}
            controls
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            poster="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              background: "black",
            }}
          >
            {/* subtitle track for action videos */}
            {currentNode?.action?.subtitle?.s3Key && (
              <track
                src={`/api/subtitles/${encodeURIComponent(
                  currentNode.action.subtitle.s3Key.replace("subtitles/", "")
                )}`}
                kind="subtitles"
                srcLang="en"
                label="English"
                default
              />
            )}
          </video>
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
            width: 64, // bigger button size
            height: 64,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.8)",
            "&:hover": { bgcolor: "rgba(255,255,255,1)" },
          }}
        >
          <HomeIcon sx={{ fontSize: 36 }} />
        </IconButton>
      )}

      {/* Top 80% */}
      <Box
        sx={{
          height: "100vh",
          position: "relative",
          bgcolor: "white",
          overflow: "hidden",
        }}
      >
        {currentVideo ? (
          <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
            {vvip ? (
              // 🎥 VVIP video (with optional subtitles)
              <video
                key={vvip._id}
                src={vvip.video.s3Url}
                autoPlay
                playsInline
                controls={false}
                muted={false}
                loop={false}
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
                poster="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                onEnded={() => {
                  // Do nothing — wait for user to press Home
                }}
                onLoadedData={() => setVideoLoading(false)}
                onWaiting={() => setVideoLoading(true)}
                onPlaying={() => setVideoLoading(false)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              >
                {/* 🎬 optional subtitle track for VVIP */}
                {vvip?.video?.subtitle?.s3Key && (
                  <track
                    src={`/api/subtitles/${encodeURIComponent(
                      vvip.video.subtitle.s3Key.replace("subtitles/", "")
                    )}`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                    default
                  />
                )}
              </video>
            ) : (
              // 🎥 Normal home / node video (with optional subtitles)
              <video
                key={`${homeVideoKey}-${currentNode?.video?.subtitle?.s3Key}`}
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
              >
                {/* 🎬 optional subtitle track for Home or Node */}
                {currentNode?.video?.subtitle?.s3Key ? (
                  <track
                    src={`/api/subtitles/${encodeURIComponent(
                      currentNode.video.subtitle.s3Key.replace("subtitles/", "")
                    )}`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                    default
                  />
                ) : home?.subtitle?.s3Key ? (
                  <track
                    src={`/api/subtitles/${encodeURIComponent(
                      home.subtitle.s3Key.replace("subtitles/", "")
                    )}`}
                    kind="subtitles"
                    srcLang="en"
                    label="English"
                    default
                  />
                ) : null}
              </video>
            )}

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
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
          }}
        >
          <img
            src="/OCI.png"
            alt="OCI Logo"
            style={{
              width: "50vw",
              objectFit: "contain",
              filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.6))",
            }}
          />
        </Box>

        {/* OCI QR*/}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
          }}
        >
          <img
            src="/OCI QR.png"
            alt="OCI QR Code"
            style={{
              width: "25vw",
              objectFit: "contain",
              borderRadius: 10,
              filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.6))",
            }}
          />
        </Box>

        {/* Show mute/unmute only on home */}
        {!vvip && currentNode === null && (
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

        {!vvip &&
          (currentNode ? currentNode.children || [] : topNodes).map(
            (node, idx) => (
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
                    ? "radial-gradient(circle at 30% 30%, #FFD54F, #FF9800)" // child color
                    : "radial-gradient(circle at 30% 30%, #7BBE3A, #006838)", // parent
                  color: "#fff",
                  border: currentNode
                    ? "2px solid #fff3e0"
                    : "3px solid #d9f2d9",
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
                  "&.clicked": {
                    animation: "clickPulse 0.3s ease",
                  },
                  "@keyframes floatY": {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-25px)" },
                  },
                  "@keyframes clickPulse": {
                    "0%": { transform: "scale(1)" },
                    "50%": { transform: "scale(0.7)" },
                    "100%": { transform: "scale(1)" },
                  },
                }}
              >
                {node.title}
              </Box>
            )
          )}
      </Box>


      {/* Action Popup */}
      <Dialog
        open={openAction}
        onClose={() => {
          setOpenAction(false);
          resetToHome();
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
            overflow: "visible",
          },
        }}
      >
        {/* Left Back Button → go to parent node */}
        {currentNode?.parent && (
          <IconButton
            aria-label="back"
            onClick={() => {
              playClickSound();

              if (!currentNode) {
                resetToHome(); // already at root
                return;
              }

              // find parent
              const parentNode = findParentNode(topNodes, currentNode._id);

              if (parentNode) {
                setCurrentNode(parentNode);
                setCurrentVideo(
                  parentNode.video?.s3Url || home?.video?.s3Url || null
                );
                setVideoLoading(!!parentNode.video?.s3Url);
              } else {
                // no parent found → must be root
                resetToHome();
              }

              setOpenAction(false);
            }}
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              zIndex: 999,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.8)",
              "&:hover": { bgcolor: "rgba(255,255,255,1)" },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}

        {/* Right Home Button → reset to home */}
        <IconButton
          aria-label="home"
          onClick={() => {
            setOpenAction(false);
            resetToHome();
          }}
          sx={{
            position: "absolute",
            right: 16,
            top: 16,
            zIndex: 999,
            bgcolor: "rgba(255,255,255,0.8)",
            "&:hover": { bgcolor: "rgba(255,255,255,1)" },
          }}
        >
          <HomeIcon />
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

            {/* Popup overlay */}
            {currentNode?.action?.popup?.s3Url && (
              <Box
                component="img"
                src={currentNode.action.popup.s3Url}
                alt="Popup"
                sx={{
                  position: "absolute",
                  top: `${currentNode.action.popup.y || 0}%`,
                  left: `${currentNode.action.popup.x || 0}%`,
                  transform: "translate(-50%, -50%)",
                  maxWidth: "300px",
                  zIndex: 1000,
                  borderRadius: "8px",
                }}
              />
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <audio ref={buttonSoundRef} src="/buttonSound.wav" preload="auto" />
    </Box>
  );
}

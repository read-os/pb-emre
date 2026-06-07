"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { getSocket } from "@/lib/socket";
import { playSound } from "@/lib/audio";
import { captureFromVideo, createPhotoStrip } from "@/lib/canvas";
import { useSessionStore } from "@/store/session";

// Generate session ID like ACD-7F29
function generateSessionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "ACD-";
  for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export default function BoothPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [phoneUrl, setPhoneUrl] = useState<string>("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");

  const {
    sessionId, setSessionId,
    status, setStatus,
    connectedPhones, setConnectedPhones,
    photos, addPhoto,
    stripData, setStripData,
    selectedFrame,
    countdownValue, setCountdownValue,
    showFlash, setShowFlash,
    resetSession,
  } = useSessionStore();

  const isRunning = status === "countdown" || status === "capturing" || status === "processing";

  // Init session + socket
  useEffect(() => {
    const id = generateSessionId();
    setSessionId(id);
    setStatus("waiting");

    const socket = getSocket();
    socket.emit("booth:create-session", id);

    socket.on("session:phone-joined", ({ count }: { count: number }) => {
      setConnectedPhones(count);
    });
    socket.on("session:frame-selected", ({ frame }: { frame: unknown }) => {
      useSessionStore.getState().setSelectedFrame(frame as never);
    });

    return () => {
      socket.off("session:phone-joined");
      socket.off("session:frame-selected");
    };
  }, [setSessionId, setStatus, setConnectedPhones]);

  // Generate QR code when sessionId is set
  useEffect(() => {
    if (!sessionId) return;
    const url = `${window.location.origin}/phone/${sessionId}`;
    setPhoneUrl(url);
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: "#0a1628", light: "#FFFFFF" },
    }).then(setQrDataUrl);
  }, [sessionId]);

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setCameraError("Câmera não disponível. Verifica as permissões do navegador.");
      }
    }
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const runCountdown = useCallback(async (): Promise<void> => {
    for (let i = 3; i >= 1; i--) {
      setCountdownValue(i);
      playSound("confirm", 0.7);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdownValue(null);
  }, [setCountdownValue]);

  const capturePhoto = useCallback(async (index: number) => {
    if (!videoRef.current || !cameraReady) return;
    setStatus("capturing");

    // Flash effect
    setShowFlash(true);
    playSound("shutter");
    await new Promise((r) => setTimeout(r, 100));
    setShowFlash(false);

    const photoData = captureFromVideo(videoRef.current, 1280, 720);
    addPhoto(photoData, index);

    // Send preview to phones
    const socket = getSocket();
    socket.emit("booth:photo-taken", {
      sessionId,
      photoIndex: index,
      photoData,
      isPreview: false,
    });
    socket.emit("booth:status-update", { sessionId, status: `captured_${index + 1}` });
  }, [cameraReady, addPhoto, sessionId, setShowFlash, setStatus]);

  const startPhotobooth = useCallback(async () => {
    if (!cameraReady || isRunning) return;
    
    const socket = getSocket();
    socket.emit("booth:status-update", { sessionId, status: "starting" });
    setStatus("countdown");

    for (let photoIdx = 0; photoIdx < 3; photoIdx++) {
      await runCountdown();
      await capturePhoto(photoIdx);
      if (photoIdx < 2) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    // Process strip
    setStatus("processing");
    socket.emit("booth:status-update", { sessionId, status: "processing" });

    try {
      const currentPhotos = useSessionStore.getState().photos;
      const currentFrame = useSessionStore.getState().selectedFrame;
      const strip = await createPhotoStrip(
        currentPhotos,
        currentFrame?.src || null,
        600
      );
      setStripData(strip);
      socket.emit("booth:strip-ready", { sessionId, stripData: strip });
      setStatus("done");
    } catch (err) {
      console.error("Strip creation failed:", err);
      setStatus("done");
    }
  }, [cameraReady, isRunning, sessionId, setStatus, runCountdown, capturePhoto, setStripData]);

  const handleReset = useCallback(() => {
    resetSession();
    const socket = getSocket();
    socket.emit("booth:reset-session", sessionId);
    setStatus("waiting");
  }, [resetSession, sessionId, setStatus]);

  const handleDownload = () => {
    if (!stripData) return;
    const a = document.createElement("a");
    a.href = stripData;
    a.download = `acampadentro-${sessionId}.png`;
    a.click();
    playSound("confirm");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Flash overlay */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            className="flash-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        className="flex items-center justify-between px-8 py-4 border-b"
        style={{ borderColor: "rgba(96,165,250,0.15)" }}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl">📸</div>
          <div>
            <div className="text-xl font-black text-white">Photobooth</div>
            <div className="text-xs font-semibold" style={{ color: "var(--yellow)" }}>
              AcampaDentro EMRE
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* Connected phones */}
          <div className="flex items-center gap-2 text-sm">
            <motion.div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: connectedPhones > 0 ? "#22c55e" : "#64748b" }}
              animate={connectedPhones > 0 ? { scale: [1, 1.3, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <span style={{ color: "var(--muted)" }}>
              {connectedPhones} {connectedPhones === 1 ? "telemóvel" : "telemóveis"} ligados
            </span>
          </div>
          {/* Session ID */}
          {sessionId && (
            <div
              className="px-3 py-1.5 rounded-lg text-sm font-mono font-bold"
              style={{ background: "var(--surface2)", color: "var(--blue-glow)" }}
            >
              {sessionId}
            </div>
          )}
        </div>
      </motion.header>

      {/* Main content */}
      <div className="flex flex-1 gap-6 p-6">
        {/* Camera column */}
        <motion.div
          className="flex-1 flex flex-col gap-4"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Camera preview */}
          <div
            className="relative rounded-2xl overflow-hidden glass glow-blue"
            style={{ aspectRatio: "16/9" }}
          >
            {cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center text-center p-8">
                <div>
                  <div className="text-4xl mb-3">📷</div>
                  <p style={{ color: "var(--muted)" }}>{cameraError}</p>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
                muted
                playsInline
              />
            )}

            {/* Countdown overlay */}
            <AnimatePresence>
              {countdownValue !== null && (
                <motion.div
                  key={countdownValue}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "rgba(10,22,40,0.6)", backdropFilter: "blur(2px)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="countdown-number"
                    key={`num-${countdownValue}`}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {countdownValue}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status badge */}
            <div className="absolute top-4 left-4">
              <StatusBadge status={status} />
            </div>

            {/* Photo counter */}
            {isRunning && (
              <div className="absolute top-4 right-4 flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full border-2"
                    style={{
                      borderColor: "white",
                      background: photos[i] ? "white" : "transparent",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {status !== "done" ? (
              <motion.button
                className="btn-yellow flex-1 text-lg"
                onClick={startPhotobooth}
                disabled={!cameraReady || isRunning}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isRunning ? "⏳ A fotografar..." : "📸 Iniciar Sessão"}
              </motion.button>
            ) : (
              <>
                <motion.button
                  className="btn-primary flex-1"
                  onClick={handleDownload}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ⬇️ Guardar Fotografia
                </motion.button>
                <motion.button
                  className="btn-primary flex-1"
                  onClick={handleReset}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ background: "var(--surface2)" }}
                >
                  🔄 Nova Sessão
                </motion.button>
              </>
            )}
          </div>

          {/* Selected frame indicator */}
          {selectedFrame && (
            <motion.div
              className="glass px-4 py-3 flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <img src={selectedFrame.src} alt={selectedFrame.name} className="w-10 h-10 object-cover rounded-lg" />
              <div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Moldura selecionada</div>
                <div className="font-bold text-sm">{selectedFrame.name}</div>
              </div>
              {selectedFrame.category === "skz" && (
                <span className="ml-auto text-xs px-2 py-1 rounded-full font-bold" style={{ background: "rgba(251,191,36,0.15)", color: "var(--yellow)" }}>
                  ✨ SKZ
                </span>
              )}
            </motion.div>
          )}

          {/* Photo strip preview */}
          {status === "done" && stripData && (
            <motion.div
              className="glass p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)" }}>
                STRIP FINAL
              </p>
              <img src={stripData} alt="Photo strip" className="w-full rounded-lg" />
            </motion.div>
          )}
        </motion.div>

        {/* QR Code column */}
        <motion.div
          className="w-80 flex flex-col gap-4"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="glass p-6 flex flex-col items-center gap-4 glow-blue">
            <div className="text-center">
              <p className="font-bold text-lg text-white">Liga o teu telemóvel! 📱</p>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                Aponta a câmera para o QR
              </p>
            </div>

            {qrDataUrl ? (
              <motion.div
                className="p-3 rounded-2xl"
                style={{ background: "white" }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <img src={qrDataUrl} alt="QR Code" className="w-56 h-56" />
              </motion.div>
            ) : (
              <div className="w-56 h-56 rounded-2xl" style={{ background: "var(--surface2)" }} />
            )}

            <div
              className="w-full px-4 py-2 rounded-xl text-center text-sm font-mono"
              style={{ background: "var(--surface2)", color: "var(--blue-glow)" }}
            >
              {phoneUrl || "A gerar link..."}
            </div>
          </div>

          {/* Instruction steps */}
          <div className="glass p-5 space-y-4">
            <p className="font-bold text-sm" style={{ color: "var(--yellow)" }}>
              Como funciona
            </p>
            {[
              { icon: "📱", text: "Lê o QR Code com o telemóvel" },
              { icon: "🖼️", text: "Escolhe a tua moldura favorita" },
              { icon: "📸", text: "Sorri e espera pelo flash!" },
              { icon: "⬇️", text: "Faz download da tua foto" },
            ].map((step, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <span className="text-xl w-8 text-center">{step.icon}</span>
                <span className="text-sm" style={{ color: "var(--muted)" }}>{step.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Taken photos thumbnails */}
          {photos.length > 0 && (
            <motion.div
              className="glass p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)" }}>
                FOTOS TIRADAS ({photos.length}/3)
              </p>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex-1 aspect-video rounded-lg overflow-hidden"
                    style={{ background: "var(--surface2)" }}
                  >
                    {photos[i] && (
                      <img src={photos[i]} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    waiting: { label: "Aguardar", color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
    countdown: { label: "Contagem", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
    capturing: { label: "A capturar!", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
    processing: { label: "A processar", color: "#60a5fa", bg: "rgba(96,165,250,0.15)" },
    done: { label: "Pronto! ✨", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  };
  const s = map[status] || map.waiting;
  return (
    <div
      className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
      style={{ background: s.bg, color: s.color, backdropFilter: "blur(8px)" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: s.color }}
      />
      {s.label}
    </div>
  );
}

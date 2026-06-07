"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket } from "@/lib/socket";
import { playSound } from "@/lib/audio";
import { DEFAULT_FRAMES, SKZ_FRAMES, SECRET_CODE, Frame } from "@/lib/frames";

type PhoneStatus = "joining" | "waiting" | "shooting" | "done" | "error";

export default function PhonePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [status, setStatus] = useState<PhoneStatus>("joining");
  const [sessionStatus, setSessionStatus] = useState<string>("waiting");
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [stripData, setStripData] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [skzUnlocked, setSkzUnlocked] = useState(false);
  const [secretCode, setSecretCode] = useState("");
  const [showSecretAnim, setShowSecretAnim] = useState(false);
  const [activeTab, setActiveTab] = useState<"camera" | "frames" | "download">("frames");
  const secretInputRef = useRef<HTMLInputElement>(null);

  const allFrames = skzUnlocked ? [...DEFAULT_FRAMES, ...SKZ_FRAMES] : DEFAULT_FRAMES;

  useEffect(() => {
    const socket = getSocket();
    socket.emit("phone:join-session", sessionId);
    setStatus("waiting");

    socket.on("session:state", ({ status: s, selectedFrame: f }: { status: string; selectedFrame: Frame | null }) => {
      setSessionStatus(s);
      if (f) setSelectedFrame(f);
    });

    socket.on("session:status", ({ status: s }: { status: string }) => {
      setSessionStatus(s);
      if (s === "starting") setStatus("shooting");
    });

    socket.on("session:frame-updated", ({ frame }: { frame: Frame }) => {
      setSelectedFrame(frame);
    });

    socket.on("session:photo-received", ({ photoIndex, photoData }: { photoIndex: number; photoData: string }) => {
      setPhotos((prev) => ({ ...prev, [photoIndex]: photoData }));
      setStatus("shooting");
      setActiveTab("camera");
    });

    socket.on("session:strip-ready", ({ stripData: strip }: { stripData: string }) => {
      setStripData(strip);
      setStatus("done");
      setActiveTab("download");
      playSound("confirm");
    });

    socket.on("session:reset", () => {
      setPhotos({});
      setStripData(null);
      setStatus("waiting");
      setActiveTab("frames");
    });

    socket.on("error", () => setStatus("error"));

    return () => {
      socket.off("session:state");
      socket.off("session:status");
      socket.off("session:frame-updated");
      socket.off("session:photo-received");
      socket.off("session:strip-ready");
      socket.off("session:reset");
      socket.off("error");
    };
  }, [sessionId]);

  const handleSelectFrame = (frame: Frame) => {
    setSelectedFrame(frame);
    playSound("select", 0.6);
    const socket = getSocket();
    socket.emit("phone:select-frame", { sessionId, frame });
  };

  const handleSecretCode = (value: string) => {
    setSecretCode(value);
    if (value === SECRET_CODE && !skzUnlocked) {
      setSkzUnlocked(true);
      setShowSecretAnim(true);
      playSound("confirm");
      setTimeout(() => setShowSecretAnim(false), 3000);
    }
  };

  const handleDownload = () => {
    if (!stripData) return;
    const a = document.createElement("a");
    a.href = stripData;
    a.download = `photobooth-acampadentro-${sessionId}.png`;
    a.click();
    playSound("confirm");
  };

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold mb-2">Sessão não encontrada</h2>
          <p style={{ color: "var(--muted)" }}>Pede ao staff para gerar um novo QR Code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto" style={{ background: "var(--bg)" }}>
      {/* SKZ unlock animation */}
      <AnimatePresence>
        {showSecretAnim && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(10,22,40,0.95)", backdropFilter: "blur(10px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center px-8"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <motion.div
                className="text-7xl mb-4"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ✨
              </motion.div>
              <h2 className="text-3xl font-black mb-2" style={{ color: "var(--yellow)" }}>
                Categoria Secreta
              </h2>
              <p className="text-xl font-bold text-white">Desbloqueada!</p>
              <div className="flex gap-3 justify-center mt-4">
                {["🐺", "⚔️", "🌟", "🔥", "💫"].map((e, i) => (
                  <motion.span
                    key={i}
                    className="text-2xl"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    {e}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-3 border-b"
        style={{ borderColor: "rgba(96,165,250,0.15)" }}
      >
        <div className="text-2xl">📸</div>
        <div className="flex-1">
          <div className="font-black text-white text-base">Photobooth</div>
          <div className="text-xs font-semibold" style={{ color: "var(--yellow)" }}>
            AcampaDentro EMRE
          </div>
        </div>
        <div
          className="text-xs px-2 py-1 rounded-lg font-mono font-bold"
          style={{ background: "var(--surface2)", color: "var(--blue-glow)" }}
        >
          {sessionId}
        </div>
      </div>

      {/* Session status banner */}
      <AnimatePresence>
        {(sessionStatus === "starting" || sessionStatus.startsWith("captured")) && (
          <motion.div
            className="mx-4 mt-3 px-4 py-3 rounded-xl flex items-center gap-3"
            style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ background: "var(--yellow)" }}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
            <span className="text-sm font-semibold" style={{ color: "var(--yellow)" }}>
              {sessionStatus === "starting" ? "📸 A sessão começou!" : `✅ Foto ${Object.keys(photos).length}/3 tirada!`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 p-1 rounded-xl" style={{ background: "var(--surface)" }}>
        {(["frames", "camera", "download"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: activeTab === tab ? "var(--blue)" : "transparent",
              color: activeTab === tab ? "white" : "var(--muted)",
            }}
          >
            {tab === "frames" ? "🖼️ Molduras" : tab === "camera" ? "📷 Fotos" : "⬇️ Download"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {/* FRAMES TAB */}
          {activeTab === "frames" && (
            <motion.div
              key="frames"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)" }}>
                  MOLDURAS DEFAULT
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {DEFAULT_FRAMES.map((frame) => (
                    <FrameCard
                      key={frame.id}
                      frame={frame}
                      selected={selectedFrame?.id === frame.id}
                      onSelect={handleSelectFrame}
                    />
                  ))}
                </div>
              </div>

              {skzUnlocked && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold" style={{ color: "var(--yellow)" }}>
                      ✨ CATEGORIA SKZ
                    </span>
                    <div className="flex-1 h-px" style={{ background: "rgba(251,191,36,0.3)" }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {SKZ_FRAMES.map((frame) => (
                      <FrameCard
                        key={frame.id}
                        frame={frame}
                        selected={selectedFrame?.id === frame.id}
                        onSelect={handleSelectFrame}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Secret code */}
              <div className="glass p-4">
                <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)" }}>
                  {skzUnlocked ? "🔓 CÓDIGO JÁ INSERIDO" : "🔐 CÓDIGO SECRETO"}
                </p>
                {!skzUnlocked ? (
                  <div className="flex gap-2">
                    <input
                      ref={secretInputRef}
                      type="text"
                      value={secretCode}
                      onChange={(e) => handleSecretCode(e.target.value)}
                      placeholder="Insere o código..."
                      maxLength={6}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono font-bold tracking-widest"
                      style={{
                        background: "var(--surface2)",
                        border: "1px solid rgba(96,165,250,0.2)",
                        color: "white",
                        outline: "none",
                      }}
                    />
                    <button
                      className="btn-primary px-4 py-2 text-sm"
                      onClick={() => handleSecretCode(secretCode)}
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                    style={{ background: "rgba(251,191,36,0.1)" }}
                  >
                    <span>✨</span>
                    <span className="text-sm font-bold" style={{ color: "var(--yellow)" }}>
                      Desbloqueado!
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* CAMERA/PHOTOS TAB */}
          {activeTab === "camera" && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {Object.keys(photos).length === 0 ? (
                <div className="glass p-8 text-center">
                  <div className="text-4xl mb-3">🎬</div>
                  <p className="font-bold mb-1">Ainda sem fotos</p>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    As fotos vão aparecer aqui assim que o Booth iniciar a sessão
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                    FOTOS TIRADAS ({Object.keys(photos).length}/3)
                  </p>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: "var(--surface)", aspectRatio: "16/9" }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: photos[i] ? 1 : 0.3, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      {photos[i] ? (
                        <img src={photos[i]} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl" style={{ color: "var(--surface2)" }}>
                            📷
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </>
              )}
            </motion.div>
          )}

          {/* DOWNLOAD TAB */}
          {activeTab === "download" && (
            <motion.div
              key="download"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {!stripData ? (
                <div className="glass p-8 text-center">
                  <motion.div
                    className="text-4xl mb-3"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    ⏳
                  </motion.div>
                  <p className="font-bold mb-1">A processar...</p>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    Aguarda que o Booth termine a sessão
                  </p>
                </div>
              ) : (
                <>
                  <motion.div
                    className="glass p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)" }}>
                      A TUA FOTOGRAFIA ✨
                    </p>
                    <img
                      src={stripData}
                      alt="Photo strip"
                      className="w-full rounded-xl shadow-xl"
                    />
                  </motion.div>

                  <motion.button
                    className="btn-yellow w-full text-lg py-5"
                    onClick={handleDownload}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    ⬇️ Guardar Fotografia
                  </motion.button>

                  <motion.div
                    className="glass p-4 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <p className="text-sm font-bold mb-1">Partilha o momento! 💛</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      #AcampaDentroEMRE
                    </p>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom safe area */}
      <div className="h-6" />
    </div>
  );
}

function FrameCard({
  frame,
  selected,
  onSelect,
}: {
  frame: Frame;
  selected: boolean;
  onSelect: (f: Frame) => void;
}) {
  return (
    <motion.div
      className={`frame-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(frame)}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="relative aspect-square" style={{ background: "var(--surface2)" }}>
        <img
          src={frame.src}
          alt={frame.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        {selected && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(251,191,36,0.3)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ background: "var(--yellow)", color: "var(--bg)" }}
            >
              ✓
            </div>
          </motion.div>
        )}
      </div>
      <div
        className="px-3 py-2 text-xs font-semibold truncate"
        style={{ background: "var(--surface)", color: selected ? "var(--yellow)" : "var(--muted)" }}
      >
        {frame.category === "skz" && "⭐ "}{frame.name}
      </div>
    </motion.div>
  );
}

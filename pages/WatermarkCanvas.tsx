import React, { useRef, useEffect, useState } from "react";

interface WatermarkCanvasProps {
  imageUrl: string;
  watermarkUrl?: string; // default nằm trong folder /watermark
  className?: string;
}

const WatermarkCanvas: React.FC<WatermarkCanvasProps> = ({
  imageUrl,
  watermarkUrl = "./watermark/watermark.png", // <-- Sửa đúng thư mục chung folder
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  /** cập nhật size khi resize hoặc khi mount */
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  /** render ảnh + watermark */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mainImg = new Image();
    mainImg.crossOrigin = "anonymous";
    mainImg.src = imageUrl;

    const wmImg = new Image();
    wmImg.crossOrigin = "anonymous";
    wmImg.src = watermarkUrl;

    Promise.all([
      new Promise((resolve) => (mainImg.onload = resolve)),
      new Promise((resolve) => {
        wmImg.onload = resolve;
        wmImg.onerror = () => resolve(null); // nếu thiếu watermark → không lỗi
      }),
    ]).then(() => {
      /** Scale ảnh chính theo container */
      const scale = Math.min(
        size.width / mainImg.width,
        size.height / mainImg.height
      );

      const drawWidth = mainImg.width * scale;
      const drawHeight = mainImg.height * scale;

      canvas.width = drawWidth;
      canvas.height = drawHeight;

      /** Vẽ ảnh chính */
      ctx.drawImage(mainImg, 0, 0, drawWidth, drawHeight);

      /** Vẽ watermark nếu có */
      if (wmImg.width > 0) {
        ctx.save();
        ctx.globalAlpha = 0.45;

        const wmScale = (drawWidth * 0.35) / wmImg.width;
        const wmW = wmImg.width * wmScale;
        const wmH = wmImg.height * wmScale;

        const x = (drawWidth - wmW) / 2;
        const y = (drawHeight - wmH) / 2;

        ctx.drawImage(wmImg, x, y, wmW, wmH);
        ctx.restore();
      } else {
        /** fallback nếu không tìm thấy watermark */
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "white";
        ctx.font = `bold ${drawWidth * 0.08}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Photo moments", drawWidth / 2, drawHeight / 2);
        ctx.restore();
      }
    });
  }, [imageUrl, watermarkUrl, size]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full shadow-xl border border-zinc-700"
      />
    </div>
  );
};

export default WatermarkCanvas;

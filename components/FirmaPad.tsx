"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import SignaturePadLib from "signature_pad";

export interface FirmaHandle {
  estaVacia: () => boolean;
  limpiar: () => void;
  dataURL: () => string;
}

interface Props {
  etiqueta: string;
}

// Pad de firma con calibración correcta: la resolución interna del canvas
// se iguala al tamaño CSS renderizado x devicePixelRatio, evitando el
// desfase entre el dedo/ratón y el trazo.
export const FirmaPad = forwardRef<FirmaHandle, Props>(function FirmaPad(
  { etiqueta },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const calibrar = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = padRef.current?.toData();
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      padRef.current?.clear();
      if (data) padRef.current?.fromData(data);
    };

    padRef.current = new SignaturePadLib(canvas, {
      backgroundColor: "rgb(17, 28, 48)",
      penColor: "rgb(241, 245, 249)",
      minWidth: 0.8,
      maxWidth: 2.2,
    });

    calibrar();
    window.addEventListener("resize", calibrar);
    return () => {
      window.removeEventListener("resize", calibrar);
      padRef.current?.off();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    estaVacia: () => padRef.current?.isEmpty() ?? true,
    limpiar: () => padRef.current?.clear(),
    dataURL: () => padRef.current?.toDataURL("image/png") ?? "",
  }));

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-soft)" }}>
          {etiqueta}
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => padRef.current?.clear()}
        >
          Limpiar
        </button>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: 150,
          background: "var(--surface-2)",
          border: "2px dashed var(--line)",
          borderRadius: "var(--r-sm)",
          touchAction: "none",
          cursor: "crosshair",
          display: "block",
        }}
      />
    </div>
  );
});

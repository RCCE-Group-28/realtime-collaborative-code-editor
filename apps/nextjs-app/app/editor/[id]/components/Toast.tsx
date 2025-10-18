"use client";

import React, { useEffect, useState } from "react";
import { VscCheck, VscError, VscClose, VscInfo } from "react-icons/vsc";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      const exitTimer = setTimeout(() => {
        onDismiss(toast.id);
      }, 300); // Match animation duration
      return () => clearTimeout(exitTimer);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  };

  // Enhanced color schemes with gradients
  const styles = {
    success: {
      bg: "bg-gradient-to-r from-emerald-600 to-emerald-700 border-emerald-500/50",
      icon: "text-emerald-200",
      icon_comp: VscCheck,
    },
    error: {
      bg: "bg-gradient-to-r from-red-600 to-red-700 border-red-500/50",
      icon: "text-red-200",
      icon_comp: VscError,
    },
    info: {
      bg: "bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500/50",
      icon: "text-blue-200",
      icon_comp: VscInfo,
    },
  };

  const style = styles[toast.type];
  const Icon = style.icon_comp;

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isExiting
          ? "-translate-y-96 opacity-0 scale-90"
          : "translate-y-0 opacity-100 scale-100"
      }`}
    >
      <div
        className={`
          inline-flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg 
          backdrop-blur-md border ${style.bg}
          text-white
          hover:shadow-xl transition-shadow duration-300
        `}
      >
        {/* Icon */}
        <Icon className={`w-4 h-4 flex-shrink-0 ${style.icon}`} />

        {/* Message */}
        <p className="text-xs font-semibold leading-tight whitespace-nowrap">
          {toast.message}
        </p>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className={`
            flex-shrink-0 p-0.5 rounded 
            hover:bg-white/20 transition-all duration-200
            text-white/70 hover:text-white
            ml-1 active:scale-90
          `}
          aria-label="Dismiss notification"
        >
          <VscClose className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

"use client";

import { toast } from "react-toastify";

/**
 * A yes/no confirmation rendered as a toast, replacing window.confirm.
 * Resolves true when confirmed, false when cancelled or dismissed.
 */
export function confirmToast(message: string, confirmLabel = "Confirm"): Promise<boolean> {
  return new Promise((resolve) => {
    let decided = false;
    toast(
      ({ closeToast }) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm">{message}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                decided = true;
                resolve(false);
                closeToast();
              }}
              className="rounded-md px-3 py-1 text-xs font-medium hover:bg-black/10 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                decided = true;
                resolve(true);
                closeToast();
              }}
              className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium hover:opacity-90"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
        draggable: false,
        theme: "light",
        onClose: () => {
          if (!decided) resolve(false);
        },
      },
    );
  });
}

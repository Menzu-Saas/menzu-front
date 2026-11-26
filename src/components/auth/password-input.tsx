"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Icon, Input, type InputProps } from "@/components/ui";

/** Large password input with a show/hide toggle. */
export function PasswordInput(props: Omit<InputProps, "type" | "size" | "leftIcon" | "rightSlot">) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      size="lg"
      type={visible ? "text" : "password"}
      leftIcon={LockKeyhole}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className="-mr-1 inline-flex size-8 items-center justify-center rounded-md text-ink-subtle transition-colors duration-150 ease-out hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Icon icon={visible ? EyeOff : Eye} size={18} />
        </button>
      }
    />
  );
}

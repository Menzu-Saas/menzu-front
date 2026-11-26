import { LogOut } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui";
import { signOutAction } from "@/server/actions/auth";

/** Sign-out as a plain form post (works without JavaScript). `next` is kept for the following login. */
export function SignOutButton({
  variant = "outline",
  size = "sm",
  className,
  next,
  children = "Sair",
}: Pick<ButtonProps, "variant" | "size" | "className" | "children"> & { next?: string }) {
  return (
    <form action={signOutAction}>
      {next && <input type="hidden" name="next" value={next} />}
      <Button type="submit" variant={variant} size={size} className={className}>
        <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
        {children}
      </Button>
    </form>
  );
}

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={{ zIndex: 999999, position: 'fixed' }}
      position="bottom-right"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-card !text-foreground !border-border !shadow-2xl !z-[2147483647] !opacity-100 !backdrop-blur-sm",
          description: "!text-foreground/90",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
        style: {
          zIndex: 2147483647,
          position: 'fixed',
          backgroundColor: 'hsl(var(--card))',
          color: 'hsl(var(--foreground))',
          opacity: 1,
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      duration={1000}
      position="top-center"
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-xl !px-6 !py-4 !min-w-[280px] !justify-center !text-center group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl",
          title: "!text-base !font-medium",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

/**
 * AURA Design System Theme Configuration
 * Decouples hardcoded Tailwind/CSS colors into reusable tokens.
 * Supports centralized changes and future dark/light mode toggle.
 */

export const theme = {
  // Background tokens
  bg: {
    app: "bg-app-bg",
    sidebar: "bg-sidebar-bg",
    header: "bg-header-bg",
    card: "bg-card-bg",
    panel: "bg-panel-bg",
    modal: "bg-modal-bg",
  },

  // Typography tokens
  text: {
    primary: "text-text-primary",
    secondary: "text-text-secondary",
    muted: "text-text-muted",
    placeholder: "placeholder:text-text-placeholder",
    disabled: "text-text-disabled",
  },

  // Border tokens
  border: {
    default: "border-border-default",
    hover: "hover:border-border-hover",
    focus: "focus:border-border-focus focus-within:border-border-focus focus:ring-1 focus:ring-primary focus-within:ring-1 focus-within:ring-primary",
  },

  // Color Palette tokens
  primary: {
    base: "bg-primary",
    hover: "hover:bg-primary-hover",
    text: "text-primary",
    light: "text-primary-light",
    accent: "text-accent",
  },

  // Status tokens
  status: {
    success: {
      text: "text-status-success",
      bg: "bg-status-success-bg",
      border: "border-status-success",
    },
    warning: {
      text: "text-status-warning",
      bg: "bg-status-warning-bg",
      border: "border-status-warning",
    },
    error: {
      text: "text-status-error",
      bg: "bg-status-error-bg",
      border: "border-status-error",
    },
    info: {
      text: "text-status-info",
      bg: "bg-status-info-bg",
      border: "border-status-info",
    },
  },
};

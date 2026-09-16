import "server-only";
import { StyleSheet } from "@react-pdf/renderer";

// Loosely mirrors the app's Modernist design tokens (app/globals.css) —
// same accent/ink/neutral palette, translated to react-pdf's flexbox
// subset. @react-pdf/renderer ships Helvetica/Times/Courier as built-in
// base-14 fonts with no download/registration needed, which is why this
// stays on Helvetica rather than the app's system-font stack.
export const colors = {
  ink: "#201e1d",
  body: "#444141",
  muted: "#605d5d",
  hairline: "#d7d3d3",
  surface: "#f3f2f2",
  accent: "#ec3013",
  accentDark: "#ae1800",
};

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.ink,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  brandMark: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  docMeta: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.muted,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  rowLabel: {
    color: colors.muted,
  },
  rowValue: {
    fontFamily: "Helvetica-Bold",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.ink,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  totalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  paragraph: {
    fontSize: 9.5,
    color: colors.body,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: colors.muted,
    borderTopWidth: 0.5,
    borderTopColor: colors.hairline,
    paddingTop: 8,
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  checklistDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
});

import "server-only";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

/** Renders a react-pdf <Document> element to a PDF byte buffer. */
export async function renderPdfToBuffer(document: ReactElement<DocumentProps>): Promise<Buffer> {
  return renderToBuffer(document);
}

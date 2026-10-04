import type { ServiceCall, ServiceCallWorkReport } from "@amarok-one/types";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function line(label: string, value?: string): string {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || "—")}</td></tr>`;
}

/** Opens the browser print sheet, which supports saving and sharing as PDF on iPhone Safari. */
export function printRepairOrder(serviceCall: ServiceCall, report?: ServiceCallWorkReport): void {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;

  const equipment =
    serviceCall.equipmentModel ?? serviceCall.equipment?.model ?? serviceCall.equipment?.name;
  const parts = report?.parts ?? [];
  const partsRows = parts.length
    ? parts
        .map((part) => {
          const name = part.manualName ?? part.catalogPart?.name ?? "—";
          const partNumber = part.manualPartNumber ?? part.catalogPart?.partNumber ?? "—";
          return `<tr><td>${escapeHtml(name)}</td><td dir="ltr">${escapeHtml(partNumber)}</td><td>${part.quantity}</td></tr>`;
        })
        .join("")
    : '<tr><td colspan="3">לא דווחו חלפים.</td></tr>';

  popup.document.write(`<!doctype html>
    <html lang="he" dir="rtl"><head><meta charset="utf-8" />
    <title>הזמנת תיקון ${escapeHtml(serviceCall.serviceCallNumber)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #17263a; margin: 28px; }
      h1 { margin: 0 0 6px; font-size: 25px; } p { margin: 0 0 20px; color: #536174; }
      h2 { font-size: 16px; margin: 26px 0 8px; } table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #cbd5e1; padding: 9px; text-align: right; vertical-align: top; }
      th { width: 28%; background: #f7f8fa; } .signature { height: 80px; border: 1px solid #cbd5e1; padding: 10px; }
      @media print { body { margin: 14mm; } }
    </style></head><body>
      <h1>הזמנת תיקון</h1><p>${escapeHtml(serviceCall.serviceCallNumber)} · ${escapeHtml(serviceCall.title)}</p>
      <h2>פרטי הכלי</h2><table>
        ${line("כלי", equipment)}${line("מספר רישוי", serviceCall.equipmentLicensePlate)}${line("מספר שלדה", serviceCall.equipmentChassisNumber)}
      </table>
      <h2>פירוט ותיאור התקלה</h2><table>${line("תיאור", serviceCall.description)}</table>
      <h2>עבודה שבוצעה</h2><table>${line("פירוט", report?.workPerformed)}</table>
      <h2>חלפים שהורכבו</h2><table><thead><tr><th>חלק</th><th>מק״ט</th><th>כמות</th></tr></thead><tbody>${partsRows}</tbody></table>
      <h2>בעל הציוד או נציגו</h2><table>${line("שם", report?.customerName)}</table>
      <h2>חתימה דיגיטלית</h2><div class="signature">${report?.customerSignatureData ? "חתום דיגיטלית" : "לא נחתם"}</div>
    </body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

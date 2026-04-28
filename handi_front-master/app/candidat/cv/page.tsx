"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/layout";

type CvTemplate = "classic" | "modern" | "sidebar";

type CvTheme = {
  id: string;
  name: string;
  primary: string;
  surface: string;
  accent: string;
};

type CvExperience = {
  id: string;
  role: string;
  company: string;
  period: string;
  details: string;
};

type CvEducation = {
  id: string;
  diploma: string;
  school: string;
  period: string;
  details: string;
};

type CvProject = {
  id: string;
  title: string;
  period: string;
  details: string;
};

type CvAchievement = {
  id: string;
  title: string;
  details: string;
};

type CvVolunteer = {
  id: string;
  role: string;
  organization: string;
  period: string;
  details: string;
};

type CvFormState = {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  summary: string;
  skills: string;
  languages: string;
  certifications: string;
  template: CvTemplate;
  colorThemeId: string;
  experiences: CvExperience[];
  education: CvEducation[];
  projects: CvProject[];
  achievements: CvAchievement[];
  volunteer: CvVolunteer[];
};

const STORAGE_KEY = "candidate_cv_builder_v1";

const themes: CvTheme[] = [
  { id: "ocean", name: "Ocean", primary: "#0f4c81", surface: "#eef6ff", accent: "#2f7de1" },
  { id: "forest", name: "Forest", primary: "#1f5c42", surface: "#eefaf4", accent: "#2ba36b" },
  { id: "sunset", name: "Sunset", primary: "#8f3b2e", surface: "#fff4ef", accent: "#e36b42" },
  { id: "slate", name: "Slate", primary: "#243447", surface: "#f4f7fb", accent: "#5c7cfa" },
];

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createExperience(): CvExperience {
  return { id: createId("exp"), role: "", company: "", period: "", details: "" };
}

function createEducation(): CvEducation {
  return { id: createId("edu"), diploma: "", school: "", period: "", details: "" };
}

function createProject(): CvProject {
  return { id: createId("proj"), title: "", period: "", details: "" };
}

function createDefaultState(): CvFormState {
  return {
    fullName: "",
    title: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    summary: "",
    skills: "",
    languages: "",
    certifications: "",
    template: "modern",
    colorThemeId: "ocean",
    experiences: [],
    education: [],
    projects: [],
    achievements: [],
    volunteer: [],
  };
}

function createAchievement(): CvAchievement {
  return { id: createId("achievement"), title: "", details: "" };
}

function createVolunteer(): CvVolunteer {
  return { id: createId("volunteer"), role: "", organization: "", period: "", details: "" };
}

function normalizeCvState(value: unknown): CvFormState {
  const defaults = createDefaultState();
  const data = (value && typeof value === "object" ? value : {}) as Partial<CvFormState>;

  return {
    ...defaults,
    ...data,
    fullName: typeof data.fullName === "string" ? data.fullName : defaults.fullName,
    title: typeof data.title === "string" ? data.title : defaults.title,
    email: typeof data.email === "string" ? data.email : defaults.email,
    phone: typeof data.phone === "string" ? data.phone : defaults.phone,
    address: typeof data.address === "string" ? data.address : defaults.address,
    website: typeof data.website === "string" ? data.website : defaults.website,
    summary: typeof data.summary === "string" ? data.summary : defaults.summary,
    skills: typeof data.skills === "string" ? data.skills : defaults.skills,
    languages: typeof data.languages === "string" ? data.languages : defaults.languages,
    certifications: typeof data.certifications === "string" ? data.certifications : defaults.certifications,
    template: data.template === "classic" || data.template === "modern" || data.template === "sidebar" ? data.template : defaults.template,
    colorThemeId: typeof data.colorThemeId === "string" ? data.colorThemeId : defaults.colorThemeId,
    experiences: Array.isArray(data.experiences) ? data.experiences : defaults.experiences,
    education: Array.isArray(data.education) ? data.education : defaults.education,
    projects: Array.isArray(data.projects) ? data.projects : defaults.projects,
    achievements: Array.isArray(data.achievements) ? data.achievements : defaults.achievements,
    volunteer: Array.isArray(data.volunteer) ? data.volunteer : defaults.volunteer,
  };
}

function parseList(value: string | undefined | null) {
  return (value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const safe = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  return {
    r: parseInt(safe.slice(0, 2), 16) / 255,
    g: parseInt(safe.slice(2, 4), 16) / 255,
    b: parseInt(safe.slice(4, 6), 16) / 255,
  };
}

function splitTextForPdf(text: string, fontSize: number, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }

  const averageCharWidth = fontSize * 0.52;
  const maxChars = Math.max(12, Math.floor(maxWidth / averageCharWidth));
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    if (word.length <= maxChars) {
      current = word;
      continue;
    }

    let remaining = word;
    while (remaining.length > maxChars) {
      lines.push(remaining.slice(0, maxChars - 1) + "-");
      remaining = remaining.slice(maxChars - 1);
    }
    current = remaining;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function sectionTitle(title: string, theme: CvTheme) {
  return `<h2 style="margin:0 0 12px;font-size:15px;letter-spacing:0.08em;text-transform:uppercase;color:${theme.primary};border-bottom:2px solid ${theme.accent};padding-bottom:6px;">${escapeHtml(title)}</h2>`;
}

function buildCvHtml(cv: CvFormState, theme: CvTheme) {
  const skills = parseList(cv.skills);
  const languages = parseList(cv.languages);
  const certifications = parseList(cv.certifications);
  const experiences = cv.experiences.filter((item) => item.role || item.company || item.details);
  const education = cv.education.filter((item) => item.diploma || item.school || item.details);
  const projects = cv.projects.filter((item) => item.title || item.details);
  const achievements = cv.achievements.filter((item) => item.title || item.details);
  const volunteer = cv.volunteer.filter((item) => item.role || item.organization || item.details);

  const header = `
    <header style="padding:28px 32px;background:${cv.template === "classic" ? "#fff" : theme.surface};border-bottom:3px solid ${theme.accent};">
      <h1 style="margin:0;color:${theme.primary};font-size:34px;">${escapeHtml(cv.fullName || "Your Name")}</h1>
      <p style="margin:8px 0 0;color:#334155;font-size:18px;">${escapeHtml(cv.title || "Professional Title")}</p>
      <p style="margin:14px 0 0;color:#475569;font-size:14px;">${[cv.email, cv.phone, cv.address, cv.website].filter(Boolean).map(escapeHtml).join(" | ")}</p>
    </header>
  `;

  const summary = cv.summary
    ? `<section>${sectionTitle("Professional Summary", theme)}<p style="margin:0;color:#334155;line-height:1.7;">${escapeHtml(cv.summary)}</p></section>`
    : "";

  const expHtml = experiences.length
    ? `<section>${sectionTitle("Experience", theme)}${experiences
        .map(
          (item) => `
          <article style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
              <div>
                <strong style="display:block;color:#0f172a;font-size:16px;">${escapeHtml(item.role || "Role")}</strong>
                <span style="color:${theme.accent};font-weight:600;">${escapeHtml(item.company || "Company")}</span>
              </div>
              <span style="color:#64748b;font-size:13px;white-space:nowrap;">${escapeHtml(item.period)}</span>
            </div>
            <p style="margin:8px 0 0;color:#334155;line-height:1.7;">${escapeHtml(item.details)}</p>
          </article>`,
        )
        .join("")}</section>`
    : "";

  const eduHtml = education.length
    ? `<section>${sectionTitle("Education", theme)}${education
        .map(
          (item) => `
          <article style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
              <div>
                <strong style="display:block;color:#0f172a;font-size:16px;">${escapeHtml(item.diploma || "Diploma")}</strong>
                <span style="color:${theme.accent};font-weight:600;">${escapeHtml(item.school || "School")}</span>
              </div>
              <span style="color:#64748b;font-size:13px;white-space:nowrap;">${escapeHtml(item.period)}</span>
            </div>
            <p style="margin:8px 0 0;color:#334155;line-height:1.7;">${escapeHtml(item.details)}</p>
          </article>`,
        )
        .join("")}</section>`
    : "";

  const projectHtml = projects.length
    ? `<section>${sectionTitle("Projects", theme)}${projects
        .map(
          (item) => `
          <article style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
              <strong style="display:block;color:#0f172a;font-size:16px;">${escapeHtml(item.title || "Project")}</strong>
              <span style="color:#64748b;font-size:13px;white-space:nowrap;">${escapeHtml(item.period)}</span>
            </div>
            <p style="margin:8px 0 0;color:#334155;line-height:1.7;">${escapeHtml(item.details)}</p>
          </article>`,
        )
        .join("")}</section>`
    : "";

  const achievementHtml = achievements.length
    ? `<section>${sectionTitle("Achievements", theme)}${achievements
        .map(
          (item) => `
          <article style="margin-bottom:16px;">
            <strong style="display:block;color:#0f172a;font-size:16px;">${escapeHtml(item.title || "Achievement")}</strong>
            <p style="margin:8px 0 0;color:#334155;line-height:1.7;">${escapeHtml(item.details)}</p>
          </article>`,
        )
        .join("")}</section>`
    : "";

  const volunteerHtml = volunteer.length
    ? `<section>${sectionTitle("Volunteer", theme)}${volunteer
        .map(
          (item) => `
          <article style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
              <div>
                <strong style="display:block;color:#0f172a;font-size:16px;">${escapeHtml(item.role || "Role")}</strong>
                <span style="color:${theme.accent};font-weight:600;">${escapeHtml(item.organization || "Organization")}</span>
              </div>
              <span style="color:#64748b;font-size:13px;white-space:nowrap;">${escapeHtml(item.period)}</span>
            </div>
            <p style="margin:8px 0 0;color:#334155;line-height:1.7;">${escapeHtml(item.details)}</p>
          </article>`,
        )
        .join("")}</section>`
    : "";

  const sidebarLists = [
    skills.length ? `<section>${sectionTitle("Skills", theme)}<ul style="margin:0;padding-left:18px;color:#334155;line-height:1.8;">${skills.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : "",
    languages.length ? `<section>${sectionTitle("Languages", theme)}<ul style="margin:0;padding-left:18px;color:#334155;line-height:1.8;">${languages.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : "",
    certifications.length ? `<section>${sectionTitle("Certifications", theme)}<ul style="margin:0;padding-left:18px;color:#334155;line-height:1.8;">${certifications.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : "",
  ].join("");

  const mainSections = [summary, expHtml, eduHtml, projectHtml, achievementHtml, volunteerHtml].join("");

  const content =
    cv.template === "sidebar"
      ? `
      <div style="display:grid;grid-template-columns:250px 1fr;min-height:900px;">
        <aside style="background:${theme.surface};padding:28px 24px;display:flex;flex-direction:column;gap:24px;">${sidebarLists}</aside>
        <main style="padding:28px 32px;display:flex;flex-direction:column;gap:26px;">${mainSections}</main>
      </div>`
      : `
      <main style="padding:28px 32px;display:grid;grid-template-columns:${cv.template === "modern" ? "1.4fr 0.8fr" : "1fr"};gap:28px;">
        <div style="display:flex;flex-direction:column;gap:26px;">${mainSections}</div>
        ${cv.template === "modern" ? `<aside style="display:flex;flex-direction:column;gap:24px;">${sidebarLists}</aside>` : ""}
      </main>`;

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(cv.fullName || "CV")}</title>
    <style>
      body { margin:0; background:#e2e8f0; font-family: Georgia, "Times New Roman", serif; }
      .page { width:210mm; min-height:297mm; margin:24px auto; background:#fff; box-shadow:0 20px 40px rgba(15,23,42,0.12); }
      * { box-sizing:border-box; }
      @media print {
        body { background:#fff; }
        .page { width:auto; min-height:auto; margin:0; box-shadow:none; }
      }
    </style>
  </head>
  <body>
    <div class="page">${header}${content}</div>
    <script>window.onload = () => { window.focus(); };</script>
  </body>
  </html>`;
}

function buildCvPdfBlob(cv: CvFormState, theme: CvTheme) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 44;
  const headerHeight = 92;
  const contentWidth = pageWidth - margin * 2;
  const themeRgb = hexToRgb(theme.primary);
  const accentRgb = hexToRgb(theme.accent);
  const mutedRgb = { r: 0.29, g: 0.33, b: 0.38 };
  const darkRgb = { r: 0.07, g: 0.09, b: 0.12 };
  const pages: string[] = [];
  let currentPage = "";
  let y = pageHeight - margin;

  const beginPage = () => {
    currentPage = [
      `${themeRgb.r.toFixed(3)} ${themeRgb.g.toFixed(3)} ${themeRgb.b.toFixed(3)} rg`,
      `0 ${pageHeight - headerHeight} ${pageWidth} ${headerHeight} re f`,
      "BT",
      "/F2 24 Tf",
      "1 1 1 rg",
      `1 0 0 1 ${margin} ${pageHeight - 54} Tm`,
      `(${escapePdfText(cv.fullName || "Your Name")}) Tj`,
      "ET",
      "BT",
      "/F1 12 Tf",
      "1 1 1 rg",
      `1 0 0 1 ${margin} ${pageHeight - 74} Tm`,
      `(${escapePdfText([cv.title, cv.email, cv.phone].filter(Boolean).join(" | ") || "Professional Title")}) Tj`,
      "ET",
    ].join("\n");
    y = pageHeight - headerHeight - 28;
  };

  const pushPage = () => {
    pages.push(currentPage);
    currentPage = "";
  };

  const ensureSpace = (heightNeeded: number) => {
    if (!currentPage) {
      beginPage();
      return;
    }

    if (y - heightNeeded < margin) {
      pushPage();
      beginPage();
    }
  };

  const addTextLine = (text: string, options?: { size?: number; font?: "F1" | "F2"; color?: { r: number; g: number; b: number }; x?: number }) => {
    const size = options?.size ?? 11;
    const font = options?.font ?? "F1";
    const color = options?.color ?? darkRgb;
    const x = options?.x ?? margin;

    ensureSpace(size + 8);
    currentPage += `\nBT\n/${font} ${size} Tf\n${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} rg\n1 0 0 1 ${x} ${y} Tm\n(${escapePdfText(text)}) Tj\nET`;
    y -= size + 6;
  };

  const addWrappedParagraph = (text: string, options?: { size?: number; x?: number; width?: number; color?: { r: number; g: number; b: number } }) => {
    const size = options?.size ?? 11;
    const x = options?.x ?? margin;
    const width = options?.width ?? contentWidth;
    const color = options?.color ?? mutedRgb;
    const lines = splitTextForPdf(text, size, width);

    for (const line of lines) {
      addTextLine(line, { size, font: "F1", color, x });
    }
  };

  const addSection = (title: string) => {
    ensureSpace(28);
    y -= 4;
    addTextLine(title.toUpperCase(), { size: 13, font: "F2", color: accentRgb });
    currentPage += `\n${accentRgb.r.toFixed(3)} ${accentRgb.g.toFixed(3)} ${accentRgb.b.toFixed(3)} RG\n${margin} ${y + 2} ${contentWidth} 0 l S`;
    y -= 6;
  };

  beginPage();

  const headerMeta = [cv.address, cv.website].filter(Boolean).join(" | ");
  if (headerMeta) {
    addTextLine(headerMeta, { size: 10, color: mutedRgb });
    y -= 4;
  }

  if (cv.summary.trim()) {
    addSection("Professional Summary");
    addWrappedParagraph(cv.summary);
    y -= 4;
  }

  const experiences = cv.experiences.filter((item) => item.role || item.company || item.details);
  if (experiences.length) {
    addSection("Experience");
    for (const item of experiences) {
      addTextLine(`${item.role || "Role"}${item.company ? ` - ${item.company}` : ""}`, { size: 12, font: "F2", color: darkRgb });
      if (item.period) {
        addTextLine(item.period, { size: 10, color: accentRgb });
      }
      if (item.details) {
        addWrappedParagraph(item.details);
      }
      y -= 4;
    }
  }

  const education = cv.education.filter((item) => item.diploma || item.school || item.details);
  if (education.length) {
    addSection("Education");
    for (const item of education) {
      addTextLine(`${item.diploma || "Diploma"}${item.school ? ` - ${item.school}` : ""}`, { size: 12, font: "F2", color: darkRgb });
      if (item.period) {
        addTextLine(item.period, { size: 10, color: accentRgb });
      }
      if (item.details) {
        addWrappedParagraph(item.details);
      }
      y -= 4;
    }
  }

  const projects = cv.projects.filter((item) => item.title || item.details);
  if (projects.length) {
    addSection("Projects");
    for (const item of projects) {
      addTextLine(item.title || "Project", { size: 12, font: "F2", color: darkRgb });
      if (item.period) {
        addTextLine(item.period, { size: 10, color: accentRgb });
      }
      if (item.details) {
        addWrappedParagraph(item.details);
      }
      y -= 4;
    }
  }

  const achievements = cv.achievements.filter((item) => item.title || item.details);
  if (achievements.length) {
    addSection("Achievements");
    for (const item of achievements) {
      addTextLine(item.title || "Achievement", { size: 12, font: "F2", color: darkRgb });
      if (item.details) {
        addWrappedParagraph(item.details);
      }
      y -= 4;
    }
  }

  const volunteer = cv.volunteer.filter((item) => item.role || item.organization || item.details);
  if (volunteer.length) {
    addSection("Volunteer");
    for (const item of volunteer) {
      addTextLine(`${item.role || "Role"}${item.organization ? ` - ${item.organization}` : ""}`, { size: 12, font: "F2", color: darkRgb });
      if (item.period) {
        addTextLine(item.period, { size: 10, color: accentRgb });
      }
      if (item.details) {
        addWrappedParagraph(item.details);
      }
      y -= 4;
    }
  }

  const listSections = [
    { title: "Skills", items: parseList(cv.skills) },
    { title: "Languages", items: parseList(cv.languages) },
    { title: "Certifications", items: parseList(cv.certifications) },
  ];

  for (const section of listSections) {
    if (!section.items.length) {
      continue;
    }

    addSection(section.title);
    for (const item of section.items) {
      addWrappedParagraph(`• ${item}`);
    }
    y -= 4;
  }

  if (currentPage) {
    pushPage();
  }

  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const contentIds = pages.map((page) =>
    addObject(`<< /Length ${page.length} >>\nstream\n${page}\nendstream`),
  );
  const pageIds = contentIds.map((contentId) =>
    addObject(`<< /Type /Page /Parent PAGES_REF 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`),
  );
  const pagesId = addObject(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`);
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const resolvedObjects = objects.map((content) => content.replaceAll("PAGES_REF", String(pagesId)));
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  resolvedObjects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${resolvedObjects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${resolvedObjects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function updateById<T extends { id: string }>(items: T[], id: string, patch: Partial<T>) {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export default function CandidateCvPage() {
  const [cv, setCv] = useState<CvFormState>(createDefaultState);
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      let nextCv = createDefaultState();
      if (saved) {
        nextCv = normalizeCvState(JSON.parse(saved));
      }
      setCv(nextCv);
      setPreviewHtml(buildCvHtml(nextCv, themes.find((theme) => theme.id === nextCv.colorThemeId) ?? themes[0]));
    } catch {
      // Ignore invalid local storage payloads and fall back to defaults.
      const fallbackCv = createDefaultState();
      setCv(fallbackCv);
      setPreviewHtml(buildCvHtml(fallbackCv, themes[0]));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cv));
  }, [cv, hydrated]);

  const activeTheme = useMemo(
    () => themes.find((theme) => theme.id === cv.colorThemeId) ?? themes[0],
    [cv.colorThemeId],
  );

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPreviewHtml(buildCvHtml(cv, activeTheme));
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [activeTheme, cv, hydrated]);

  const downloadPdf = () => {
    const blob = buildCvPdfBlob(cv, activeTheme);
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(cv.fullName || "candidate-cv").trim().replace(/\s+/g, "-").toLowerCase()}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    setMessage("CV PDF downloaded successfully.");
  };

  const resetBuilder = () => {
    const nextCv = createDefaultState();
    setCv(nextCv);
    setPreviewHtml(buildCvHtml(nextCv, themes[0]));
    setMessage("A fresh CV draft is ready.");
  };

  if (!hydrated) {
    return <div className="p-6">Loading CV builder...</div>;
  }

  return (
    <div className="app-page stack-lg">
      <PageHeader
        badge="CV Builder"
        title="Build a CV that is ready to send."
        description="Shape your story, organize your experience, and preview a stronger CV before exporting it."
        actions={
          <div className="page-header-actions">
            <Button variant="secondary" onClick={resetBuilder}>Reset draft</Button>
            <Button onClick={downloadPdf}>Download PDF</Button>
          </div>
        }
      />

      {message ? <div className="message message-info">{message}</div> : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.95fr] gap-6">
        <div className="stack-lg">
          <Card className="space-y-4" padding="lg">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Style</h2>
              <p className="text-sm text-gray-600">Pick a ready-made layout and the color palette that fits your profile best.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: "classic", label: "Classic", text: "Single-column, formal, straightforward." },
                { id: "modern", label: "Modern", text: "Balanced main column with a side summary." },
                { id: "sidebar", label: "Sidebar", text: "Strong left column for skills and languages." },
              ].map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setCv((current) => ({ ...current, template: template.id as CvTemplate }))}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${cv.template === template.id ? "border-slate-900 bg-slate-900 text-white" : "border-gray-200 bg-white hover:border-slate-400"}`}
                >
                  <strong className="block">{template.label}</strong>
                  <span className={`mt-2 block text-sm ${cv.template === template.id ? "text-slate-100" : "text-gray-600"}`}>{template.text}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setCv((current) => ({ ...current, colorThemeId: theme.id }))}
                  className={`flex items-center gap-3 rounded-full border px-4 py-2 transition ${cv.colorThemeId === theme.id ? "border-slate-900 bg-slate-50" : "border-gray-200 bg-white hover:border-slate-300"}`}
                >
                  <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: theme.primary }} />
                  <span className="text-sm font-medium text-gray-800">{theme.name}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4" padding="lg">
            <h2 className="text-xl font-semibold text-gray-900">Personal information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full name" value={cv.fullName} onChange={(value) => setCv((current) => ({ ...current, fullName: value }))} />
              <Input label="Professional title" value={cv.title} onChange={(value) => setCv((current) => ({ ...current, title: value }))} />
              <Input label="Email" value={cv.email} onChange={(value) => setCv((current) => ({ ...current, email: value }))} />
              <Input label="Phone" value={cv.phone} onChange={(value) => setCv((current) => ({ ...current, phone: value }))} />
              <Input label="Address" value={cv.address} onChange={(value) => setCv((current) => ({ ...current, address: value }))} />
              <Input label="Website / LinkedIn" value={cv.website} onChange={(value) => setCv((current) => ({ ...current, website: value }))} />
            </div>
          </Card>

          <Card className="space-y-4" padding="lg">
            <h2 className="text-xl font-semibold text-gray-900">Summary and key lists</h2>
            <TextArea label="Professional summary" value={cv.summary} rows={5} onChange={(value) => setCv((current) => ({ ...current, summary: value }))} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextArea label="Skills" hint="One skill per line" value={cv.skills} rows={7} onChange={(value) => setCv((current) => ({ ...current, skills: value }))} />
              <TextArea label="Languages" hint="One language per line" value={cv.languages} rows={7} onChange={(value) => setCv((current) => ({ ...current, languages: value }))} />
              <TextArea label="Certifications" hint="One item per line" value={cv.certifications} rows={7} onChange={(value) => setCv((current) => ({ ...current, certifications: value }))} />
            </div>
          </Card>

          <DynamicSection
            title="Experience"
            description="Add your work history and describe your impact in simple, concrete terms."
            addLabel="Add experience"
            items={cv.experiences}
            onAdd={() => setCv((current) => ({ ...current, experiences: [...current.experiences, createExperience()] }))}
            onRemove={(id) => setCv((current) => ({ ...current, experiences: current.experiences.filter((item) => item.id !== id) }))}
            renderItem={(item) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Role" value={item.role} onChange={(value) => setCv((current) => ({ ...current, experiences: updateById(current.experiences, item.id, { role: value }) }))} />
                <Input label="Company" value={item.company} onChange={(value) => setCv((current) => ({ ...current, experiences: updateById(current.experiences, item.id, { company: value }) }))} />
                <Input label="Period" value={item.period} onChange={(value) => setCv((current) => ({ ...current, experiences: updateById(current.experiences, item.id, { period: value }) }))} />
                <div />
                <div className="md:col-span-2">
                  <TextArea label="Details" value={item.details} rows={4} onChange={(value) => setCv((current) => ({ ...current, experiences: updateById(current.experiences, item.id, { details: value }) }))} />
                </div>
              </div>
            )}
          />

          <DynamicSection
            title="Education"
            description="List your studies, degrees, or training paths."
            addLabel="Add education"
            items={cv.education}
            onAdd={() => setCv((current) => ({ ...current, education: [...current.education, createEducation()] }))}
            onRemove={(id) => setCv((current) => ({ ...current, education: current.education.filter((item) => item.id !== id) }))}
            renderItem={(item) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Diploma / program" value={item.diploma} onChange={(value) => setCv((current) => ({ ...current, education: updateById(current.education, item.id, { diploma: value }) }))} />
                <Input label="School / institution" value={item.school} onChange={(value) => setCv((current) => ({ ...current, education: updateById(current.education, item.id, { school: value }) }))} />
                <Input label="Period" value={item.period} onChange={(value) => setCv((current) => ({ ...current, education: updateById(current.education, item.id, { period: value }) }))} />
                <div />
                <div className="md:col-span-2">
                  <TextArea label="Details" value={item.details} rows={4} onChange={(value) => setCv((current) => ({ ...current, education: updateById(current.education, item.id, { details: value }) }))} />
                </div>
              </div>
            )}
          />

          <DynamicSection
            title="Projects"
            description="Highlight important projects, volunteer work, or portfolio items."
            addLabel="Add project"
            items={cv.projects}
            onAdd={() => setCv((current) => ({ ...current, projects: [...current.projects, createProject()] }))}
            onRemove={(id) => setCv((current) => ({ ...current, projects: current.projects.filter((item) => item.id !== id) }))}
            renderItem={(item) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Project title" value={item.title} onChange={(value) => setCv((current) => ({ ...current, projects: updateById(current.projects, item.id, { title: value }) }))} />
                <Input label="Period" value={item.period} onChange={(value) => setCv((current) => ({ ...current, projects: updateById(current.projects, item.id, { period: value }) }))} />
                <div className="md:col-span-2">
                  <TextArea label="Details" value={item.details} rows={4} onChange={(value) => setCv((current) => ({ ...current, projects: updateById(current.projects, item.id, { details: value }) }))} />
                </div>
              </div>
            )}
          />

          <DynamicSection
            title="Achievements"
            description="Add certifications, awards, or notable outcomes you want to highlight."
            addLabel="Add achievement"
            items={cv.achievements}
            emptyText="This section is optional. Add an achievement only if it strengthens your CV."
            onAdd={() => setCv((current) => ({ ...current, achievements: [...current.achievements, createAchievement()] }))}
            onRemove={(id) => setCv((current) => ({ ...current, achievements: current.achievements.filter((item) => item.id !== id) }))}
            renderItem={(item) => (
              <div className="grid grid-cols-1 gap-4">
                <Input label="Achievement title" value={item.title} onChange={(value) => setCv((current) => ({ ...current, achievements: updateById(current.achievements, item.id, { title: value }) }))} />
                <TextArea label="Details" value={item.details} rows={4} onChange={(value) => setCv((current) => ({ ...current, achievements: updateById(current.achievements, item.id, { details: value }) }))} />
              </div>
            )}
          />

          <DynamicSection
            title="Volunteer"
            description="Add volunteer work, associations, or community involvement if relevant."
            addLabel="Add volunteer role"
            items={cv.volunteer}
            emptyText="This section is optional. Add it only if it supports your profile."
            onAdd={() => setCv((current) => ({ ...current, volunteer: [...current.volunteer, createVolunteer()] }))}
            onRemove={(id) => setCv((current) => ({ ...current, volunteer: current.volunteer.filter((item) => item.id !== id) }))}
            renderItem={(item) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Role" value={item.role} onChange={(value) => setCv((current) => ({ ...current, volunteer: updateById(current.volunteer, item.id, { role: value }) }))} />
                <Input label="Organization" value={item.organization} onChange={(value) => setCv((current) => ({ ...current, volunteer: updateById(current.volunteer, item.id, { organization: value }) }))} />
                <Input label="Period" value={item.period} onChange={(value) => setCv((current) => ({ ...current, volunteer: updateById(current.volunteer, item.id, { period: value }) }))} />
                <div />
                <div className="md:col-span-2">
                  <TextArea label="Details" value={item.details} rows={4} onChange={(value) => setCv((current) => ({ ...current, volunteer: updateById(current.volunteer, item.id, { details: value }) }))} />
                </div>
              </div>
            )}
          />
        </div>

        <div className="stack-lg">
          <Card className="space-y-4" padding="lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Live preview</h2>
                <p className="text-sm text-gray-600">The preview refreshes automatically after a short pause while you type.</p>
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]" style={{ background: activeTheme.surface, color: activeTheme.primary }}>
                {cv.template}
              </span>
            </div>

            {!cv.fullName && !cv.summary && parseList(cv.skills).length === 0 ? (
              <EmptyState title="Start filling your CV" description="Add your name, title, and a few sections to see the final result appear here." />
            ) : (
              <iframe
                title="CV preview"
                srcDoc={previewHtml}
                className="h-[980px] w-full rounded-2xl border border-gray-200 bg-white"
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="champ" />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="champ" style={{ resize: "vertical" }} />
      {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
    </label>
  );
}

function DynamicSection<T extends { id: string }>({
  title,
  description,
  addLabel,
  items = [],
  emptyText,
  onAdd,
  onRemove,
  renderItem,
}: {
  title: string;
  description: string;
  addLabel: string;
  items?: T[];
  emptyText?: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <Card className="space-y-4" padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <Button variant="secondary" onClick={onAdd}>{addLabel}</Button>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
            {emptyText || "This section is optional. Add an item only if you need it in your CV."}
          </div>
        ) : null}
        {items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <strong className="text-gray-900">{title} #{index + 1}</strong>
              {items.length > 0 ? (
                <Button variant="ghost" onClick={() => onRemove(item.id)}>Remove</Button>
              ) : null}
            </div>
            {renderItem(item)}
          </div>
        ))}
      </div>
    </Card>
  );
}

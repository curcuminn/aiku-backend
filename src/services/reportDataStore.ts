// services/reportDataStore.ts
import fs from "fs";
import path from "path";

type ReportJson = unknown; // JSON şemanız farklı olabilir; unknown bırakıyoruz.

const CANDIDATE_DIRS = [
    process.env.REPORT_DATA_DIR || "",                                 // 1) ENV ile verilen (varsa)
    path.resolve(process.cwd(), "data", "reports"),                     // 2) <root>/data/reports
    path.resolve(process.cwd(), "src", "data", "reports"),              // 3) <root>/src/data/reports  <-- SENDEKİ
    path.resolve(__dirname, "../data/reports"),                         // 4) derlenmiş dosyaya göre ../data/reports
    path.resolve(__dirname, "../../data/reports"),                      // 5) derlenmiş yapıda bir üst
];

class ReportDataStore {
    private cache = new Map<string, { mtimeMs: number; data: ReportJson }>();

    private resolvePath(reportId: string): string {
        const filename = reportId === "startupIdeas"
            ? "startupIdeas_new.json"
            : `${reportId}.json`;

        for (const dir of CANDIDATE_DIRS.filter(Boolean)) {
            const fp = path.join(dir, filename);
            if (fs.existsSync(fp)) return fp;
        }
        // bulunamadıysa, teşhis kolay olsun diye hepsini yazalım
        const tried = CANDIDATE_DIRS.filter(Boolean).map(d => path.join(d, filename));
        throw new Error(`Report JSON not found. Tried:\n- ${tried.join("\n- ")}`);
    }

    private statOrNull(fp: string): fs.Stats | null {
        try { return fs.statSync(fp); } catch { return null; }
    }

    loadReport(reportId: string): ReportJson {
        const fp = this.resolvePath(reportId);
        const st = this.statOrNull(fp);
        if (!st) throw new Error(`Report JSON not found: ${fp}`);
        const cached = this.cache.get(fp);
        if (cached && cached.mtimeMs === st.mtimeMs) return cached.data;

        const raw = fs.readFileSync(fp, "utf-8");
        const json = JSON.parse(raw);
        this.cache.set(fp, { mtimeMs: st.mtimeMs, data: json });
        return json;
    }

    getSection(reportId: string, ideaId?: string, sectionKey?: string) {
        const json = this.loadReport(reportId);
        if (!ideaId && !sectionKey) return { report: json, section: null };
        if (!Array.isArray(json)) return { report: json, section: null };
        const item = json.find((x: any) => String(x?.id) === String(ideaId));
        if (!item) return { report: json, section: null };
        const section = sectionKey ? item?.[sectionKey] : item;
        return { report: json, section };
    }
}

export const reportDataStore = new ReportDataStore();

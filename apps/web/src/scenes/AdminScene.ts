import Phaser from "phaser";
import { api, getInitData, getWebApp, isApiEnabled } from "../api";
import {
  addNotebookBackground,
  NOTEBOOK_INK,
  NOTEBOOK_MUTED,
} from "../ui/notebookBg";
import { addPenTextButton } from "../ui/penControls";

const ADMIN_IDS = (import.meta.env.VITE_ADMIN_TELEGRAM_IDS as string | undefined)
  ?.split(",")
  .map((s) => s.trim())
  .filter(Boolean) ?? ["240579504"];

export function isClientAdmin(): boolean {
  const id = (
    getWebApp() as { initDataUnsafe?: { user?: { id?: number } } } | null
  )?.initDataUnsafe?.user?.id;
  if (id == null) return false;
  return ADMIN_IDS.includes(String(id));
}

export class AdminScene extends Phaser.Scene {
  private panel?: HTMLDivElement;

  constructor() {
    super("admin");
  }

  create() {
    const { width, height } = this.scale;
    addNotebookBackground(this);

    this.add
      .text(width / 2, height * 0.08, "Админ", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "30px",
        color: NOTEBOOK_INK,
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.14, "Рассылка в game-бота", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "14px",
        color: NOTEBOOK_MUTED,
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    if (!isClientAdmin()) {
      this.add
        .text(width / 2, height * 0.4, "Нет доступа", {
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "18px",
          color: NOTEBOOK_INK,
          fontStyle: "italic",
        })
        .setOrigin(0.5);
      addPenTextButton(this, width / 2, height * 0.9, "В меню", () => {
        this.scene.start("menu");
      });
      return;
    }

    this.mountForm();
    addPenTextButton(this, width / 2, height * 0.92, "В меню", () => {
      this.unmountForm();
      this.scene.start("menu");
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unmountForm());
  }

  private mountForm() {
    this.unmountForm();
    const parent = document.getElementById("game") ?? document.body;
    const panel = document.createElement("div");
    panel.id = "dundee-admin-panel";
    panel.style.cssText = [
      "position:absolute",
      "left:50%",
      "top:16%",
      "transform:translateX(-50%)",
      "width:92%",
      "max-width:420px",
      "box-sizing:border-box",
      "padding:0",
      "z-index:40",
      "font-family:Georgia,serif",
      "color:#1f2a44",
      "display:flex",
      "flex-direction:column",
      "gap:10px",
      "overflow:hidden",
    ].join(";");

    const ta = document.createElement("textarea");
    ta.placeholder = "Текст сообщения…";
    ta.rows = 5;
    ta.style.cssText = [
      "display:block",
      "width:100%",
      "max-width:100%",
      "box-sizing:border-box",
      "padding:10px",
      "border:2px solid #1f2a44",
      "border-radius:10px",
      "background:#f4f1e8",
      "resize:vertical",
      "font:italic 15px Georgia,serif",
    ].join(";");

    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.style.cssText =
      "display:block;width:100%;max-width:100%;box-sizing:border-box;font:14px Georgia,serif;";

    const status = document.createElement("div");
    status.style.cssText =
      "min-height:1.2em;font:italic 13px Georgia,serif;color:#4a5a78;word-break:break-word;";

    const btn = document.createElement("button");
    btn.textContent = "Отправить всем";
    btn.style.cssText = [
      "display:block",
      "width:100%",
      "box-sizing:border-box",
      "padding:12px",
      "border:2px solid #1f2a44",
      "border-radius:12px",
      "background:#f4f1e8",
      "font:italic 16px Georgia,serif",
      "cursor:pointer",
    ].join(";");

    btn.onclick = () => {
      void this.send(ta.value, file.files?.[0] ?? null, status, btn);
    };

    if (!isApiEnabled() || !getInitData()) {
      status.textContent =
        "Нужен API + вход из Telegram. Либо используй /admin в боте.";
      btn.disabled = true;
    } else {
      void api<{ total: number; active: number; blocked: number }>("/admin/stats")
        .then((s) => {
          status.textContent = `Активных: ${s.active} · заблок.: ${s.blocked} · всего: ${s.total}`;
        })
        .catch(() => {
          status.textContent = "Не удалось загрузить статистику";
        });
    }

    panel.append(ta, file, btn, status);
    parent.style.position = parent.style.position || "relative";
    parent.appendChild(panel);
    this.panel = panel;
  }

  private unmountForm() {
    this.panel?.remove();
    this.panel = undefined;
  }

  private async send(
    text: string,
    image: File | null,
    status: HTMLDivElement,
    btn: HTMLButtonElement,
  ) {
    if (!text.trim() && !image) {
      status.textContent = "Нужен текст или картинка";
      return;
    }
    btn.disabled = true;
    status.textContent = "Отправка…";
    try {
      let photoBase64: string | undefined;
      if (image) {
        photoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("file read failed"));
          reader.readAsDataURL(image);
        });
      }
      const res = await api<{
        sent: number;
        blocked: number;
        failed: number;
        targets: number;
      }>("/admin/broadcast", {
        method: "POST",
        json: {
          text: text.trim(),
          photoBase64,
          photoFilename: image?.name,
        },
      });
      status.textContent = `Готово: ${res.sent}/${res.targets} · блок ${res.blocked} · ошибки ${res.failed}`;
    } catch (err) {
      status.textContent = (err as Error).message;
    } finally {
      btn.disabled = false;
    }
  }
}

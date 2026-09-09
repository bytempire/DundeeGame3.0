import Phaser from "phaser";
import { api, getInitData, getWebApp, isApiEnabled } from "../api";
import {
  addNotebookBackground,
  NOTEBOOK_INK,
  NOTEBOOK_MUTED,
} from "../ui/notebookBg";
import { addPenTextButton } from "../ui/penControls";
import { isClientAdmin } from "./AdminScene";
import { DPR, fontPx } from "../ui/dpr";

type MeResponse = {
  coinBalance: number;
  vpnBotUrl: string;
  shop: { oneDayCoins: number; threeDayCoins: number };
  limits: {
    dayUsed: number;
    dayMax: number;
    weekUsed: number;
    weekMax: number;
  };
};

export class MenuScene extends Phaser.Scene {
  private me: MeResponse | null = null;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super("menu");
  }

  create() {
    const { width, height } = this.scale;
    addNotebookBackground(this);

    this.add
      .text(width / 2, height * 0.1, "DUNDEE RUNNER", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(34),
        color: NOTEBOOK_INK,
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    // Hero stick-trick preview on the menu
    this.add
      .sprite(width / 2, height * 0.4, "crocodile-trick")
      .setOrigin(0.5, 0.9375)
      .setScale(0.52 * DPR)
      .setDepth(5)
      .play("stick_trick");

    this.statusText = this.add
      .text(width / 2, height * 0.46, "Загрузка…", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: fontPx(14),
        color: NOTEBOOK_MUTED,
        align: "center",
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    addPenTextButton(this, width / 2, height * 0.54, "Играть", () => {
      this.scene.start("play");
    });

    addPenTextButton(this, width / 2, height * 0.63, "Босс-битвы", () => {
      this.scene.start("boss-select");
    });

    addPenTextButton(this, width / 2, height * 0.72, "Рекорды", () => {
      this.scene.start("leaderboard");
    });

    addPenTextButton(this, width / 2, height * 0.81, "Магазин VPN", () => {
      void this.openShop();
    });

    addPenTextButton(this, width / 2, height * 0.9, "Открыть VPN-бот", () => {
      const url = this.me?.vpnBotUrl ?? "https://t.me/VpnDundeeBot";
      getWebApp()?.openTelegramLink?.(url) ?? window.open(url, "_blank");
    });

    if (isClientAdmin()) {
      addPenTextButton(this, width / 2, height * 0.97, "Админ", () => {
        this.scene.start("admin");
      }, { height: 36, fontSize: "15px" });
    }

    void this.refreshMe();
  }

  private async refreshMe() {
    if (!isApiEnabled()) {
      this.statusText.setText(
        "Офлайн-режим\nКлючи/VPN-награды появятся после подключения API",
      );
      return;
    }
    if (!getInitData()) {
      this.statusText.setText("Открой игру из Telegram-бота");
      return;
    }
    try {
      this.me = await api<MeResponse>("/me");
      this.statusText.setText(
        `Ключи: ${this.me.coinBalance}\n1 день = ${this.me.shop.oneDayCoins} · 3 дня = ${this.me.shop.threeDayCoins}\nЛимит: ${this.me.limits.dayUsed}/${this.me.limits.dayMax} дн. сегодня`,
      );
    } catch {
      this.statusText.setText("API недоступен — можно играть офлайн");
    }
  }

  private async openShop() {
    if (!isApiEnabled()) {
      alert("Магазин VPN заработает, когда подключится API.");
      return;
    }
    if (!this.me) {
      await this.refreshMe();
    }
    if (!this.me) return;

    const choice = window.confirm(
      `Обменять ключи на VPN?\n\nOK = 1 день (${this.me.shop.oneDayCoins})\nCancel = отмена`,
    );
    if (!choice) return;

    try {
      const days =
        this.me.coinBalance >= this.me.shop.threeDayCoins &&
        window.confirm("Купить 3 дня? OK=3, Cancel=1")
          ? 3
          : 1;
      const res = await api<{
        ok: boolean;
        message: string;
        coinBalance: number;
        vpnBotUrl: string;
      }>("/redeem", { method: "POST", json: { days } });
      alert(`${res.message}\nБаланс: ${res.coinBalance}`);
      getWebApp()?.openTelegramLink?.(res.vpnBotUrl);
      await this.refreshMe();
    } catch (err) {
      alert((err as Error).message);
    }
  }
}

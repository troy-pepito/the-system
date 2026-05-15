#!/usr/bin/env node
// Phase 2 i18n catchup: dashboard + dailyQuests + questBriefing.
// 15 keys × 8 locales = 120 translations.

import fs from "node:fs";
import path from "node:path";

const TRANSLATIONS = {
  "dashboard.firstHunterHeader": {
    es: "[ Primera Misión Disponible ]",
    pt: "[ Primeira Missão Disponível ]",
    fr: "[ Première Quête Disponible ]",
    de: "[ Erste Quest Verfügbar ]",
    ja: "[ 最初のクエスト ]",
    ko: "[ 첫 퀘스트 가능 ]",
    zh: "[ 首个任务可用 ]",
    hi: "[ पहली क्वेस्ट उपलब्ध ]",
  },
  "dashboard.firstHunterBody": {
    es: "Bienvenido, cazador. Tu primera acción está a un toque arriba. Marca cualquier Misión Diaria para ganar tu primer XP, o abre el Registro de Portales abajo para entrar a una mazmorra.",
    pt: "Bem-vindo, caçador. Sua primeira ação está a um toque acima. Marque qualquer Missão Diária para ganhar seu primeiro XP, ou abra o Registro de Portais abaixo para entrar em uma masmorra.",
    fr: "Bienvenue, chasseur. Ta première action est à un tap au-dessus. Coche n'importe quelle Quête Quotidienne pour gagner ton premier XP, ou ouvre le Registre des Portails ci-dessous pour explorer un donjon.",
    de: "Willkommen, Jäger. Deine erste Aktion ist einen Tipp entfernt. Hake eine beliebige Tägliche Quest ab, um dein erstes XP zu verdienen, oder öffne das Portal-Verzeichnis unten, um einen Dungeon zu betreten.",
    ja: "ようこそ、ハンター。最初の行動はすぐ上のタップひとつです。デイリークエストにチェックを入れて最初のXPを獲得するか、下のポータル登録からダンジョンに挑みましょう。",
    ko: "환영합니다, 헌터. 첫 행동은 바로 위 한 번의 탭입니다. 데일리 퀘스트를 체크해 첫 XP를 얻거나, 아래의 포털 레지스트리에서 던전에 도전하세요.",
    zh: "欢迎，猎人。你的第一个行动就在上方一触之间。勾选任意每日任务来获得你的第一份XP，或打开下方的传送门登记进入副本。",
    hi: "स्वागत है, हंटर। आपका पहला कदम बस ऊपर एक टैप दूर है। पहला XP कमाने के लिए कोई भी डेली क्वेस्ट टिक करें, या नीचे पोर्टल रजिस्ट्री खोलकर डंजन में प्रवेश करें।",
  },
  "dailyQuests.resetsIn": {
    es: "Se reinicia en",
    pt: "Reinicia em",
    fr: "Réinitialise dans",
    de: "Setzt zurück in",
    ja: "リセットまで",
    ko: "초기화까지",
    zh: "重置剩余",
    hi: "रीसेट में",
  },
  "dailyQuests.progressLabel": {
    es: "{done}/{total} completadas",
    pt: "{done}/{total} concluídas",
    fr: "{done}/{total} terminées",
    de: "{done}/{total} erledigt",
    ja: "{done}/{total} 達成",
    ko: "{done}/{total} 완료",
    zh: "{done}/{total} 已完成",
    hi: "{done}/{total} पूर्ण",
  },
  "dailyQuests.systemWarningScattered": {
    es: "El Sistema marcó ayer como silencio. Rompe el patrón hoy.",
    pt: "O Sistema marcou ontem como silêncio. Quebre o padrão hoje.",
    fr: "Le Système a marqué hier comme silence. Brise le schéma aujourd'hui.",
    de: "Das System hat gestern als Stille markiert. Durchbrich das Muster heute.",
    ja: "システムは昨日を「沈黙」と記録しました。今日、その流れを断ちましょう。",
    ko: "시스템이 어제를 침묵으로 기록했습니다. 오늘 그 흐름을 끊으세요.",
    zh: "系统将昨日标记为沉默。今天打破它。",
    hi: "सिस्टम ने कल को मौन के रूप में चिह्नित किया। आज इसे तोड़ें।",
  },
  "dailyQuests.systemNoticeIdle": {
    es: "La ventana se cierra a medianoche. Muévete.",
    pt: "A janela fecha à meia-noite. Mexa-se.",
    fr: "La fenêtre se ferme à minuit. Bouge.",
    de: "Das Fenster schließt um Mitternacht. Beweg dich.",
    ja: "ウィンドウは深夜に閉じます。動いてください。",
    ko: "창은 자정에 닫힙니다. 움직이세요.",
    zh: "窗口在午夜关闭。行动起来。",
    hi: "खिड़की आधी रात को बंद हो जाती है। चलो।",
  },
  "questBriefing.header": {
    es: "[ Información de Misión ]",
    pt: "[ Informações da Missão ]",
    fr: "[ Détails de la Mission ]",
    de: "[ Missionsinfo ]",
    ja: "[ ミッション情報 ]",
    ko: "[ 미션 정보 ]",
    zh: "[ 任务简报 ]",
    hi: "[ मिशन जानकारी ]",
  },
  "questBriefing.objectiveLabel": {
    es: "Objetivo",
    pt: "Objetivo",
    fr: "Objectif",
    de: "Ziel",
    ja: "目的",
    ko: "목표",
    zh: "目标",
    hi: "उद्देश्य",
  },
  "questBriefing.rulesLabel": {
    es: "Cadencia",
    pt: "Cadência",
    fr: "Cadence",
    de: "Rhythmus",
    ja: "ペース",
    ko: "리듬",
    zh: "节奏",
    hi: "लय",
  },
  "questBriefing.rewardsLabel": {
    es: "Recompensas",
    pt: "Recompensas",
    fr: "Récompenses",
    de: "Belohnungen",
    ja: "報酬",
    ko: "보상",
    zh: "奖励",
    hi: "पुरस्कार",
  },
  "questBriefing.rewardsDescription": {
    es: "XP por completar · bonos de racha · trofeos en hitos",
    pt: "XP por conclusão · bônus de sequência · troféus em marcos",
    fr: "XP par complétion · bonus de série · trophées aux jalons",
    de: "XP pro Abschluss · Streak-Boni · Trophäen bei Meilensteinen",
    ja: "達成ごとのXP・連続ボーナス・節目のトロフィー",
    ko: "완료당 XP · 연속 보너스 · 마일스톤 트로피",
    zh: "每次完成获得XP · 连击奖励 · 里程碑奖杯",
    hi: "हर पूर्णता पर XP · स्ट्रीक बोनस · मील के पत्थर पर ट्रॉफियाँ",
  },
  "questBriefing.warningLabel": {
    es: "Aviso del Sistema",
    pt: "Aviso do Sistema",
    fr: "Avis du Système",
    de: "Systemhinweis",
    ja: "システム通知",
    ko: "시스템 알림",
    zh: "系统提示",
    hi: "सिस्टम सूचना",
  },
  "questBriefing.warningBody": {
    es: "Entrar a este portal te une a su ritmo. Las recaídas se registran. Las completaciones acumulan XP. Elige con intención.",
    pt: "Entrar neste portal te conecta ao seu ritmo. Recaídas são registradas. Conclusões acumulam XP. Escolha com intenção.",
    fr: "Entrer dans ce portail te lie à son rythme. Les rechutes sont enregistrées. Les complétions accumulent du XP. Choisis avec intention.",
    de: "Dieses Portal zu betreten bindet dich an seinen Rhythmus. Rückfälle werden protokolliert. Abschlüsse sammeln XP. Wähle mit Bedacht.",
    ja: "このポータルに入ると、そのリズムに縛られます。再発は記録されます。達成はXPを蓄えます。意志を持って選びましょう。",
    ko: "이 포털에 들어가면 그 리듬에 묶입니다. 재발은 기록됩니다. 완료는 XP를 쌓습니다. 의지를 가지고 선택하세요.",
    zh: "进入此传送门即与其节奏绑定。复发会被记录。完成会累积XP。慎重选择。",
    hi: "इस पोर्टल में प्रवेश आपको इसकी लय से बाँधता है। पुनरावृत्ति दर्ज होती है। पूर्णता XP जमा करती है। इरादे से चुनें।",
  },
  "questBriefing.cancel": {
    es: "Retirarse",
    pt: "Recuar",
    fr: "Reculer",
    de: "Zurücktreten",
    ja: "退く",
    ko: "물러나기",
    zh: "撤退",
    hi: "पीछे हटें",
  },
  "questBriefing.confirm": {
    es: "Entrar a la Mazmorra",
    pt: "Entrar na Masmorra",
    fr: "Entrer dans le Donjon",
    de: "Dungeon betreten",
    ja: "ダンジョンに入る",
    ko: "던전 진입",
    zh: "进入副本",
    hi: "डंजन में प्रवेश",
  },
};

function setDeep(obj, dotPath, value) {
  const parts = dotPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

const locales = ["hi", "zh", "ko", "ja", "de", "fr", "pt", "es"];
const root = path.join(process.cwd(), "src", "messages");

for (const locale of locales) {
  const file = path.join(root, `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  let added = 0;
  for (const [key, perLocale] of Object.entries(TRANSLATIONS)) {
    const value = perLocale[locale];
    if (typeof value !== "string") {
      console.warn(`Missing ${locale} for ${key}`);
      continue;
    }
    setDeep(json, key, value);
    added++;
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`${locale}: +${added} keys`);
}

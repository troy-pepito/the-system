#!/usr/bin/env node
// Phase 3 i18n catchup: landing marketing copy.
// 6 keys × 8 locales = 48 translations.

import fs from "node:fs";
import path from "node:path";

const TRANSLATIONS = {
  "landing.communityHeader": {
    es: "No estás solo en esto",
    pt: "Você não está sozinho nisso",
    fr: "Tu n'es pas seul dans ça",
    de: "Du bist damit nicht allein",
    ja: "あなたは一人じゃない",
    ko: "당신은 혼자가 아닙니다",
    zh: "你并不孤单",
    hi: "आप इसमें अकेले नहीं हैं",
  },
  "landing.communityIntro": {
    es: "Los cazadores que van solos se rompen. Los cazadores que entrenan juntos suben de nivel. El Sistema te da ambos: tus propias mazmorras, y un círculo para recorrerlas contigo.",
    pt: "Caçadores que vão sozinhos quebram. Caçadores que treinam juntos sobem de nível. O Sistema te dá ambos: suas próprias masmorras, e um círculo para percorrê-las com você.",
    fr: "Les chasseurs qui vont seuls cassent. Les chasseurs qui s'entraînent ensemble montent en niveau. Le Système te donne les deux : tes propres donjons, plus un cercle pour les parcourir avec toi.",
    de: "Jäger, die allein gehen, brechen. Jäger, die zusammen trainieren, steigen auf. Das System gibt dir beides: deine eigenen Dungeons und einen Kreis, mit dem du sie durchschreitest.",
    ja: "一人で進むハンターは折れる。共に鍛えるハンターはレベルを上げる。システムはその両方を与える: 自分のダンジョン、そしてそれを共に歩む仲間の輪を。",
    ko: "혼자 가는 헌터는 꺾인다. 함께 단련하는 헌터는 레벨업한다. 시스템은 둘 다 준다: 너만의 던전, 그리고 함께 걸을 동료의 원.",
    zh: "独行的猎人会崩溃。同行的猎人会升级。系统给你两者：你自己的副本，加上一同前行的伙伴圈。",
    hi: "अकेले चलने वाले हंटर टूटते हैं। साथ अभ्यास करने वाले हंटर ऊँचाई पर पहुँचते हैं। सिस्टम आपको दोनों देता है: आपकी अपनी डंजन, और साथ चलने वालों का घेरा।",
  },
  "landing.communityGuildsTitle": {
    es: "Gremios",
    pt: "Guildas",
    fr: "Guildes",
    de: "Gilden",
    ja: "ギルド",
    ko: "길드",
    zh: "公会",
    hi: "गिल्ड्स",
  },
  "landing.communityGuildsBody": {
    es: "Forma una banda de hasta 10 cazadores. Las reflexiones públicas de los miembros llegan al feed de tu gremio, bandas pequeñas, no transmisión anónima. El dueño aprueba a quién se une.",
    pt: "Forme um bando de até 10 caçadores. As reflexões públicas dos membros vão para o feed da sua guilda, bandos pequenos, não transmissão anônima. O dono aprova quem entra.",
    fr: "Forme une bande jusqu'à 10 chasseurs. Les réflexions publiques des membres arrivent dans le fil de ta guilde, petites bandes, pas de diffusion anonyme. Le propriétaire approuve qui rejoint.",
    de: "Stelle eine Bande von bis zu 10 Jägern zusammen. Die öffentlichen Reflexionen der Mitglieder landen im Feed deiner Gilde, kleine Banden, keine anonyme Übertragung. Der Besitzer genehmigt, wer beitritt.",
    ja: "最大10人のハンターのバンドを結成。メンバーの公開リフレクションはあなたのギルドフィードに流れます。匿名配信ではなく、小さな結束。オーナーが参加を承認します。",
    ko: "최대 10명의 헌터로 구성된 밴드를 만드세요. 멤버들의 공개 회고가 길드 피드에 올라옵니다, 익명 방송이 아닌 작은 결속. 가입은 오너가 승인합니다.",
    zh: "组建最多10名猎人的小队。成员的公开反思会出现在你的公会动态中，是小队而非匿名广播。加入需公会主批准。",
    hi: "10 हंटर तक का बैंड बनाएँ। सदस्यों के सार्वजनिक चिंतन आपकी गिल्ड फ़ीड में आते हैं, छोटे बैंड, बेनाम प्रसारण नहीं। कौन शामिल हो, यह मालिक तय करता है।",
  },
  "landing.communityBoardTitle": {
    es: "Tabla Semanal",
    pt: "Ranking Semanal",
    fr: "Classement Hebdomadaire",
    de: "Wöchentliche Rangliste",
    ja: "週間ランキング",
    ko: "주간 리더보드",
    zh: "周排行榜",
    hi: "साप्ताहिक लीडरबोर्ड",
  },
  "landing.communityBoardBody": {
    es: "Cada acción que registras esta semana gana puntos de actividad. Compite globalmente, con amigos, dentro de tu gremio o gremio contra gremio. Se reinicia cada 7 días, siempre es una nueva lucha.",
    pt: "Cada ação que você registra esta semana ganha pontos de atividade. Compita globalmente, com amigos, dentro da sua guilda ou guilda contra guilda. Reinicia a cada 7 dias, sempre uma nova luta.",
    fr: "Chaque action que tu enregistres cette semaine gagne des points d'activité. Compete mondialement, avec des amis, dans ta guilde ou guilde contre guilde. Réinitialise tous les 7 jours, c'est toujours un nouveau combat.",
    de: "Jede Aktion, die du diese Woche protokollierst, verdient Aktivitätspunkte. Konkurriere weltweit, mit Freunden, in deiner Gilde oder Gilde gegen Gilde. Setzt alle 7 Tage zurück, es ist immer ein neuer Kampf.",
    ja: "今週ログしたすべての行動がアクティビティポイントを生みます。グローバル、フレンド、ギルド内、またはギルド対戦で競争。7日ごとにリセット、常に新たな戦い。",
    ko: "이번 주에 기록한 모든 행동이 활동 포인트를 얻습니다. 전 세계, 친구, 길드 내, 또는 길드 vs 길드로 경쟁하세요. 7일마다 초기화, 언제나 새로운 싸움.",
    zh: "本周记录的每一个行动都获得活动点数。全球、好友、公会内或公会对公会竞争。每7天重置，永远是新的战斗。",
    hi: "इस सप्ताह आप जो भी क्रिया लॉग करते हैं, उसे गतिविधि अंक मिलते हैं। वैश्विक, मित्रों, अपनी गिल्ड में, या गिल्ड बनाम गिल्ड प्रतिस्पर्धा करें। हर 7 दिन में रीसेट, हमेशा एक नई लड़ाई।",
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

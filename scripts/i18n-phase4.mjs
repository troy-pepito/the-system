#!/usr/bin/env node
// Phase 4 i18n catchup: achievements.static (trophy names + descriptions).
// 38 keys × 8 locales = 304 translations.
//
// Policy: trophy NAMES stay in English across locales (proper-noun brand
// consistency, same pattern Solo Leveling itself uses for terms like
// "Shadow Monarch" in translated releases). DESCRIPTIONS get translated.

import fs from "node:fs";
import path from "node:path";

const locales = ["hi", "zh", "ko", "ja", "de", "fr", "pt", "es"];

// Helper: every name is keep-as-English across all 8 locales.
const ENGLISH_NAME = (en) =>
  Object.fromEntries(locales.map((l) => [l, en]));

const TRANSLATIONS = {
  "achievements.static.hunters-voice.name": ENGLISH_NAME("Hunter's Voice"),
  "achievements.static.hunters-voice.description": {
    es: "Publica tu primera reflexión pública. Sal del silencio.",
    pt: "Publique sua primeira reflexão pública. Saia do silêncio.",
    fr: "Publie ta première réflexion publique. Sors du silence.",
    de: "Veröffentliche deine erste öffentliche Reflexion. Tritt aus dem Schweigen.",
    ja: "最初の公開リフレクションを投稿しよう。沈黙から踏み出せ。",
    ko: "첫 공개 회고를 게시하세요. 침묵에서 나오세요.",
    zh: "发布你的第一篇公开反思。走出沉默。",
    hi: "अपना पहला सार्वजनिक चिंतन पोस्ट करें। मौन से बाहर निकलें।",
  },
  "achievements.static.first-friend.name": ENGLISH_NAME("First Bond"),
  "achievements.static.first-friend.description": {
    es: "Agrega a tu primer cazador como amigo. La manada se aprieta.",
    pt: "Adicione seu primeiro caçador como amigo. A matilha se aperta.",
    fr: "Ajoute ton premier chasseur en ami. La meute se resserre.",
    de: "Füge deinen ersten Jäger als Freund hinzu. Das Rudel zieht sich zusammen.",
    ja: "最初のハンターをフレンドに追加。群れが締まる。",
    ko: "첫 번째 헌터를 친구로 추가하세요. 무리가 단단해집니다.",
    zh: "添加你的第一位猎人为好友。猎群更紧密。",
    hi: "अपने पहले हंटर को मित्र के रूप में जोड़ें। टोली कसती है।",
  },
  "achievements.static.bond-found.name": ENGLISH_NAME("Bond Found"),
  "achievements.static.bond-found.description": {
    es: "Únete a tu primer gremio. Encuentra la banda.",
    pt: "Junte-se à sua primeira guilda. Encontre o bando.",
    fr: "Rejoins ta première guilde. Trouve la bande.",
    de: "Tritt deiner ersten Gilde bei. Finde die Bande.",
    ja: "最初のギルドに参加。バンドを見つけよう。",
    ko: "첫 길드에 가입하세요. 동료를 찾으세요.",
    zh: "加入你的第一个公会。找到你的小队。",
    hi: "अपनी पहली गिल्ड में शामिल हों। बैंड को खोजें।",
  },
  "achievements.static.daily-witness.name": ENGLISH_NAME("Daily Witness"),
  "achievements.static.daily-witness.description": {
    es: "Preséntate 14 días distintos. El Sistema reconoce tu rostro.",
    pt: "Apareça em 14 dias distintos. O Sistema reconhece seu rosto.",
    fr: "Sois présent 14 jours distincts. Le Système connaît ton visage.",
    de: "Sei an 14 verschiedenen Tagen da. Das System kennt dein Gesicht.",
    ja: "14日間活動を記録。システムは君の顔を覚える。",
    ko: "14일 동안 활동을 기록하세요. 시스템이 당신의 얼굴을 기억합니다.",
    zh: "在14个不同的日子出现。系统认识你的脸。",
    hi: "14 अलग दिनों पर हाज़िर हों। सिस्टम आपका चेहरा पहचानता है।",
  },
  "achievements.static.open-hand.name": ENGLISH_NAME("Open Hand"),
  "achievements.static.open-hand.description": {
    es: "Publica 10 reflexiones públicas. La valentía es un hábito.",
    pt: "Publique 10 reflexões públicas. A coragem é um hábito.",
    fr: "Publie 10 réflexions publiques. Le courage est une habitude.",
    de: "Veröffentliche 10 öffentliche Reflexionen. Mut ist eine Gewohnheit.",
    ja: "公開リフレクションを10回投稿。勇気は習慣だ。",
    ko: "공개 회고를 10번 게시하세요. 용기는 습관입니다.",
    zh: "发布10篇公开反思。勇气是一种习惯。",
    hi: "10 सार्वजनिक चिंतन पोस्ट करें। साहस एक आदत है।",
  },
  "achievements.static.five-bonds.name": ENGLISH_NAME("Five Bonds"),
  "achievements.static.five-bonds.description": {
    es: "Alcanza 5 amigos. Una banda real, no una lista.",
    pt: "Alcance 5 amigos. Um bando real, não uma lista.",
    fr: "Atteins 5 amis. Une vraie bande, pas une liste.",
    de: "Erreiche 5 Freunde. Eine echte Bande, keine Liste.",
    ja: "5人のフレンドに到達。本物のバンド、リストではない。",
    ko: "친구 5명에 도달하세요. 진짜 동료, 명단이 아닌.",
    zh: "达到5位好友。真正的小队，不是名单。",
    hi: "5 मित्रों तक पहुँचें। एक असली बैंड, सूची नहीं।",
  },
  "achievements.static.surge.name": ENGLISH_NAME("Surge"),
  "achievements.static.surge.description": {
    es: "Anota 50 puntos de actividad en una semana. Una semana de oleada, apilada de misiones, entrenamientos y exposiciones.",
    pt: "Marque 50 pontos de atividade em uma semana. Uma semana de onda, acumulada de missões, treinos e exposições.",
    fr: "Marque 50 points d'activité en une semaine. Une semaine de poussée, accumulée de quêtes, entraînements et expositions.",
    de: "Erziele 50 Aktivitätspunkte in einer Woche. Eine Schub-Woche, aufgebaut aus Quests, Trainings und Expositionen.",
    ja: "1週間で50アクティビティポイント獲得。クエスト、ワークアウト、エクスポージャーで積み上げた高潮の週。",
    ko: "한 주에 활동 포인트 50을 획득하세요. 퀘스트, 운동, 노출로 쌓아 올린 급상승의 주.",
    zh: "在一周内获得50点活动点数。任务、训练、暴露累积的爆发周。",
    hi: "एक सप्ताह में 50 गतिविधि अंक स्कोर करें। क्वेस्ट, वर्कआउट और एक्सपोज़र से बना उछाल वाला सप्ताह।",
  },
  "achievements.static.tempest.name": ENGLISH_NAME("Tempest"),
  "achievements.static.tempest.description": {
    es: "Anota 100 puntos de actividad en una semana. Producción fuera de la curva.",
    pt: "Marque 100 pontos de atividade em uma semana. Produção fora da curva.",
    fr: "Marque 100 points d'activité en une semaine. Production hors normes.",
    de: "Erziele 100 Aktivitätspunkte in einer Woche. Außergewöhnliche Leistung.",
    ja: "1週間で100アクティビティポイント獲得。並外れた出力。",
    ko: "한 주에 활동 포인트 100을 획득하세요. 평범을 벗어난 출력.",
    zh: "在一周内获得100点活动点数。超出常规的输出。",
    hi: "एक सप्ताह में 100 गतिविधि अंक स्कोर करें। असाधारण उत्पादन।",
  },
  "achievements.static.first-week.name": ENGLISH_NAME("Threshold"),
  "achievements.static.first-week.description": {
    es: "Preséntate 7 días distintos. Cruzaste el precipicio.",
    pt: "Apareça em 7 dias distintos. Você cruzou o precipício.",
    fr: "Sois présent 7 jours distincts. Tu as franchi le précipice.",
    de: "Sei an 7 verschiedenen Tagen da. Du hast die Klippe überschritten.",
    ja: "7日間活動を記録。崖を越えた。",
    ko: "7일 동안 활동을 기록하세요. 절벽을 건넜습니다.",
    zh: "在7个不同的日子出现。你跨过了悬崖。",
    hi: "7 अलग दिनों पर हाज़िर हों। आपने चट्टान पार कर ली।",
  },
  "achievements.static.steadfast.name": ENGLISH_NAME("Steadfast"),
  "achievements.static.steadfast.description": {
    es: "Registra actividad en 30 días distintos. Consistencia sobre heroísmo.",
    pt: "Registre atividade em 30 dias distintos. Consistência acima do heroísmo.",
    fr: "Enregistre une activité sur 30 jours distincts. La constance avant l'héroïsme.",
    de: "Aktivität an 30 verschiedenen Tagen protokollieren. Beständigkeit vor Heldentaten.",
    ja: "30日間活動を記録。英雄譚より一貫性。",
    ko: "30일 동안 활동을 기록하세요. 영웅담보다 꾸준함.",
    zh: "在30个不同的日子记录活动。坚持胜过英勇。",
    hi: "30 अलग दिनों पर गतिविधि दर्ज करें। वीरता से ज़्यादा निरंतरता।",
  },
  "achievements.static.veteran.name": ENGLISH_NAME("Veteran of the System"),
  "achievements.static.veteran.description": {
    es: "90 días distintos de actividad. El Sistema reconoce al paciente.",
    pt: "90 dias distintos de atividade. O Sistema reconhece o paciente.",
    fr: "90 jours distincts d'activité. Le Système reconnaît le patient.",
    de: "90 verschiedene Aktivitätstage. Das System erkennt den Geduldigen.",
    ja: "活動90日。システムは忍耐する者を認める。",
    ko: "활동 90일. 시스템은 인내하는 자를 알아봅니다.",
    zh: "90个不同的活动日。系统识得有耐心者。",
    hi: "90 अलग सक्रिय दिन। सिस्टम धैर्यवान को पहचानता है।",
  },
  "achievements.static.year-one.name": ENGLISH_NAME("Year One"),
  "achievements.static.year-one.description": {
    es: "365 días distintos de actividad. Un año completo de presentarte.",
    pt: "365 dias distintos de atividade. Um ano inteiro de aparecer.",
    fr: "365 jours distincts d'activité. Une année entière de présence.",
    de: "365 verschiedene Aktivitätstage. Ein ganzes Jahr des Auftauchens.",
    ja: "活動365日。一年間、現れ続けた証。",
    ko: "활동 365일. 일 년 내내 나타난 증거.",
    zh: "365个不同的活动日。整整一年的出现。",
    hi: "365 अलग सक्रिय दिन। पूरा एक साल मौजूद रहने का।",
  },
  "achievements.static.bedrock.name": ENGLISH_NAME("Bedrock"),
  "achievements.static.bedrock.description": {
    es: "Alcanza 50 de XP de Tierra. El vaso se está forjando.",
    pt: "Alcance 50 de XP de Terra. O vaso está sendo forjado.",
    fr: "Atteins 50 XP de Terre. Le vaisseau se forge.",
    de: "Erreiche 50 Erd-XP. Das Gefäß wird geschmiedet.",
    ja: "地のXP 50に到達。器が鍛えられていく。",
    ko: "땅의 XP 50에 도달하세요. 그릇이 단련되고 있습니다.",
    zh: "达到50点土系XP。容器正在锻造。",
    hi: "50 पृथ्वी XP तक पहुँचें। पात्र गढ़ा जा रहा है।",
  },
  "achievements.static.current.name": ENGLISH_NAME("Current"),
  "achievements.static.current.description": {
    es: "Alcanza 50 de XP de Agua. El flujo del corazón aprende su forma.",
    pt: "Alcance 50 de XP de Água. O fluxo do coração aprende sua forma.",
    fr: "Atteins 50 XP d'Eau. Le flux du cœur apprend sa forme.",
    de: "Erreiche 50 Wasser-XP. Der Fluss des Herzens lernt seine Form.",
    ja: "水のXP 50に到達。心の流れがその形を学ぶ。",
    ko: "물의 XP 50에 도달하세요. 마음의 흐름이 형태를 익힙니다.",
    zh: "达到50点水系XP。心之流学到了它的形。",
    hi: "50 जल XP तक पहुँचें। हृदय की धारा अपना आकार सीखती है।",
  },
  "achievements.static.furnace.name": ENGLISH_NAME("Furnace"),
  "achievements.static.furnace.description": {
    es: "Alcanza 50 de XP de Fuego. Prana encendido, sistema nervioso despierto.",
    pt: "Alcance 50 de XP de Fogo. Prana aceso, sistema nervoso desperto.",
    fr: "Atteins 50 XP de Feu. Prana allumé, système nerveux éveillé.",
    de: "Erreiche 50 Feuer-XP. Prana entzündet, Nervensystem erwacht.",
    ja: "火のXP 50に到達。プラーナが灯り、神経系が目覚める。",
    ko: "불의 XP 50에 도달하세요. 프라나가 점화되고 신경계가 깨어납니다.",
    zh: "达到50点火系XP。普拉那点燃，神经系统觉醒。",
    hi: "50 अग्नि XP तक पहुँचें। प्राण जलते हैं, तंत्रिका तंत्र जागृत।",
  },
  "achievements.static.open-sky.name": ENGLISH_NAME("Open Sky"),
  "achievements.static.open-sky.description": {
    es: "Alcanza 50 de XP de Aire. Atención recuperada, pensamiento aclarado.",
    pt: "Alcance 50 de XP de Ar. Atenção recuperada, pensamento clarificado.",
    fr: "Atteins 50 XP d'Air. Attention reconquise, pensée clarifiée.",
    de: "Erreiche 50 Luft-XP. Aufmerksamkeit zurückerobert, Gedanken geklärt.",
    ja: "風のXP 50に到達。注意を取り戻し、思考が澄む。",
    ko: "바람의 XP 50에 도달하세요. 주의를 되찾고, 사고가 맑아집니다.",
    zh: "达到50点风系XP。注意力收回，思维澄澈。",
    hi: "50 वायु XP तक पहुँचें। ध्यान वापस, विचार स्पष्ट।",
  },
  "achievements.static.inner-void.name": ENGLISH_NAME("Inner Void"),
  "achievements.static.inner-void.description": {
    es: "Alcanza 50 de XP de Éter. La habitación silenciosa detrás del ruido.",
    pt: "Alcance 50 de XP de Éter. A sala silenciosa atrás do ruído.",
    fr: "Atteins 50 XP d'Éther. La pièce silencieuse derrière le bruit.",
    de: "Erreiche 50 Äther-XP. Der stille Raum hinter dem Lärm.",
    ja: "空のXP 50に到達。喧騒の奥にある静寂の部屋。",
    ko: "에테르의 XP 50에 도달하세요. 소음 뒤의 고요한 방.",
    zh: "达到50点以太XP。喧嚣背后那间静室。",
    hi: "50 आकाश XP तक पहुँचें। शोर के पीछे का मौन कमरा।",
  },
  "achievements.static.phoenix.name": ENGLISH_NAME("Phoenix"),
  "achievements.static.phoenix.description": {
    es: "Vuelve a entrar a una mazmorra en la que recaíste. La caída no es el final.",
    pt: "Entre novamente em uma masmorra na qual você recaiu. A queda não é o fim.",
    fr: "Rentre dans un donjon où tu as rechuté. La chute n'est pas la fin.",
    de: "Betritt einen Dungeon erneut, in dem du zurückgefallen bist. Der Fall ist nicht das Ende.",
    ja: "再発したダンジョンに再び挑む。転倒は終わりじゃない。",
    ko: "재발했던 던전에 다시 들어가세요. 추락은 끝이 아닙니다.",
    zh: "重新进入你曾复发的副本。跌倒不是终点。",
    hi: "उस डंजन में फिर से प्रवेश करें जिसमें आप गिरे थे। गिरना अंत नहीं है।",
  },
  "achievements.static.comeback.name": ENGLISH_NAME("Comeback"),
  "achievements.static.comeback.description": {
    es: "Anota un día perfecto la mañana siguiente a un día disperso. El Sistema no olvida, pero tú tampoco.",
    pt: "Marque um dia perfeito na manhã seguinte a um dia disperso. O Sistema não esquece, mas você também não.",
    fr: "Marque un jour parfait le lendemain matin d'un jour dispersé. Le Système n'oublie rien, mais toi non plus.",
    de: "Erziele einen perfekten Tag am Morgen nach einem zerstreuten Tag. Das System vergisst nichts, aber du auch nicht.",
    ja: "散漫な日の翌朝にパーフェクトデイを達成。システムは忘れない、君もまた。",
    ko: "흩어진 다음 날 아침에 퍼펙트 데이를 달성하세요. 시스템은 잊지 않습니다, 당신도 마찬가지.",
    zh: "在散乱日的次日早晨打出完美日。系统不会忘记，你也一样。",
    hi: "बिखरे हुए दिन की अगली सुबह एक परफेक्ट डे स्कोर करें। सिस्टम भूलता नहीं, और न ही आप।",
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

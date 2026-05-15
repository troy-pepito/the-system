#!/usr/bin/env node
// One-shot Phase 1 i18n catchup: settings + friends + publicProfile.categories
// + guildPanel namespaces. 22 keys × 8 locales = 176 translations.
//
// LLM-translated; quality is decent but not native. Brand voice strings are
// translated literally where it works, kept stylistic where it doesn't.

import fs from "node:fs";
import path from "node:path";

const TRANSLATIONS = {
  "settings.dangerZone": {
    es: "Zona de Peligro",
    pt: "Zona de Perigo",
    fr: "Zone Dangereuse",
    de: "Gefahrenzone",
    ja: "危険ゾーン",
    ko: "위험 구역",
    zh: "危险区域",
    hi: "खतरनाक क्षेत्र",
  },
  "settings.deleteAccount": {
    es: "Eliminar Cuenta",
    pt: "Excluir Conta",
    fr: "Supprimer le Compte",
    de: "Konto löschen",
    ja: "アカウントを削除",
    ko: "계정 삭제",
    zh: "删除账户",
    hi: "खाता हटाएँ",
  },
  "settings.deleteAccountIntro": {
    es: "Elimina tu cuenta permanentemente. Cada incursión de mazmorra, entrada de diario, amistad, membresía de gremio y trofeo será borrado. Si eres dueño de un gremio, será disuelto y todos los miembros expulsados. Esto no se puede deshacer.",
    pt: "Exclui sua conta permanentemente. Cada incursão de masmorra, entrada de diário, amizade, associação de guilda e troféu será apagado. Se você possui uma guilda, ela será desfeita e todos os membros expulsos. Isto não pode ser desfeito.",
    fr: "Supprime ton compte de manière permanente. Chaque exploration de donjon, entrée de journal, amitié, adhésion à une guilde et trophée sera effacé. Si tu possèdes une guilde, elle sera dissoute et tous les membres éjectés. Ceci ne peut pas être annulé.",
    de: "Lösche dein Konto dauerhaft. Jeder Dungeon-Lauf, jeder Tagebucheintrag, jede Freundschaft, jede Gildenmitgliedschaft und jede Trophäe wird gelöscht. Wenn du eine Gilde besitzt, wird sie aufgelöst und alle Mitglieder werden entfernt. Dies kann nicht rückgängig gemacht werden.",
    ja: "アカウントを永久に削除します。すべてのダンジョン挑戦、ジャーナル記録、フレンド関係、ギルド所属、トロフィーが消去されます。ギルドを所有している場合、解散され、すべてのメンバーが排出されます。この操作は取り消せません。",
    ko: "계정을 영구적으로 삭제합니다. 모든 던전 진행, 일지 기록, 친구 관계, 길드 소속, 트로피가 지워집니다. 길드를 소유하고 있다면 해체되고 모든 멤버가 추방됩니다. 이 작업은 되돌릴 수 없습니다.",
    zh: "永久删除你的账户。所有副本进度、日志记录、好友关系、公会成员资格和奖杯都将被清除。如果你拥有公会，它将被解散，所有成员被驱逐。此操作无法撤销。",
    hi: "अपना खाता स्थायी रूप से हटाएँ। हर डंजन रन, जर्नल एंट्री, मित्रता, गिल्ड सदस्यता और ट्रॉफी मिटा दी जाएगी। यदि आप किसी गिल्ड के मालिक हैं, तो वह भंग कर दिया जाएगा और सभी सदस्य निकाल दिए जाएँगे। इसे पूर्ववत नहीं किया जा सकता।",
  },
  "settings.deleteAccountButton": {
    es: "Eliminar Mi Cuenta",
    pt: "Excluir Minha Conta",
    fr: "Supprimer Mon Compte",
    de: "Mein Konto löschen",
    ja: "アカウントを削除する",
    ko: "내 계정 삭제",
    zh: "删除我的账户",
    hi: "मेरा खाता हटाएँ",
  },
  "settings.deleteAccountConfirmHeader": {
    es: "¿Estás absolutamente seguro?",
    pt: "Tem certeza absoluta?",
    fr: "Es-tu absolument sûr ?",
    de: "Bist du absolut sicher?",
    ja: "本当によろしいですか？",
    ko: "정말 확실합니까?",
    zh: "你确定吗？",
    hi: "क्या आप पूरी तरह से सुनिश्चित हैं?",
  },
  "settings.deleteAccountConfirmBody": {
    es: "Escribe tu nombre de cazador abajo para confirmar. Esta acción es permanente.",
    pt: "Digite seu nome de caçador abaixo para confirmar. Esta ação é permanente.",
    fr: "Tape ton nom de chasseur ci-dessous pour confirmer. Cette action est permanente.",
    de: "Gib unten deinen Jäger-Namen ein, um zu bestätigen. Diese Aktion ist endgültig.",
    ja: "確認のため、下にハンター名を入力してください。この操作は取り消せません。",
    ko: "확인을 위해 아래에 헌터 이름을 입력하세요. 이 작업은 영구적입니다.",
    zh: "在下方输入你的猎人名字以确认。此操作是永久的。",
    hi: "पुष्टि के लिए नीचे अपना हंटर नाम लिखें। यह क्रिया स्थायी है।",
  },
  "settings.deleteAccountTypePlaceholder": {
    es: "Escribe tu nombre de cazador",
    pt: "Digite seu nome de caçador",
    fr: "Tape ton nom de chasseur",
    de: "Gib deinen Jäger-Namen ein",
    ja: "ハンター名を入力",
    ko: "헌터 이름 입력",
    zh: "输入你的猎人名字",
    hi: "अपना हंटर नाम लिखें",
  },
  "settings.deleteAccountConfirmButton": {
    es: "Eliminar para Siempre",
    pt: "Excluir para Sempre",
    fr: "Supprimer pour Toujours",
    de: "Für immer löschen",
    ja: "永久に削除",
    ko: "영원히 삭제",
    zh: "永久删除",
    hi: "हमेशा के लिए हटाएँ",
  },
  "settings.deleteAccountCancel": {
    es: "Cancelar",
    pt: "Cancelar",
    fr: "Annuler",
    de: "Abbrechen",
    ja: "キャンセル",
    ko: "취소",
    zh: "取消",
    hi: "रद्द करें",
  },
  "settings.deleteAccountDeleting": {
    es: "Eliminando…",
    pt: "Excluindo…",
    fr: "Suppression…",
    de: "Lösche…",
    ja: "削除中…",
    ko: "삭제 중…",
    zh: "正在删除…",
    hi: "हटाया जा रहा है…",
  },
  "settings.deleteAccountError": {
    es: "No se pudo eliminar la cuenta. Intenta de nuevo o escribe a trojanato@gmail.com.",
    pt: "Não foi possível excluir a conta. Tente novamente ou envie um email para trojanato@gmail.com.",
    fr: "Impossible de supprimer le compte. Réessaie ou envoie un email à trojanato@gmail.com.",
    de: "Konto konnte nicht gelöscht werden. Versuche es erneut oder schreibe an trojanato@gmail.com.",
    ja: "アカウントを削除できませんでした。再試行するか、trojanato@gmail.com までご連絡ください。",
    ko: "계정을 삭제할 수 없습니다. 다시 시도하거나 trojanato@gmail.com 으로 이메일을 보내세요.",
    zh: "无法删除账户。请重试或发送邮件至 trojanato@gmail.com。",
    hi: "खाता हटाया नहीं जा सका। पुनः प्रयास करें या trojanato@gmail.com पर ईमेल करें।",
  },
  "friends.confirmAdd": {
    es: "¿Enviar Solicitud?",
    pt: "Enviar Pedido?",
    fr: "Envoyer la Demande ?",
    de: "Anfrage senden?",
    ja: "リクエストを送信？",
    ko: "요청 보내기?",
    zh: "发送请求？",
    hi: "अनुरोध भेजें?",
  },
  "friends.cancelRequest": {
    es: "Cancelar Solicitud",
    pt: "Cancelar Pedido",
    fr: "Annuler la Demande",
    de: "Anfrage abbrechen",
    ja: "リクエストをキャンセル",
    ko: "요청 취소",
    zh: "取消请求",
    hi: "अनुरोध रद्द करें",
  },
  "publicProfile.categories.community": {
    es: "Comunidad",
    pt: "Comunidade",
    fr: "Communauté",
    de: "Gemeinschaft",
    ja: "コミュニティ",
    ko: "커뮤니티",
    zh: "社区",
    hi: "समुदाय",
  },
  "publicProfile.categories.devotion": {
    es: "Devoción",
    pt: "Devoção",
    fr: "Dévotion",
    de: "Hingabe",
    ja: "献身",
    ko: "헌신",
    zh: "奉献",
    hi: "समर्पण",
  },
  "publicProfile.categories.elemental": {
    es: "Elemental",
    pt: "Elemental",
    fr: "Élémentaire",
    de: "Elementar",
    ja: "元素",
    ko: "원소",
    zh: "元素",
    hi: "तत्व",
  },
  "publicProfile.categories.shadow": {
    es: "Sombra",
    pt: "Sombra",
    fr: "Ombre",
    de: "Schatten",
    ja: "影",
    ko: "그림자",
    zh: "影",
    hi: "छाया",
  },
  "guildPanel.confirmJoin": {
    es: "¿Enviar Solicitud?",
    pt: "Enviar Pedido?",
    fr: "Envoyer la Demande ?",
    de: "Anfrage senden?",
    ja: "リクエストを送信？",
    ko: "요청 보내기?",
    zh: "发送请求？",
    hi: "अनुरोध भेजें?",
  },
  "guildPanel.cancel": {
    es: "Cancelar",
    pt: "Cancelar",
    fr: "Annuler",
    de: "Abbrechen",
    ja: "キャンセル",
    ko: "취소",
    zh: "取消",
    hi: "रद्द करें",
  },
  "guildPanel.cancelRequest": {
    es: "Cancelar Solicitud",
    pt: "Cancelar Pedido",
    fr: "Annuler la Demande",
    de: "Anfrage abbrechen",
    ja: "リクエストをキャンセル",
    ko: "요청 취소",
    zh: "取消请求",
    hi: "अनुरोध रद्द करें",
  },
  "guildPanel.confirmLeave": {
    es: "¿Salir de verdad?",
    pt: "Sair de verdade?",
    fr: "Vraiment quitter ?",
    de: "Wirklich verlassen?",
    ja: "本当に脱退しますか？",
    ko: "정말 탈퇴하시겠습니까?",
    zh: "真的要离开吗？",
    hi: "सच में छोड़ें?",
  },
  "guildPanel.memberMenuAria": {
    es: "Opciones de miembro",
    pt: "Opções de membro",
    fr: "Options du membre",
    de: "Mitgliedsoptionen",
    ja: "メンバーオプション",
    ko: "멤버 옵션",
    zh: "成员选项",
    hi: "सदस्य विकल्प",
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

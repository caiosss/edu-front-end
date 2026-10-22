// Service worker da versão web do EduCare (PWA na Tela de Início do iPhone).
//
// Recebe o Web Push que o notification-service cifra e envia ({titulo, corpo, dados}) e mostra a
// notificação. Todo push precisa virar notificação visível: o iOS cancela a inscrição de quem
// recebe push sem mostrar nada. No toque, foca o app aberto (avisando por mensagem) ou abre
// um novo com ?notificacao=<id>, para o app marcar como aberta.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener("push", (evento) => {
  let mensagem = {};
  try {
    mensagem = evento.data ? evento.data.json() : {};
  } catch {
    mensagem = { corpo: evento.data ? evento.data.text() : "" };
  }
  const dados = mensagem.dados || {};

  evento.waitUntil(
    self.registration.showNotification(mensagem.titulo || "EduCare", {
      body: mensagem.corpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      lang: "pt-BR",
      tag: dados.notificacaoId,
      data: dados,
    })
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const id = (evento.notification.data && evento.notification.data.notificacaoId) || null;

  evento.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const janela of janelas) {
        if ("focus" in janela) {
          janela.postMessage({ tipo: "notificacao-aberta", notificacaoId: id });
          return janela.focus();
        }
      }
      return self.clients.openWindow(id ? `/?notificacao=${encodeURIComponent(id)}` : "/");
    })()
  );
});

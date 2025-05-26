// service-worker.js

// Este Service Worker será responsável por exibir as notificações
// e gerenciar as ações dos botões.

// É executado em segundo plano pelo navegador.

self.addEventListener('install', (event) => {
    console.log('Service Worker [SW]: Instalação.');
    self.skipWaiting(); // Garante que o novo SW assuma o controle imediatamente
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker [SW]: Ativação.');
    event.waitUntil(clients.claim()); // Reivindica o controle de qualquer página aberta
});

// Ouve mensagens do seu aplicativo (lembrar_agua.html)
self.addEventListener('message', (event) => {
    console.log('Service Worker [SW]: Mensagem recebida do cliente:', event.data);
    if (event.data && event.data.action === 'showNotification') {
        const title = "Hora de Beber Água!";
        const options = {
            body: event.data.options.body,
            icon: event.data.options.icon,
            vibrate: event.data.options.vibrate,
            data: event.data.options.data, // Dados adicionais, como amountToAdd
            actions: event.data.options.actions // Os botões da notificação
        };

        event.waitUntil(self.registration.showNotification(title, options)
            .then(() => console.log('Service Worker [SW]: Notificação exibida com sucesso.'))
            .catch(error => console.error('Service Worker [SW]: Erro ao exibir notificação:', error))
        );
    } else if (event.data === 'SKIP_WAITING') { // Mensagem para pular o estado 'waiting'
        self.skipWaiting();
        console.log('Service Worker [SW]: skipWaiting() chamado.');
    }
});

// Ouve cliques nas notificações
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker [SW]: Notificação clicada! Ação:', event.action);

    const notification = event.notification;
    const action = event.action; // ID do botão clicado (e.g., 'drink_water', 'later')
    const amountToAdd = notification.data ? notification.data.amountToAdd : 200; // Pega o valor padrão ou do data

    notification.close(); // Fecha a notificação após o clique

    // Encontra todas as janelas do cliente (sua página HTML)
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes('lembrar_agua.html') && 'postMessage' in client) {
                    if (action === 'drink_water') {
                        console.log('Service Worker [SW]: Enviando "drinkWaterFromNotification" para o cliente.');
                        client.postMessage({
                            action: 'drinkWaterFromNotification',
                            amountToAdd: amountToAdd
                        });
                    } else if (action === 'later') {
                        console.log('Service Worker [SW]: Enviando "laterFromNotification" para o cliente.');
                        client.postMessage({
                            action: 'laterFromNotification'
                        });
                    } else {
                        // Se o usuário clicar no corpo da notificação (não em um botão)
                        console.log('Service Worker [SW]: Corpo da notificação clicado. Enviando "notificationInteracted"');
                        client.postMessage({
                            action: 'notificationInteracted'
                        });
                        // Tenta focar ou abrir a janela do app se não estiver aberta
                        if (client.visibilityState === 'hidden' || !client.focused) {
                            client.focus();
                        }
                    }
                    return; // Encontrou um cliente e enviou a mensagem, pode sair
                }
            }
            console.warn('Service Worker [SW]: Nenhum cliente adequado encontrado para enviar mensagem após clique na notificação.');
            // Fallback: Se não encontrou a página para se comunicar, ao menos tenta abrir uma
            if (action === 'drink_water' || action === 'later') {
                clients.openWindow('/lembrar_agua.html'); // Abre o app se não estiver aberto
            }
        })
    );
});
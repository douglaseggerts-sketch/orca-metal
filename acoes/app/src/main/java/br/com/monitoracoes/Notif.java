package br.com.monitoracoes;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

final class Notif {

    static final String CANAL = "alertas";

    private Notif() {
    }

    static void criarCanal(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) {
            return;
        }
        NotificationChannel ch = new NotificationChannel(CANAL, "Alertas de compra e venda",
                NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Avisos quando uma ação atinge o preço ou o cruzamento de médias definido");
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
    }

    static void mostrar(Context c, int id, String titulo, String texto) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) {
            return;
        }
        criarCanal(c);
        Intent abrir = new Intent(c, MainActivity.class);
        abrir.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 0, abrir,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(c, CANAL)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(titulo)
                .setContentText(texto)
                .setStyle(new Notification.BigTextStyle().bigText(texto))
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build();
        nm.notify(id, n);
    }
}

package br.com.monitoracoes;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;

/** Roda a cada ~15 minutos (mínimo do Android), mesmo com o app fechado e após reiniciar o celular. */
public class AlertJob extends JobService {

    private static final int ID = 4201;

    static void agendar(Context c) {
        JobScheduler js = c.getSystemService(JobScheduler.class);
        if (js == null || js.getPendingJob(ID) != null) {
            return;
        }
        JobInfo info = new JobInfo.Builder(ID, new ComponentName(c, AlertJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(true)
                .build();
        js.schedule(info);
    }

    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(() -> {
            try {
                // pega as alterações do outro aparelho, confere e devolve o resultado
                Sync.tentar(getApplicationContext());
                AlertEngine.verificar(getApplicationContext());
                Sync.tentar(getApplicationContext());
            } catch (Exception ignored) {
            }
            jobFinished(params, false);
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }
}

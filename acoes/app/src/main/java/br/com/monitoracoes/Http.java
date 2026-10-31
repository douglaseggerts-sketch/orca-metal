package br.com.monitoracoes;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

import org.json.JSONObject;

final class Http {

    private Http() {
    }

    static String get(String url) throws IOException {
        return get(url, null);
    }

    /** GET com cabeçalhos extras (ex.: X-API-Key) e texto decodificado pelo charset informado pelo site. */
    static String get(String url, JSONObject cabecalhos) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            c.setConnectTimeout(15000);
            c.setReadTimeout(20000);
            c.setRequestProperty("User-Agent",
                    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36");
            c.setRequestProperty("Accept", "application/json,text/html,text/plain,*/*");
            if (cabecalhos != null) {
                Iterator<String> it = cabecalhos.keys();
                while (it.hasNext()) {
                    String k = it.next();
                    c.setRequestProperty(k, cabecalhos.optString(k));
                }
            }
            int code = c.getResponseCode();
            InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
            String corpo = ler(in, charset(c.getContentType()));
            if (code >= 400) {
                throw new IOException("HTTP " + code + (corpo.isEmpty() ? "" : ": " + corpo));
            }
            return corpo;
        } finally {
            c.disconnect();
        }
    }

    /**
     * POST de texto JSON. O app da Web do Google responde com um redirecionamento (302)
     * para outro endereço, que precisa ser lido com GET.
     */
    static String post(String url, String corpo) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            c.setConnectTimeout(20000);
            c.setReadTimeout(40000);
            c.setInstanceFollowRedirects(false);
            c.setDoOutput(true);
            c.setRequestMethod("POST");
            c.setRequestProperty("Content-Type", "text/plain; charset=utf-8");
            byte[] b = corpo.getBytes(StandardCharsets.UTF_8);
            c.setFixedLengthStreamingMode(b.length);
            c.getOutputStream().write(b);
            int code = c.getResponseCode();
            if (code >= 300 && code < 400) {
                String destino = c.getHeaderField("Location");
                if (destino == null) {
                    throw new IOException("redirecionamento sem destino");
                }
                return get(destino);
            }
            InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
            String r = ler(in);
            if (code >= 400) {
                throw new IOException("HTTP " + code);
            }
            return r;
        } finally {
            c.disconnect();
        }
    }

    private static Charset charset(String tipo) {
        if (tipo != null) {
            for (String p : tipo.split(";")) {
                p = p.trim();
                if (p.toLowerCase().startsWith("charset=")) {
                    try {
                        return Charset.forName(p.substring(8).replace("\"", "").trim());
                    } catch (Exception ignored) {
                    }
                }
            }
        }
        return StandardCharsets.UTF_8;
    }

    private static String ler(InputStream in) throws IOException {
        return ler(in, StandardCharsets.UTF_8);
    }

    private static String ler(InputStream in, Charset cs) throws IOException {
        if (in == null) {
            return "";
        }
        try (InputStream is = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) != -1) {
                out.write(buf, 0, n);
            }
            return new String(out.toByteArray(), cs);
        }
    }
}

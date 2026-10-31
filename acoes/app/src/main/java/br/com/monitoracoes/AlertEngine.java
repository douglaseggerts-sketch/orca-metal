package br.com.monitoracoes;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URLEncoder;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Currency;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Confere os alertas ativos contra a cotação atual.
 * Tipos de alerta:
 *  abaixo      → COMPRA quando preço ≤ valor
 *  acima       → VENDA  quando preço ≥ valor
 *  cruza_cima  → COMPRA quando a média curta cruza para cima da longa (período 1 = o próprio preço)
 *  cruza_baixo → VENDA  quando a média curta cruza para baixo da longa
 */
final class AlertEngine {

    private AlertEngine() {
    }

    /** Dados de um ativo: preço atual, moeda e fechamentos diários (o último = preço atual). */
    static final class Serie {
        double preco;
        String moeda = "BRL";
        final List<Double> fech = new ArrayList<>();
    }

    static Serie baixar(String simbolo) throws Exception {
        String url = "https://query1.finance.yahoo.com/v8/finance/chart/"
                + URLEncoder.encode(simbolo, "UTF-8") + "?range=2y&interval=1d";
        JSONObject j = new JSONObject(Http.get(url));
        JSONObject chart = j.getJSONObject("chart");
        JSONArray res = chart.optJSONArray("result");
        if (res == null || res.length() == 0) {
            throw new Exception("sem dados para " + simbolo);
        }
        JSONObject r = res.getJSONObject(0);
        JSONObject meta = r.getJSONObject("meta");
        Serie s = new Serie();
        s.moeda = meta.optString("currency", "BRL");
        JSONArray close = r.getJSONObject("indicators").getJSONArray("quote")
                .getJSONObject(0).optJSONArray("close");
        if (close != null) {
            for (int i = 0; i < close.length(); i++) {
                if (!close.isNull(i)) {
                    s.fech.add(close.getDouble(i));
                }
            }
        }
        s.preco = meta.optDouble("regularMarketPrice", Double.NaN);
        if (Double.isNaN(s.preco)) {
            if (s.fech.isEmpty()) {
                throw new Exception("sem preço para " + simbolo);
            }
            s.preco = s.fech.get(s.fech.size() - 1);
        } else if (!s.fech.isEmpty()) {
            s.fech.set(s.fech.size() - 1, s.preco);
        } else {
            s.fech.add(s.preco);
        }
        return s;
    }

    /** Último valor da média móvel (SMA ou EMA). Período 1 devolve o próprio preço. */
    static double media(List<Double> v, int periodo, String tipo) {
        int n = v.size();
        if (periodo <= 1) {
            return n == 0 ? Double.NaN : v.get(n - 1);
        }
        if (n < periodo) {
            return Double.NaN;
        }
        if ("EMA".equalsIgnoreCase(tipo)) {
            double k = 2.0 / (periodo + 1);
            double e = 0;
            for (int i = 0; i < periodo; i++) {
                e += v.get(i);
            }
            e /= periodo;
            for (int i = periodo; i < n; i++) {
                e = v.get(i) * k + e * (1 - k);
            }
            return e;
        }
        double soma = 0;
        for (int i = n - periodo; i < n; i++) {
            soma += v.get(i);
        }
        return soma / periodo;
    }

    static String dinheiro(double v, String moeda) {
        NumberFormat f = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));
        try {
            f.setCurrency(Currency.getInstance(moeda));
        } catch (Exception ignored) {
        }
        return f.format(v);
    }

    static String rotulo(String simbolo) {
        return simbolo.endsWith(".SA") ? simbolo.substring(0, simbolo.length() - 3) : simbolo;
    }

    static String nomeMedia(int p, String tipo) {
        return p <= 1 ? "Preço" : (("EMA".equalsIgnoreCase(tipo) ? "MME" : "MM") + p);
    }

    /** Verifica todos os alertas ativos. Devolve um resumo em texto. */
    static String verificar(Context ctx) {
        JSONArray todos = Store.alertas(ctx);
        Map<String, List<JSONObject>> porAtivo = new HashMap<>();
        for (int i = 0; i < todos.length(); i++) {
            JSONObject a = todos.optJSONObject(i);
            if (a == null || !a.optBoolean("ativo", true) || a.has("disparadoEm")) {
                continue;
            }
            String sym = a.optString("sym");
            if (sym.isEmpty()) {
                continue;
            }
            List<JSONObject> l = porAtivo.get(sym);
            if (l == null) {
                l = new ArrayList<>();
                porAtivo.put(sym, l);
            }
            l.add(a);
        }
        if (porAtivo.isEmpty()) {
            return "Nenhum alerta ativo.";
        }

        // Alterações a gravar: id → campos novos
        Map<String, JSONObject> mudancas = new HashMap<>();
        int disparados = 0;
        List<String> erros = new ArrayList<>();

        for (Map.Entry<String, List<JSONObject>> e : porAtivo.entrySet()) {
            String sym = e.getKey();
            Serie s;
            try {
                s = baixar(sym);
            } catch (Exception ex) {
                erros.add(rotulo(sym));
                continue;
            }
            for (JSONObject a : e.getValue()) {
                try {
                    String id = a.optString("id");
                    String tipo = a.optString("tipo");
                    JSONObject m = new JSONObject();
                    String titulo = null;
                    String texto = null;

                    if ("abaixo".equals(tipo) || "acima".equals(tipo)) {
                        double valor = a.optDouble("valor", Double.NaN);
                        if (Double.isNaN(valor)) {
                            continue;
                        }
                        boolean bateu = "abaixo".equals(tipo) ? s.preco <= valor : s.preco >= valor;
                        if (bateu) {
                            boolean compra = "abaixo".equals(tipo);
                            titulo = (compra ? "🟢 COMPRA: " : "🔴 VENDA: ") + rotulo(sym) + " a " + dinheiro(s.preco, s.moeda);
                            texto = "Preço " + (compra ? "chegou a " : "atingiu ") + dinheiro(s.preco, s.moeda)
                                    + " (alvo " + (compra ? "≤ " : "≥ ") + dinheiro(valor, s.moeda) + ").";
                        }
                    } else if ("cruza_cima".equals(tipo) || "cruza_baixo".equals(tipo)) {
                        int pc = a.optInt("mmCurta", 9);
                        int pl = a.optInt("mmLonga", 21);
                        String tm = a.optString("tipoMM", "SMA");
                        double curta = media(s.fech, pc, tm);
                        double longa = media(s.fech, pl, tm);
                        if (Double.isNaN(curta) || Double.isNaN(longa)) {
                            continue;
                        }
                        String lado = curta > longa ? "acima" : "abaixo";
                        String antes = a.optString("ultimoLado", "");
                        m.put("ultimoLado", lado);
                        boolean cruzou = !antes.isEmpty() && !antes.equals(lado);
                        boolean querCima = "cruza_cima".equals(tipo);
                        if (cruzou && (querCima == "acima".equals(lado))) {
                            String nc = nomeMedia(pc, tm);
                            String nl = nomeMedia(pl, tm);
                            titulo = (querCima ? "🟢 COMPRA: " : "🔴 VENDA: ") + rotulo(sym) + " — " + nc
                                    + (querCima ? " cruzou para cima da " : " cruzou para baixo da ") + nl;
                            texto = "Preço " + dinheiro(s.preco, s.moeda) + ". " + nc + " = "
                                    + dinheiro(curta, s.moeda) + ", " + nl + " = " + dinheiro(longa, s.moeda) + ".";
                        }
                    } else {
                        continue;
                    }

                    if (titulo != null) {
                        String nota = a.optString("nota", "");
                        if (!nota.isEmpty()) {
                            texto = texto + "\n" + nota;
                        }
                        m.put("disparadoEm", System.currentTimeMillis());
                        m.put("precoDisparo", s.preco);
                        m.put("ativo", false);
                        Notif.mostrar(ctx, id.hashCode(), titulo, texto);
                        disparados++;
                    }
                    if (m.length() > 0) {
                        mudancas.put(id, m);
                    }
                } catch (Exception ignored) {
                }
            }
        }

        // Grava só os campos alterados, sobre a versão mais recente (o usuário pode ter mexido no meio-tempo)
        if (!mudancas.isEmpty()) {
            synchronized (Store.class) {
                JSONArray atual = Store.alertas(ctx);
                for (int i = 0; i < atual.length(); i++) {
                    JSONObject a = atual.optJSONObject(i);
                    if (a == null) {
                        continue;
                    }
                    JSONObject m = mudancas.get(a.optString("id"));
                    if (m == null || !a.optBoolean("ativo", true)) {
                        continue;
                    }
                    try {
                        JSONArray chaves = m.names();
                        for (int k = 0; chaves != null && k < chaves.length(); k++) {
                            String ch = chaves.getString(k);
                            a.put(ch, m.get(ch));
                        }
                    } catch (Exception ignored) {
                    }
                }
                Store.salvarAlertas(ctx, atual);
            }
        }
        Store.put(ctx, "ultimaVerificacao", String.valueOf(System.currentTimeMillis()));

        StringBuilder r = new StringBuilder();
        r.append(disparados == 0 ? "Nenhum alerta disparou." : disparados + " alerta(s) disparado(s).");
        if (!erros.isEmpty()) {
            r.append(" Sem cotação para: ").append(String.join(", ", erros)).append('.');
        }
        return r.toString();
    }
}

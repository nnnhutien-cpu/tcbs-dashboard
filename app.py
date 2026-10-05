import requests
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

st.set_page_config(page_title="Dashboard cổ phiếu", layout="wide")

PROXY = st.secrets.get("PROXY_URL", "https://tcbs-proxy.nn-nhutien.workers.dev")


@st.cache_data(ttl=60)
def load_price(ticker: str, days: int) -> pd.DataFrame:
    r = requests.get(f"{PROXY}/price", params={"ticker": ticker, "days": days}, timeout=20)
    r.raise_for_status()
    body = r.json()
    if "error" in body:
        raise RuntimeError(f"{body['error']} {body.get('detail') or ''}")
    df = pd.DataFrame(body["data"])
    if df.empty:
        return df
    df["time"] = pd.to_datetime(df["time"])
    return df.sort_values("time").reset_index(drop=True)


st.title("📈 Dashboard cổ phiếu")

with st.sidebar:
    tickers = st.text_input("Mã cổ phiếu (cách nhau bằng dấu phẩy)", "VNM, FPT, HPG")
    days = st.slider("Số ngày", 7, 365, 90)

symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
if not symbols:
    st.info("Nhập ít nhất một mã cổ phiếu.")
    st.stop()

tabs = st.tabs(symbols)
for tab, sym in zip(tabs, symbols):
    with tab:
        try:
            df = load_price(sym, days)
        except Exception as e:
            st.error(f"Không lấy được dữ liệu {sym}: {e}")
            continue
        if df.empty:
            st.warning(f"Không có dữ liệu cho {sym}")
            continue

        last, prev = df.iloc[-1], df.iloc[-2] if len(df) > 1 else df.iloc[-1]
        change = last["close"] - prev["close"]
        pct = change / prev["close"] * 100 if prev["close"] else 0

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Giá đóng cửa", f"{last['close']:,.2f}", f"{change:+,.2f} ({pct:+.2f}%)")
        c2.metric("Cao nhất kỳ", f"{df['high'].max():,.2f}")
        c3.metric("Thấp nhất kỳ", f"{df['low'].min():,.2f}")
        c4.metric("KL gần nhất", f"{int(last['volume']):,}")

        fig = go.Figure(go.Candlestick(
            x=df["time"], open=df["open"], high=df["high"], low=df["low"], close=df["close"]))
        fig.update_layout(height=450, xaxis_rangeslider_visible=False, margin=dict(t=20))
        st.plotly_chart(fig, use_container_width=True)

        st.bar_chart(df.set_index("time")["volume"], height=200)
        with st.expander("Xem bảng dữ liệu"):
            st.dataframe(df, use_container_width=True)

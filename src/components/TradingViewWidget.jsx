// TradingViewWidget.jsx
import React, { useEffect, useRef, memo } from "react";

function TradingViewWidget({ symbol = "BINANCE:BTCUSDT" }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    // Eğer TradingView script'i yoksa, sadece 1 kez yükle
    if (!window.TradingView) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      document.body.appendChild(script);
      script.onload = () => createWidget();
    } else {
      createWidget();
    }

    function createWidget() {
      if (!window.TradingView) return;

      // Önceki widget'ı temizle (DOM şişmesini önler)
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      // Her seferinde yeni bir unique ID oluştur
      const uniqueId = `tv_chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      widgetIdRef.current = uniqueId;

      // Container'a ID ata
      if (containerRef.current) {
        containerRef.current.id = uniqueId;
      }

      // Yeni widget oluştur
      new window.TradingView.widget({
        container_id: uniqueId,
        symbol: symbol,
        interval: "240",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_side_toolbar: true,
        backgroundColor: "#0F0F0F",
        autosize: true,
      });

      console.log('TradingView widget created for symbol:', symbol);
    }

    // cleanup: bileşen kaldırılırsa DOM temizle
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol]); // sadece symbol değiştiğinde yeniden yükle

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: "500px" }}
    />
  );
}

export default memo(TradingViewWidget);
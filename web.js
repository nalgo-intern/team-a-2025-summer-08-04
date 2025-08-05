const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let drawing = false;
canvas.onmousedown = () => drawing = true;
canvas.onmouseup = () => drawing = false;
let lastX, lastY;
canvas.onmousedown = e => {   //ベジェ曲線滑らかさ
  drawing = true;
  const rect = canvas.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
};
canvas.onmousemove = e => {
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // グラデーション作成
  const gradient = ctx.createRadialGradient(x, y, 1, x, y, 10);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");   // 中心は黒く濃い
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");   // 外側は透明に

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
};

function drawCenterLine() {       //縦線描画
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const centerX = canvas.width / 2;

  ctx.beginPath();
  ctx.moveTo(centerX, 0);             // 上から
  ctx.lineTo(centerX, canvas.height); // 下まで
  ctx.strokeStyle = "gray";           // 線の色
  ctx.lineWidth = 2;                  // 線の太さ
  ctx.stroke();
}
window.onload = () => {
  drawCenterLine(); // ページ読み込み時に線を描画
};



function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCenterLine();//再描画
}

async function predict() {
  const base64 = canvas.toDataURL("image/png");
  const res = await fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 })
  });
  const data = await res.json();
  document.getElementById("result").textContent = "Result: " + data.result;
}
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let drawing = false;
let lastX, lastY;
let initialCanvasData; // ← 初期状態の保存用

// マウス押下時に描画開始＋位置記録
canvas.onmousedown = e => {
  drawing = true;
  const rect = canvas.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
};

// マウス移動でグラデーション付きの線を描く
canvas.onmousemove = e => {
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const gradient = ctx.createRadialGradient(x, y, 1, x, y, 10);
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
};

// マウスを離したとき描画停止
canvas.onmouseup = () => drawing = false;

// 中央線を描く
function drawCenterLine() {
  const centerX = canvas.width / 2;
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, canvas.height);
  ctx.strokeStyle = "gray";
  ctx.lineWidth = 2;
  ctx.stroke();
}

// 初期化時に縦線だけ描いて保存
window.onload = () => {
  clearCanvas(); // 初期化＋線描画
  initialCanvasData = canvas.toDataURL("image/png"); // ← 初期状態を保存
};

// キャンバスクリア＋縦線再描画
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCenterLine();
}

// 推論処理
async function predict() {
  const base64 = canvas.toDataURL("image/png");

  // 初期状態（縦線だけ）の画像と同じなら空白とみなす
  if (base64 === initialCanvasData) {
    document.getElementById("result").textContent = "Result: 何も書かれていません";
    return;
  }

  // 数字が書かれていた場合 → 一旦「読み込みました」と表示
  document.getElementById("result").textContent = "読み込みました...";

  // APIに送信
  const res = await fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 })
  });

  const data = await res.json();

  // 結果を表示
  document.getElementById("result").textContent = "Result: " + data.result;
}
